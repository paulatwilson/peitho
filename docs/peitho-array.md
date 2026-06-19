# peitho-array

`peitho-array` is the deterministic TypeScript engine that powers algorithmic music generation for Peitho systems. It is not Peitho-Composer itself. It is a reusable engine module that can be embedded in different products, games, tools, DAW utilities, and browser experiments.

## Role

`peitho-array` owns the low-level musical structure:

- time grids
- scale and key mapping
- chord and note event shapes
- deterministic seeded generation
- rhythm masks and pattern grammars
- melodic movement constraints
- voice-leading rules
- symbolic MIDI-ready output

It does not own product limits, UI state, audio rendering, persistence, or model inference.

## Relationship To Peitho-Composer

Peitho-Composer is one consumer of `peitho-array`.

Peitho-Composer deliberately uses:

- 8 bars
- 4/4
- 16th-note grid
- 128 visible steps
- short idea-sketch workflow

Those limits belong to Peitho-Composer because that tool is designed as a compact musical idea surface.

`peitho-array` must not hard-code those limits. Other systems may need longer structures, odd metres, denser grids, ambient loops, game-world scoring, or adaptive music sections.

Example:

```ts
import { createEmptyPattern } from "@peitho/array";

const composerPattern = createEmptyPattern({
  bars: 8,
  beatsPerBar: 4,
  stepsPerBeat: 4,
});

const gameWorldPattern = createEmptyPattern({
  bars: 32,
  beatsPerBar: 4,
  stepsPerBeat: 4,
});

const compoundMeterPattern = createEmptyPattern({
  bars: 24,
  beatsPerBar: 6,
  stepsPerBeat: 4,
});
```

## Core Data Model

The engine outputs symbolic music data, not audio.

```ts
export type NoteEvent = {
  step: number;
  len: number;
  midi: number;
  vel?: number;
};

export type ChordEvent = {
  name: string;
  start: number;
  len: number;
  tones: number[];
};

export type PeithoPattern = {
  bars: number;
  beatsPerBar: number;
  stepsPerBeat: number;
  stepsPerBar: number;
  steps: number;
  chords: ChordEvent[];
  melody: NoteEvent[];
  counter: NoteEvent[];
  drums: Record<string, number[]>;
};
```

This format is intentionally plain. Consumers can render it to MIDI, Web Audio, DAW clips, game-engine triggers, visual piano rolls, or future `peitho-pulse` outputs.

## Design Principles

### Engine Is General

The engine should work for short sketches and longer adaptive scores. Length, metre, quantisation, and density are configuration, not assumptions.

### Output Is Deterministic When Seeded

Procedural systems need repeatable results. A game should be able to generate the same musical identity from the same world seed, biome, player state, or encounter tag.

### Music Theory Is Explicit

Scale, key, chord, voicing, and melodic movement rules should be visible in code rather than hidden in opaque random choices.

### Rhythm And Pitch Stay Separable

Inspired by pattern-based systems such as Scribbletune, rhythmic masks and pitch material should be independently composable. A rhythm pattern can drive different scales, chords, registers, or motifs.

### Musical Coherence Beats Randomness

Inspired by computational composition ideas such as David Cope's EMI, reusable motifs, signatures, compensation after wide leaps, downbeat anchoring, and voice-leading constraints should keep output coherent.

### Approved References

External projects can inform Peitho's vocabulary and high-level design. Approved MIT-licensed references may be used directly, adapted, or copied where doing so is useful, provided licence and attribution requirements are preserved.

Approved MIT references:

- `paulatwilson/emi-ts`
- `scribbletune/scribbletune`

For approved MIT code:

- keep copyright/licence notices where required
- prefer small, purposeful imports over bulk copying
- adapt names and APIs to Peitho where that improves clarity
- add tests around any imported/adapted behaviour
- document any substantial copied or adapted module in this file or nearby source comments

The earlier unlicensed Java EMI repository is not part of this project and should not be used.

## What Peitho-Array Will Use

`peitho-array` should take the strongest useful parts from the approved references and the existing Peitho-Composer prototype. Each source has a bounded role.

| Source | Use In `peitho-array` | Do Not Use For |
| --- | --- | --- |
| Peitho-Composer prototype | current practical generator behaviour: scales, chord pools, seeded melody/counter generation, drum patterns, MIDI event shape | hard-coded 8-bar Composer limits or product preset catalogues |
| Scribbletune | pattern strings, rhythm masks, clip-like building blocks, pitch/rhythm separation | replacing Peitho data model |
| `emi-ts` | motif/signature analysis, SPEAC-style tension labels, phrase recombination, MIDI parser/writer ideas | turning `peitho-array` into an EMI clone |
| Magenta / MelodyRNN / NoteSequence | conceptual sequence constraints: primer/continuation flow, quantised symbolic events, stepwise melodic bias, stochastic drift control | TensorFlow.js dependency, ML inference, model loading |

Default rule: if a part makes the engine lighter, clearer, more deterministic, or more musically coherent, use it. If it adds runtime weight, model dependencies, or app-specific assumptions, keep it out of `peitho-array`.

### EMI TypeScript Reference

The project may use `paulatwilson/emi-ts` as the approved TypeScript EMI reference implementation.

Reference:

```txt
https://github.com/paulatwilson/emi-ts
```

Licence:

```txt
MIT
```

Useful areas to evaluate for Peitho:

- ornament clarification as an optional analysis pre-pass
- SPEAC-style tension labelling
- motif/signature identification
- phrase recombination
- MIDI parser/writer behaviour
- ATN-style grammar search and backtracking

Integration rule:

`peitho-array` should not become an EMI clone. It should absorb useful composition ideas into Peitho-native modules and keep its public API centred on `PeithoPattern`, `NoteEvent`, `ChordEvent`, motifs, phrase plans, seeded generation, and consumer-controlled grid configuration.

Possible implementation tracks:

1. Direct dependency for experimental analysis tooling.
2. Selective Peitho-native reimplementation of useful concepts.
3. Separate adapter package later, if the EMI data model remains distinct.

Default choice: start with selective Peitho-native reimplementation inside `peitho-array`, backed by tests.

### Scribbletune Reference

The project may use `scribbletune/scribbletune` as the approved JavaScript pattern-composition reference.

Reference:

```txt
https://github.com/scribbletune/scribbletune
```

Licence:

```txt
MIT
```

Useful areas to evaluate for Peitho:

- pattern-string grammar
- clip-style musical fragments
- rhythm masks
- scale/chord helpers
- browser and Node usage patterns
- MIDI export ergonomics

Integration rule:

Scribbletune-style grammar should compile into Peitho-native structures. A consumer should receive `NoteEvent`, `ChordEvent`, `PeithoPattern`, `Motif`, or related Peitho types, not Scribbletune objects.

### Magenta Conceptual Reference

Magenta's `MusicRNN` family is relevant as a conceptual reference, not as a dependency for `peitho-array`.

Reference:

```txt
https://github.com/magenta/magenta-js
```

Useful areas to evaluate for Peitho:

- symbolic note-sequence representation
- primer/continuation workflow
- quantised sequence generation
- temperature-like randomness controls
- guardrails against stochastic melodic drift
- stepwise motion bias and register constraints

Integration rule:

Do not add TensorFlow.js or Magenta model checkpoints to `peitho-array`. Any ML-backed planner belongs in `peitho-pulse`. `peitho-array` may use Magenta-inspired constraints and sequence vocabulary only where they improve deterministic algorithmic generation.

## Planned Engine Areas

### Scale And Pitch Matrices

Initial scale support:

- pentatonic major
- pentatonic minor
- major
- natural minor

The engine maps a root key and scale to MIDI notes in a requested register.

### Pattern Grammar

Peitho should support a compact rhythm grammar inspired by Scribbletune and other pattern-string tools:

- `x`: trigger note
- `-`: rest
- `_`: sustain previous note
- `R`: choose from random or seeded pitch pool
- `[xx]`: subdivide one slot

This should compile into Peitho step gates, not replace the Peitho data model.

Scribbletune is MIT-licensed, so useful pattern-parsing behaviour can be adapted directly where that is simpler than re-inventing it. Peitho should still expose Peitho-native return types.

### Progressions And Chords

The engine should support both:

- named chord events, for direct control
- degree/roman-numeral progressions, for key-relative composition

Peitho-Composer can expose a small curated set. Other systems can use broader progression libraries.

Current extracted API:

```ts
chordPool("C", "major");

generateChords({
  key: "E",
  scale: "pentatonic-major",
  bars: 8,
  seed: 1234,
  chordLengths: [2, 2, 3, 4, 4],
  extensionProbability: 0.6,
});
```

`chordPool()` supports Composer chord-menu selection. `generateChords()` extracts the prototype progression behaviour but adds seed support so generated progressions can be repeatable.

This is still prototype-derived. Product-level presets such as genre, segment, or option should be resolved by the consumer into explicit parameters such as `chordLengths` and `extensionProbability` before calling `peitho-array`.

### Preset Inputs

Peitho-Composer owns its product preset catalogue. Those presets live with the Composer app, not in `peitho-array`.

Composer direction data should be resolved into plain engine inputs:

- macro values: `density`, `split`, `sync`, `rhythm`
- chord bias: `chordLengths`, `extensionProbability`
- segment profile: density, register shift, note length multiplier, sync offset
- option profile: envelope name and note length multiplier
- drum pattern name if the consumer wants built-in drum grids

Example consumer flow:

```ts
const chords = generateChords({
  key: "E",
  scale: "pentatonic-major",
  bars: 8,
  seed: 1234,
  chordLengths: preset.chordLengths,
  extensionProbability: preset.extensionProbability,
});

const melody = generateMono({
  key: "E",
  scale: "pentatonic-major",
  seed: 99,
  register: [58, 84],
  sparse: 1.1,
  density: macros.density,
  split: macros.split,
  sync: macros.sync,
  rhythm: macros.rhythm,
  segmentProfile: preset.segmentProfile,
  optionProfile: preset.optionProfile,
});
```

`peitho-array` should stay generic enough that `peitho-pulse`, games, DAW tools, and Composer can all provide their own preset vocabulary.

### Melodic Motion

Melody generation should favour:

- mostly stepwise movement
- occasional controlled leaps
- compensation after large jumps
- chord-tone anchoring on strong beats
- passing tones on weaker subdivisions
- register constraints per consumer

### Motifs And Signatures

Peitho should include its own motif/signature layer inspired by EMI-style composition systems.

Proposed Peitho-native terms:

- `Motif`: a short melodic, rhythmic, or harmonic fragment.
- `MotifBank`: a seeded collection of motifs available to a style, world, cue, or section.
- `MotifTransform`: inversion, retrograde, transposition, rhythmic expansion, rhythmic compression, ornamentation, or simplification.
- `PhrasePlan`: a higher-level arrangement of motifs across bars or sections.

This layer should let different consumers generate coherent longer music without sounding like unrelated random events.

### Adaptive Game Music

For game use, `peitho-array` should support:

- long sections
- deterministic world seeds
- biome or region profiles
- intensity and danger curves
- smooth regeneration between areas
- motif reuse across related zones
- multiple track roles such as ambience, bass, pulse, lead, stinger, and percussion

## Non-Goals

`peitho-array` should not:

- generate audio
- load ML models
- depend on `peitho-pulse`
- depend on the Peitho-Composer UI
- assume 8 bars
- assume 4/4
- assume browser-only usage
- require Python

## Current Implementation

Current scaffold lives in:

```txt
packages/peitho-array/src/index.ts
```

It currently provides:

- shared `NoteEvent`, `ChordEvent`, and `PeithoPattern` types
- configurable pattern shell creation
- key-to-pitch-class mapping
- scale-to-MIDI mapping
- chord pool generation
- seeded chord progression generation
- seeded melody/counter generation from explicit macro/profile inputs
- drum grid generation
- MIDI byte generation

Next implementation step:

1. Add rhythm pattern parser.
2. Add motif and phrase-plan types.
3. Add rule-based chord progression constraints.
4. Keep Peitho-Composer's preset catalogue and 8-bar behaviour as app configuration.

## Repair Pass Helpers

`peitho-array` exports small public repair helpers for consumers that receive loose or model-generated notes.

```ts
export function snapToScale(notes: NoteEvent[], key: string, scale: ScaleInput): NoteEvent[];
export function quantizeToGrid(notes: NoteEvent[], stepsPerBeat: number): NoteEvent[];
export function thinDensity(notes: NoteEvent[], density: number, seed: number): NoteEvent[];
```

`peitho-pulse` can run AI model output through these helpers before returning a `PeithoPattern`.
