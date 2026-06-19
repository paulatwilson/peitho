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
- shared Type, Segment, Option, and macro recommendations

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

`peitho-pulse` should use three sources:

| Source | Use In `peitho-pulse` | Do Not Use For |
| --- | --- | --- |
| ACE-Step 1.5 | primary local music LM/planner target, prompt expansion, song blueprint generation, metadata planning, possible audio-understanding path later | forcing raw audio generation into Peitho core |
| Magenta / Magenta.js | reference and possible optional model layer for symbolic sequence continuation, MusicRNN-style primer flows, MusicVAE-like variation ideas | replacing ACE-Step as main planner or adding TensorFlow.js to `peitho-array` |
| `peitho-array` | final symbolic target, validation, repair, deterministic compilation, MIDI-ready events | stochastic model inference |

Default rule: `peitho-pulse` can be heavier than `peitho-array`, but it should keep its output symbolic and Peitho-native.

## ACE-Step 1.5 Reference

Reference:

```txt
https://github.com/ace-step/ACE-Step-1.5
```

Licence:

```txt
MIT
```

ACE-Step 1.5 is the primary target because its architecture includes a Language Model planner that turns user queries into song blueprints. The repo documents a hybrid architecture where the LM plans metadata, lyrics, captions, and structure, then guides a Diffusion Transformer audio decoder.

Peitho should focus on the planner side first.

Useful areas to evaluate:

- LM query rewriting
- song blueprint generation
- duration, BPM, key, scale, and time-signature control
- prompt-to-structure planning
- metadata generation
- lyrics and section structure handling
- local Apple Silicon execution through MLX
- REST API and CLI behaviour as temporary integration paths

Avoid initially:

- DiT audio generation
- VAE/audio decode path
- stem separation
- cover generation
- repaint/edit audio workflows
- LoRA training
- quality scoring

Those may be useful later, but the first Peitho target is symbolic planning.

## ACE-Step Staging

### Stage 1: External Process / API Bridge

Use ACE-Step as installed Python/MLX system on macOS, driven by `peitho-pulse` through a local process or REST API.

Purpose:

- prove prompt-to-plan workflow
- inspect actual output shape
- compare LM models
- avoid premature native binding work

Expected output:

- structured text
- JSON-like blueprint
- chord/progression suggestions
- phrase plan
- section metadata
- direction-aware macro hints

`peitho-pulse` then parses that into Peitho-native objects and hands final validation to `peitho-array`.

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

Work out whether the ACE-Step LM planner can run directly from TypeScript/Bun on the user's Mac.

Candidate paths:

- Bun calls a small local MLX runner process
- Bun uses Node-API bindings around MLX
- Bun uses `bun:ffi` against a small native library
- Bun continues using REST/process bridge if that remains more reliable

Success criteria:

- local Apple Silicon execution
- no Python in the Peitho-Composer runtime path, if practical
- model output is stable enough to parse
- symbolic plan generation works without forcing audio generation

### Stage 4: Native Planner Package

Only after Stage 1-3 are proven, create a clean package boundary for a native planner runtime.

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

Reference:

```txt
https://github.com/magenta/magenta-js
```

Licence:

```txt
Apache-2.0
```

Magenta.js provides TypeScript/JavaScript inference libraries for pre-trained Magenta models. Its music package includes TensorFlow.js implementations of note-based models such as MusicRNN, DrumsRNN, PerformanceRNN, ImprovRNN, and MusicVAE.

Useful areas to evaluate:

- MusicRNN primer/continuation flow
- symbolic `NoteSequence` style data representation
- quantised note sequence handling
- temperature controls for variation
- MusicVAE interpolation/variation ideas
- browser and Node inference patterns

Integration rule:

Magenta is optional and secondary. It can inform planner workflows or become an optional adapter, but it should not be required by `peitho-array`.

## Magenta Staging

### Stage 1: Conceptual Borrowing

Use Magenta for design vocabulary:

- primer sequence
- continuation
- sample count
- temperature
- quantised note sequence
- symbolic model output

### Stage 2: Optional Prototype Adapter

If useful, make a separate `peitho-pulse` adapter that runs a Magenta model and maps output into `PeithoPattern`.

This adapter should be optional because it brings TensorFlow.js and larger browser/Node dependencies.

### Stage 3: Compare Against ACE-Step

Use Magenta outputs as a comparison point:

- Does it produce better continuation for short melodies?
- Is it useful for drums?
- Is its dependency weight acceptable?
- Does it add value once ACE-Step planner works?

If not, keep Magenta as concept-only reference.

## Peitho-Array Staging

`peitho-array` is always part of the `peitho-pulse` pipeline.

### Stage 1: Shared Types

Use `PeithoPattern`, `NoteEvent`, `ChordEvent`, `PatternConfig`, and future motif/phrase types as the final output contract.

### Stage 2: Validation

Before returning output, `peitho-pulse` should ask `peitho-array` to validate:

- note ranges
- scale membership
- chord membership
- grid bounds
- overlap rules
- section length
- metre and quantisation

### Stage 3: Repair

Use deterministic `peitho-array` repair passes to fix AI rough edges:

- snap notes to scale
- avoid impossible leaps
- anchor strong beats to chord tones
- thin density
- fit material into requested bars
- normalise velocities

### Stage 4: Compilation

AI output should compile down to the same event format as deterministic generation. The app or game should not care whether material came from `peitho-array` alone or from `peitho-pulse`.

## Non-Goals

`peitho-pulse` should not:

- replace `peitho-array`
- force audio generation into Peitho-Composer
- require Python inside the final Bun app if a practical MLX/Bun path exists
- leak ACE-Step or Magenta objects into app-facing APIs
- hard-code Peitho-Composer's 8-bar limit
- make the deterministic engine depend on model runtimes

## Current Implementation

Current scaffold lives in:

```txt
packages/peitho-pulse/src/index.ts
```

It currently provides:

- `PulsePrompt`
- `PulsePlanner`
- `StubPulsePlanner`
- `MlxRuntimeConfig`

Next implementation step:

1. Define a `PulsePlan` intermediate schema.
2. Add an ACE-Step API/process adapter stub.
3. Add a parser that maps a mocked ACE-Step plan into `PeithoPattern`.
4. Add `peitho-array` validation/repair hooks.
5. Keep Magenta as concept-only until ACE-Step planner route is understood.
