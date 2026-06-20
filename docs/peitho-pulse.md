# peitho-pulse

`peitho-pulse` is the AI-assisted planning engine for Peitho systems. It sits above `peitho-array` and produces symbolic musical plans that can be compiled into Peitho-native pattern data.

It is not the Peitho-Composer UI. It is not the deterministic engine. It is not an audio renderer.

## Role

`peitho-pulse` owns higher-level musical planning:

- prompt interpretation
- structural song planning
- phrase and section planning
- non-deterministic variation
- AI-assisted melody, harmony, rhythm, and arrangement suggestions
- conversion from model output into Peitho-native symbolic events

It should output data that `peitho-array` can validate, shape, compile, and render to MIDI-ready event structures.

## Relationship To Peitho-Array

`peitho-array` is the stable deterministic foundation. `peitho-pulse` is the optional AI layer.

`peitho-pulse` may call `peitho-array` for:

- scale and key validation
- grid configuration
- MIDI event shapes
- motif and phrase data structures
- deterministic repair passes
- voice-leading constraints
- rhythm mask compilation
- final `PeithoPattern` output

`peitho-array` must not depend on `peitho-pulse`.

## Core Contract

`peitho-pulse` accepts a fully-resolved musical request from the Composer and returns a Peitho-native pattern. The Composer is responsible for resolving all direction presets into explicit params before calling Pulse. Pulse does not own the preset catalogue.

```ts
export type PulseTarget = "chords" | "drums" | "melody" | "counter";

export type PulseRequest = {
  // what to generate this call
  target: PulseTarget;

  // musical foundation
  key: string;
  scale: ScaleInput;
  bars: number;
  seed?: number;

  // macros — already summed: type base + segment delta + option delta
  density: number;
  split: number;
  sync: number;
  rhythm: number;

  // chord generation params (resolved from type preset)
  chordLengths?: number[];
  extensionProbability?: number;

  // profiles (resolved from segment + option presets)
  segmentProfile?: Partial<SegmentProfile>;
  optionProfile?: Partial<OptionProfile>;

  // musical context — what is already locked (primes the next generation step)
  chords?: ChordEvent[];    // locked chords → conditions melody and counter
  melody?: NoteEvent[];     // locked melody → conditions counter

  // LM text prompt — assembled by Composer from direction-presets.json keywords
  // used by text-conditioned models; ignored by sequence models (Magenta)
  prompt?: string;
};

export type PulsePlanner = {
  generate(input: PulseRequest): Promise<PeithoPattern>;
};
```

The boundary stays simple: resolved musical request in, Peitho-native symbolic music out.

## Composer → Pulse Interface

### Keyword System

`direction-presets.json` carries a `keywords` array on each Type, Segment, and Option preset. These are curated musical descriptors that the Composer assembles into a text prompt when calling Pulse.

```json
{
  "types": [
    {
      "name": "Ballad",
      "keywords": ["emotional", "slow", "melodic", "lyrical", "intimate"],
      ...
    }
  ],
  "segments": [
    {
      "name": "Chorus",
      "keywords": ["anthemic", "high energy", "climax", "full texture"],
      ...
    }
  ],
  "options": [
    {
      "name": "Rousing Crescendo",
      "keywords": ["building", "rising", "triumphant", "intensifying"],
      ...
    }
  ]
}
```

The Composer combines Type + Segment + Option keywords into a single string:

```text
"emotional, slow, melodic, lyrical, anthemic, high energy, climax, building, rising, triumphant"
```

This string becomes `PulseRequest.prompt`. Users can add or remove keywords in the Composer UI.

### What Each Model Does With The Request

| Field | Magenta sequence models | Text-conditioned LM models (future) |
| --- | --- | --- |
| `key`, `scale`, `bars` | used for pitch snapping + grid | used in prompt |
| `density`, `sync`, `rhythm` | map to temperature + primer length | used in prompt |
| `segmentProfile`, `optionProfile` | condition generation params | used in prompt |
| `chords` | musical primer for ImprovRNN | context in prompt |
| `melody` | musical primer for counter generation | context in prompt |
| `prompt` | ignored | primary conditioning |

### Generation Pipeline

Composer calls Pulse once per pipeline step, passing locked context forward:

```text
1. target: "chords"  → returns ChordEvent[]
2. target: "drums"   → uses chords as context
3. target: "melody"  → uses chords as primer
4. target: "counter" → uses chords + melody as primer
```

Each response feeds the next call. Pulse returns a full `PeithoPattern` each time, populated only for the requested target.

## What Peitho-Pulse Will Use

| Source | Role in `peitho-pulse` | Do Not Use For |
| --- | --- | --- |
| Magenta.js (`@magenta/music`) | **Stage 1 — active.** ImprovRNN for chord-conditioned melody and counter. DrumsRNN for beat generation. TF.js runtime. | adding ML inference to `peitho-array`; audio generation |
| `peitho-array` | repair passes (`snapToScale`, `quantizeToGrid`, `thinDensity`), shared types (`NoteEvent`, `ChordEvent`, `PeithoPattern`), seeded generation as fallback | stochastic model inference; Composer-specific presets |
| TyTorch / libtorch | **Stage 2 — future.** Load TyTorch-format symbolic MIDI models (e.g. MMM) without Python. Replaces TF.js backend if Bun compatibility confirmed. | Stage 1 work |
| MLX (Apple Silicon) | **Stage 3 — future.** Native Apple Silicon inference. Replaces TF.js and TyTorch when model conversion is ready. | Stage 1–2 work |
| ACE-Step 1.5 LM planner | **Future consideration.** Text-to-structure planning layer. Feeds `PulseRequest.prompt` if a text-conditioned model is added. Not a melody generator — audio path is out of scope. | primary note generation; Python runtime |

Default rule: output stays symbolic and Peitho-native at every stage. The backend runtime can be swapped without changing `PulseRequest` or `PeithoPattern`.

## Magenta Reference

Reference: `https://github.com/magenta/magenta-js` — Apache-2.0

`@magenta/music` v1.23.1 is the active Stage 1 runtime. It provides pre-trained `MusicRNN` models including ImprovRNN (chord-conditioned melody) and DrumsRNN (beat continuation). TF.js backend.

Key concepts used by Pulse:

- `NoteSequence` — Magenta's symbolic note format, converted to/from `NoteEvent`
- primer sequence — short musical context that seeds continuation
- temperature — controls randomness; mapped from `density` + `sync` macros
- chord progression strings — ImprovRNN accepts `["Cm", "G", "Eb", "Bb"]` for conditioning

`@magenta/music` is a `peitho-pulse` dependency only. It must not enter `peitho-array`.

## TyTorch Reference

Reference: `https://github.com/astrohackerlabs/tytorch`

TyTorch is the TypeScript runtime for loading and running symbolic MIDI models with TyTorch weights. No Python in the runtime path. Node.js 24+ required — Bun compatibility to be confirmed.

Used in Stage 2 as `TytorchPulsePlanner` for models not covered by Magenta (e.g. MMM, Anticipatory Music Transformer).

## Staging

### Stage 1 — Magenta.js (active)

`MagentaPulsePlanner` is implemented in `src/index.ts`.

- ImprovRNN: chord-conditioned melody and counter generation
- DrumsRNN: beat pattern generation
- Repair pass: `quantizeToGrid` → `snapToScale` → `thinDensity` (all from `peitho-array`)
- Lazy model loading: first `generate()` call initialises models; subsequent calls reuse them
- `PulseRequest.prompt` accepted but not yet used (reserved for Stage 4)

Checkpoints load from Google storage by default. Local checkpoint path can be passed via `MagentaPlannerConfig`.

### Stage 2 — TyTorch / libtorch (future)

Evaluate loading TyTorch-format MIDI models (e.g. MMM multi-track transformer) via TyTorch TypeScript bindings to libtorch. No Python in runtime. Node.js 24+ required — Bun compatibility to be confirmed.

Outcome: if viable, implement `TytorchPulsePlanner` as an alternative to `MagentaPulsePlanner`.

### Stage 3 — MLX Native (future)

Apple Silicon native inference via MLX C++ + `bun:ffi`. Replaces TF.js and TyTorch backends once model weight conversion is confirmed. Target: sub-500ms melody generation.

### Stage 4 — Text-conditioned LM (future)

Add a text-conditioned planner that uses `PulseRequest.prompt` (the keyword string) to guide generation. Candidate: ACE-Step 1.5 LM planner side (structure/blueprint, not audio). Feeds high-level plan into `peitho-array` or Magenta rather than replacing them.

## ACE-Step 1.5 Reference

Reference:

```txt
https://github.com/ace-step/ACE-Step-1.5
```

Licence:

```txt
MIT
```

ACE-Step 1.5 includes a Language Model planner that turns user queries into song blueprints. The repo documents a hybrid architecture where the LM plans metadata, lyrics, captions, and structure, then guides a Diffusion Transformer audio decoder.

Peitho focuses on the planner side only — not audio.

Useful areas to evaluate:

- LM query rewriting
- song blueprint generation
- duration, BPM, key, scale, and time-signature control
- prompt-to-structure planning
- metadata generation
- lyrics and section structure handling
- local Apple Silicon execution through MLX
- REST API and CLI behaviour as integration paths

Avoid:

- DiT audio generation
- VAE/audio decode path
- stem separation
- cover generation
- repaint/edit audio workflows
- LoRA training
- quality scoring

## ACE-Step Staging

### Stage 1: External Process / API Bridge

Use ACE-Step as an installed Python/MLX system on macOS, driven by `peitho-pulse` through a local process or REST API.

Purpose:

- prove prompt-to-plan workflow
- inspect actual output shape
- compare LM models
- avoid premature native binding work

Expected output:

- structured text or JSON-like blueprint
- chord/progression suggestions
- phrase plan
- section metadata
- direction-aware macro hints

`peitho-pulse` parses that into Peitho-native objects and hands final validation to `peitho-array`.

### Stage 2: Symbolic Planner Adapter

Build an adapter around ACE-Step planner output.

Responsibilities:

- normalise key, scale, BPM, metre, and length
- map sections to `PhrasePlan`
- map motifs to `Motif` or `MotifBank`
- map chords to `ChordEvent`
- map melody hints to `NoteEvent`
- run `peitho-array` repair passes
- reject unsupported or ambiguous model output

### Stage 3: MLX Runtime Research

Work out whether the ACE-Step LM planner can run directly from TypeScript/Bun on Apple Silicon.

Candidate paths:

- Bun calls a small local MLX runner process
- Bun uses Node-API bindings around MLX
- Bun uses `bun:ffi` against a small native library
- REST/process bridge if that remains more reliable

Success criteria:

- local Apple Silicon execution
- no Python in the Peitho runtime path
- model output is stable enough to parse
- symbolic plan generation works without forcing audio generation

### Stage 4: Native Planner Package

After Stage 1–3 are proven, create a clean package boundary for a native planner runtime.

Possible shape:

```txt
packages/peitho-pulse
  src/
    planners/
      ace-step-api.ts
      ace-step-mlx.ts
      magenta.ts
    adapters/
      ace-step-plan.ts
      magenta-sequence.ts
    repair/
      array-repair.ts
```

## Magenta / Magenta.js Reference

Reference: `https://github.com/magenta/magenta-js` — Apache-2.0

Magenta.js provides TypeScript/JavaScript inference libraries for pre-trained Magenta models. Its music package includes TF.js implementations of MusicRNN, DrumsRNN, PerformanceRNN, ImprovRNN, and MusicVAE.

Useful areas:

- MusicRNN primer/continuation flow
- symbolic `NoteSequence` data representation
- quantised note sequence handling
- temperature controls for variation
- MusicVAE interpolation/variation ideas
- browser and Node inference patterns

Integration rule: `@magenta/music` is a `peitho-pulse` dependency only. It must not enter `peitho-array`.

## Magenta Staging

### Stage 1: Active Implementation

`MagentaPulsePlanner` is the current active planner. ImprovRNN handles chord-conditioned melody and counter. DrumsRNN handles beats. `@magenta/music` v1.23.1 + `@tensorflow/tfjs` are installed dependencies.

### Stage 2: Local Checkpoint Serving

Move Magenta model checkpoints from Google storage to a local path served by the Composer dev server. Removes the external network dependency.

### Stage 3: Compare Against ACE-Step / TyTorch

Once Stage 2 (TyTorch) and ACE-Step staging are underway, compare outputs:

- Does ImprovRNN produce better melodic material than symbolic MIDI transformers?
- Is DrumsRNN output musically interesting or mechanical?
- Is TF.js acceptable in production or should TyTorch/MLX replace it?

## Peitho-Array Staging

`peitho-array` is always part of the `peitho-pulse` pipeline.

### Stage 1: Shared Types — Done

`PeithoPattern`, `NoteEvent`, `ChordEvent`, `PatternConfig`, and future motif/phrase types are the final output contract. Pulse always returns these shapes.

### Stage 2: Validation — Pending

Before returning output, `peitho-pulse` should ask `peitho-array` to validate:

- note ranges
- scale membership
- chord membership
- grid bounds
- overlap rules
- section length
- metre and quantisation

Awaiting `validatePattern()` export from `peitho-array`.

### Stage 3: Repair — Done

`peitho-array` exports `snapToScale`, `quantizeToGrid`, and `thinDensity`. The `repairNotes()` function in `peitho-pulse` chains all three after every model generation step.

### Stage 4: Compilation

AI output compiles to the same event format as deterministic generation. The app should not care whether material came from `peitho-array` alone or from `peitho-pulse`.

## ChordSeqAI Reference

Reference:

```txt
https://github.com/PetrIvan/chord-seq-ai-app   — app + deployed ONNX models
https://github.com/StudentTraineeCenter/chord-seq-ai — training code + PyTorch weights
```

Licence:

```txt
MIT (Student Trainee Center, 2023)
```

ChordSeqAI provides seven pre-trained ONNX models for autoregressive chord sequence generation. It is used exclusively as **development tooling** to build `progression-seeds.json` — a static chord progression seed bank consumed by `peitho-array`. It does not enter the runtime pipeline.

### Models

| Model file | Size | Conditioning |
| --- | --- | --- |
| `recurrent_net.onnx` | 1.4 MB | none |
| `transformer_small.onnx` | 4.5 MB | none |
| `transformer_medium.onnx` | 9.4 MB | none |
| `transformer_large.onnx` | 18 MB | none |
| `conditional_small.onnx` | 4.6 MB | genre + decade |
| `conditional_medium.onnx` | 9.6 MB | genre + decade |
| `conditional_large.onnx` | 18 MB | genre + decade |

Primary candidate: **Conditional Transformer Medium** — genre conditioning at 9.6 MB. Benchmark all seven before locking in.

### Chord vocabulary

1,033 unique chord tokens (0–1032). Covers triads, 7ths, 9ths–13ths, suspended, augmented, slash chords, and all inversions. Bidirectional deterministic mapping defined in `token_to_chord.ts`. Max sequence length: 255 chords.

### Conditioning

The Conditional Transformer accepts a 28-dim style vector: 20 genres (multi-hot, sum-normalised) + 8 decades (one-hot).

**Genres (20):** Rock, Folk, Pop, Soundtrack, R&B/Funk/Soul, Country, Jazz, Experimental, Religious Music, Reggae & Ska, Hip Hop, Electronic, Comedy, Metal, Blues, World Music, Disco, Classical, New Age, Darkwave.

**Decades (8):** 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020.

Composer Types map explicitly to supported genres through `direction-presets.json` → `pulseConditions`. `pulseKeywords` remain separate free-form model hints and must not be parsed to infer ChordSeqAI genres. Composer resolves the structured genres and optional default decade before calling the generator.

### Limitations

- **No duration output.** Training ignored chord durations; consecutive duplicates are merged. Durations must be assigned by a post-pass using the `harmonic-rhythm` profile.
- **No built-in seed.** Inference uses multinomial sampling. Determinism requires a seeded JS PRNG (mulberry32) wrapping the softmax output.
- **Decade conditioning is coarse.** Genre conditioning is the primary quality lever.

### Useful areas

- Autoregressive next-chord prediction (input: sequence so far → output: next chord probabilities)
- Genre/decade style conditioning via `AdaptiveLayerNorm`
- Temperature scaling for tension control
- Batch generation of multiple candidates in one pass
- Pre-exported ONNX weights — no training required

### Avoid

- Using ChordSeqAI in the real-time `peitho-pulse` runtime — it is dev tooling only
- Expecting duration information from model output
- Treating decade conditioning as a precise style control

### Training data

"A collection of publicly available datasets mixed with data scraped from music banks." Chord progressions are not copyright-protectable (music theory, not creative expression). Model weights are MIT licensed with no additional restrictions. All Python training dependencies (PyTorch, music21, pandas) are BSD.

### Runtime

`onnxruntime-node` CPU backend. No WebGPU required for CLI use. Bun N-API compatibility needs a smoke test; fall back to Node.js 24+ if needed. Model files are not checked into git — downloaded by a setup script into `packages/peitho-pulse/models/`.

## ChordSeqAI Staging

### Stage 1: Benchmark (next)

Run all seven ONNX models on identical inputs. Measure:

- Latency (ms per candidate, target: <2 s)
- Harmonic coherence (% of degree transitions valid in target scale)
- Variety (unique progressions across N candidates from same seed)
- Conditioning fidelity (does Jazz conditioning differ from Metal?)
- Determinism (same seed → same sequence across 3 runs)

Output: model recommendation with data.

### Stage 2: CLI seed generator

Build `packages/peitho-pulse/src/cli/generate-seeds.ts`.

Inputs: mode/key, chord count, cadence, tension, repetition, harmonic-rhythm profile, genre, decade, seed, candidate count.

Pipeline:

1. Encode style vector from genre + decade inputs
2. Run Conditional Transformer autoregressively until chord count reached
3. Assign durations via harmonic-rhythm post-pass
4. Convert chord names → Roman degree notation relative to key
5. Remove transposition duplicates
6. Return candidates in neutral format (see Output Format below)

Output format per candidate:

```json
{
  "degrees": ["i", "VI", "III", "VII"],
  "mode": "minor",
  "cadence": "loop",
  "tension": 0.65,
  "repetition": 0.4,
  "source": {
    "provider": "chord-seq-ai",
    "model": "conditional_medium",
    "modelVersion": "1.0.0",
    "seed": 42,
    "conditions": {
      "genres": ["Jazz", "Classical"],
      "decade": 1980
    }
  }
}
```

### Stage 3: Bulk generation

Run the CLI across Composer's Type × Segment × Option combinations (up to 6,084 combinations). Curate output into `progression-seeds.json` for `peitho-array`.

### Stage 4: Tests

- Deterministic output (same seed → same sequence)
- Valid chord tokens (all tokens within 0–1032)
- Candidate count matches requested count
- Roman-degree conversion correct for all 12 keys × 4 scales
- Duplicate removal (transposition-normalised)

## Model Candidates

All models we want to evaluate and integrate. Goal: best of all worlds — use the right model for each pipeline step. No Python in runtime.

| Model | Source | Pipeline role | Runtime | Status |
| --- | --- | --- | --- | --- |
| ImprovRNN | Magenta / Google | Melody — chord-conditioned | TF.js | Stage 1, active |
| DrumsRNN | Magenta / Google | Beats — pattern continuation | TF.js | Stage 1, active |
| MusicVAE | Magenta / Google | Style variation / interpolation between takes | TF.js | Evaluate after Stage 1 |
| MusicTransformer | Magenta / Google | Melody — high-quality, GiantMIDI trained | TF.js / TyTorch | Evaluate vs ImprovRNN |
| MMM (Multi-Track Music Machine) | Huggingface | Counter-melody — multi-track, chord-conditioned | TyTorch (TyTorch weights) | Stage 2 candidate |
| Anticipatory Music Transformer | Stanford | Counter-melody — MIDI infilling, chord-aware | TyTorch (TyTorch weights) | Stage 2 candidate |
| ABC Notation LMs | Huggingface | LM planning — text prompt → ABC notation → notes | MLX / TyTorch | Stage 3 candidate |
| emi-ts SPEAC | `paulatwilson/emi-ts` | Counter-melody — structural phrase grammar, call-and-response | Bun, zero deps | Integrate after Stage 1 |
| ACE-Step 1.5 LM planner | `ace-step/ACE-Step-1.5` | LM planning — structure/blueprint from text prompt | MLX / native | Stage 4 |
| ChordSeqAI (Conditional Transformer) | `PetrIvan/chord-seq-ai-app` | Chords — seed bank generation; genre/style-conditioned | onnxruntime-node (dev tooling only) | Stage 2 candidate |

### Runtime priority

No Python. Preference order for backends:

1. Native Bun / TF.js (zero extra setup)
2. TyTorch (libtorch, no Python, Node.js 24+ — Bun compat to confirm)
3. MLX via `bun:ffi` (Apple Silicon native, requires weight conversion)

### Evaluation criteria

When comparing models for the same role:

- Does it produce musically interesting output for the style?
- Does it respect chord context?
- Does it understand phrase structure (not just random notes)?
- Is latency acceptable (target: under 2s per generation step)?
- Is the output repairable by `peitho-array`'s repair pass?

## Non-Goals

`peitho-pulse` should not:

- replace `peitho-array`
- force audio generation into Peitho-Composer
- require Python inside the final Bun app if a practical MLX/Bun path exists
- leak ACE-Step or Magenta objects into app-facing APIs
- hard-code Peitho-Composer's 8-bar limit
- make the deterministic engine depend on model runtimes

## Current Implementation

Lives in `packages/peitho-pulse/src/index.ts`.

Currently exports:

- `PulseTarget` — `"chords" | "drums" | "melody" | "counter"`
- `PulseRequest` — full resolved request type (key, scale, macros, profiles, locked context, prompt)
- `PulsePlanner` — interface: `generate(request: PulseRequest): Promise<PeithoPattern>`
- `StubPulsePlanner` — returns empty `PeithoPattern`, used for testing
- `MagentaPulsePlanner` — active Stage 1 planner (ImprovRNN + DrumsRNN, lazy init, repair pass)
- `MagentaPlannerConfig` — optional checkpoint URL overrides
- `MlxRuntimeConfig` — reserved for Stage 3 native runtime

Dependencies: `@peitho/array` (workspace), `@magenta/music` ^1.23.1, `@tensorflow/tfjs` ^4.22.0.

Next steps:

1. Wire `/pulse/generate` endpoint in `apps/peitho-composer/src/server.ts`.
2. Enable the Pulse engine button in `apps/peitho-composer/public/index.html`.
3. Download and serve Magenta checkpoints locally (remove Google storage dependency).
4. Implement `TytorchPulsePlanner` once Bun compatibility with TyTorch is confirmed (Stage 2).
5. Benchmark all seven ChordSeqAI ONNX models (ChordSeqAI Stage 1).
6. Build `generate-seeds.ts` CLI and produce first `progression-seeds.json` draft (ChordSeqAI Stage 2).
