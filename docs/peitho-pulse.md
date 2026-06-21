# peitho-pulse

`@peitho/pulse` owns optional symbolic model runtimes. It accepts Peitho requests,
runs a model adapter and returns canonical Array contracts. It does not own UI
presets, playback, MIDI files or finished audio.

## Current Status

| Capability | Status | Implementation |
| --- | --- | --- |
| ChordSeqAI ONNX chords | implemented, used by Composer | `src/chord-seq-ai/` |
| Magenta melody/counter/drums | implemented adapter, not used by Composer UI | `src/magenta-planner.ts` |
| deterministic repair | implemented | `src/repair.ts` |
| empty test planner | implemented | `src/stub-planner.ts` |
| ACE-Step planner | research only | none |
| Anticipatory Music Transformer | research only | none |
| TyTorch runtime | research only | none |
| native MLX runtime | research only | config type only |

## Package Boundary

```text
Composer resolved request
  -> Pulse adapter
  -> model-native output
  -> Array repair/contracts
  -> PeithoPattern
```

Pulse may depend on Array. Array must never depend on Pulse. Model-native tensors,
tokens and provider objects must not cross the Pulse public boundary.

Source layout:

- `src/contracts.ts`: `PulseRequest`, `PulsePlanner`, runtime-neutral types.
- `src/repair.ts`: quantise, scale-snap and density repair.
- `src/magenta-planner.ts`: Magenta adapter.
- `src/stub-planner.ts`: empty pattern adapter.
- `src/chord-seq-ai/`: ONNX chord inference.
- `src/index.ts`: public exports only.

## PulsePlanner Contract

`PulseRequest.target` is `chords`, `drums`, `melody` or `counter`. Composer resolves
Type/Segment/Option presets into explicit macros before calling Pulse. Locked
chords and melody may be supplied as context. `prompt` is accepted but no current
adapter uses it.

```ts
type PulsePlanner = {
  generate(request: PulseRequest): Promise<PeithoPattern>;
};
```

Each call returns a complete pattern shell with only requested output populated.

## ChordSeqAI

`ChordSeqAIGenerator` runs seven local ONNX chord models through
`onnxruntime-node`:

- recurrent
- transformer small/medium/large
- conditional small/medium/large

Conditional models accept structured genre and decade inputs. Composer resolves
those from its preset catalogue; refinement keyword chips are separate and do not
infer model genres.

Generation supports seeded sampling, candidate counts, chord counts, harmonic
rhythm, scale policies, cadence policies and repetition controls. Results are
ranked `ProgressionSeed` candidates with provenance and validation reports.

Models live under `packages/peitho-pulse/models/` and are gitignored. Source code
must not import model logic from `.contrib`.

Composer route:

```text
Generate Chords
  -> POST /pulse/chords
  -> cached ChordSeqAIGenerator
  -> ranked candidates
  -> best ProgressionSeed converted to ChordEvent[]
```

## MagentaPulsePlanner

Current adapter uses `@magenta/music`:

- ImprovRNN for melody and counter
- DrumsRNN for drums
- lazy checkpoint initialisation
- chord-symbol conditioning for melodic targets
- Array repair after generation

Default checkpoints load from Google-hosted URLs. This creates a network/runtime
dependency that must be resolved before treating Magenta as production-ready.

`POST /pulse/generate` exposes this planner, but Composer generation buttons still
use Array for melody, counter and drums. Documentation must not claim otherwise.

## Research Candidates

### Anticipatory Music Transformer

Reference: `.contrib/ai-models/anticipation` (read-only).

Local reference confirms a Python/Hugging Face sampling implementation with
control inputs for infilling and accompaniment. Pretrained checkpoints are hosted
by Stanford CRFM. It does not confirm TyTorch or Bun compatibility.

Required spike:

1. load a real checkpoint outside Python or document why this is impractical
2. reproduce custom event tokenisation and controlled sampling
3. convert output into `NoteEvent[]`
4. measure latency, memory and output quality
5. verify licence/provenance and redistribution requirements

Until then, AMT is a candidate—not Peitho architecture.

### ACE-Step 1.5

Potential use: high-level prompt-to-blueprint planning. It is not the current note
generator. No adapter or native MLX execution exists.

Questions requiring proof:

- can planner output be isolated cleanly from audio generation?
- does output contain useful symbolic structure rather than descriptive metadata?
- can a stable adapter map it to Peitho requests?
- is a local process/API preferable to speculative native bindings?

### TyTorch And MLX

No current Peitho code loads model weights through TyTorch or MLX. Bun
compatibility, checkpoint support, Metal execution and performance are unverified.
Do not publish invented APIs or performance targets as implementation facts.

## Decision Order

1. Prove Composer workflow and listening value with Array/ChordSeqAI.
2. Decide whether Magenta output is useful enough to keep.
3. Establish Session Player contracts with deterministic implementations.
4. Spike one controlled-infilling model against those contracts.
5. Choose runtime only after checkpoint compatibility and measurements exist.

## Non-Goals

- model dependencies inside Array
- audio waveform generation
- Composer preset ownership
- direct imports from `.contrib`
- provider-specific objects in app state
- multiple speculative runtimes implemented simultaneously

## Verification

```sh
bun test packages/peitho-pulse/test
bun run typecheck
```

Detailed calling examples belong in
[`peitho-pulse-user-guide.md`](./peitho-pulse-user-guide.md). Roadmap work belongs
in [`plan.md`](./plan.md).
