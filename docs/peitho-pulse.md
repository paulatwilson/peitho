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
| TyTorch / libtorch | **Stage 2 — future.** Load PyTorch-format symbolic MIDI models (e.g. MMM) without Python. Replaces TF.js backend if Bun compatibility confirmed. | Stage 1 work |
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

Evaluate loading PyTorch-format MIDI models (e.g. MMM multi-track transformer) via TyTorch TypeScript bindings to libtorch. No Python in runtime. Node.js 24+ required — Bun compatibility to be confirmed.

Outcome: if viable, implement `TytorchPulsePlanner` as an alternative to `MagentaPulsePlanner`.

### Stage 3 — MLX Native (future)

Apple Silicon native inference via MLX C++ + `bun:ffi`. Replaces TF.js and TyTorch backends once model weight conversion is confirmed. Target: sub-500ms melody generation.

### Stage 4 — Text-conditioned LM (future)

Add a text-conditioned planner that uses `PulseRequest.prompt` (the keyword string) to guide generation. Candidate: ACE-Step 1.5 LM planner side (structure/blueprint, not audio). Feeds high-level plan into `peitho-array` or Magenta rather than replacing them.

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
