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

This is still prototype-derived. Product-level presets such as genre, segment, or option are resolved by the consumer into explicit parameters such as `chordLengths`, `extensionProbability`, and `progressionProfile` before calling `peitho-array`.

### Immediate Chord Progression TODO

Keep this work small. The first useful target is nicer chord progressions for Peitho-Composer, still deterministic and lightweight. Do not add AI, model inference, TensorFlow.js, Magenta checkpoints, or broad EMI-style analysis here.

Use this as the first working checklist:

- [x] Add a small `ProgressionProfile` type consumed by `generateChords()`.
  - `start?: "tonic" | "any"`
  - `cadence?: "none" | "soft" | "strong" | "loop"`
  - `tension?: number`
  - `repetition?: number`
- [x] Keep existing `chordLengths`, `extensionProbability`, seeded repeatability, and `ChordEvent[]` output working.
- [x] Add internal scale-degree metadata with simple roles: tonic, predominant, dominant, colour.
- [x] Replace loose random degree choice with seeded weighted movement between roles.
- [x] Add cadence handling:
  - `strong`: bias final movement toward dominant -> tonic
  - `soft`: resolve via predominant or colour -> tonic
  - `loop`: end somewhere that naturally returns to the opening chord
  - `none`: keep current freer ending
- [x] Let `tension` and `repetition` nudge weights.
  - higher `tension` should favour dominant/colour roles
  - higher `repetition` should reuse previous/root material more often
- [x] Confirm package boundary stays clean: Composer passes resolved numbers/strings; `peitho-array` has no Ballad, Darkwave, Drop, Motorik, or other product preset names.
- [x] Add focused tests:
  - seeded output is repeatable
  - generated chords fill requested bars
  - strong cadence ends on tonic
  - loop cadence can return to the opening chord
  - higher `repetition` repeats more roots than lower `repetition`
  - major/minor/pentatonic outputs stay in key

Useful reference ideas for this slice:

- [x] Scribbletune: tonic -> predominant -> dominant functional progression flow.
- [x] `emi-ts`: SPEAC-style statement/preparation/extension/antecedent/consequent tension arc.
- [x] `emi-ts`: reuse earlier phrase-position material instead of only repeating the previous chord.
- [x] Keep both ideas seeded and Peitho-native; no external runtime objects or dependencies.
- Magenta: repair/constraint mindset for symbolic sequences, not model code.

The implementation is conceptually adapted from the two MIT references above; no source module was copied. It also builds ascending tertian voicings and uses a major V for strong minor cadences.

Stop point before Magenta: `generateChords()` now includes the approved Scribbletune and `emi-ts` ideas, with focused tests and no Composer UI changes.

The weighted generator remains a fallback. It is not the final source of progression quality; the curated seed bank below will become the primary starting point once Pulse has generated and the team has auditioned enough candidates.

### Progression Seed Bank Contract

`peitho-pulse` produces candidates during development. `peitho-array` owns the static runtime bank and the deterministic quality gate.

```text
ChordSeqAI in peitho-pulse
    -> candidate progressions
    -> peitho-array normalise, validate, score and deduplicate
    -> human audition and curation
    -> progression-seeds.json
    -> deterministic selection and key transposition at runtime
```

Files:

- `packages/peitho-array/src/progression-seeds.schema.json`: shared JSON Schema for Pulse output and the final bank
- `packages/peitho-array/src/progression-seeds.json`: versioned bank target; empty until curated candidates are accepted
- `packages/peitho-array/src/progression-seeds.ts`: Roman conversion, validation, scoring, deduplication and deterministic selection

Version 1 seed shape:

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
      "genres": ["Darkwave"],
      "decade": 1980
    }
  }
}
```

Roman tokens use an optional accidental, degree `I..VII` or `i..vii`, and optional diminished or augmented marker: `bII`, `#iv°`, `V`, `vi`, `III+`. Inversions and extensions are deliberately removed during normalisation; the seed captures harmonic movement while Peitho controls voicing and colour.

Pentatonic major uses the major harmonic mode for seed conversion; pentatonic minor uses minor. Conversion round-trips are tested across all 12 keys in both modes.

Default quality gate:

- 3 to 16 chord events
- at least 3 distinct degrees for 4 to 7 events, or 4 for 8 or more
- no more than 2 consecutive uses of one degree
- no degree occupying more than 55% of the progression
- at least 60% functional transitions
- ending must satisfy the declared strong, soft, or loop cadence
- `minimal` and `pedal` tags can explicitly relax repetition limits
- complete model, version, condition, and generation-seed provenance

Exported helpers:

```ts
chordSymbolsToRoman(chords, key, mode);
romanToChordSymbols(degrees, key, mode);
validateProgressionSeed(seed, constraints);
dedupeProgressionSeeds(seeds);
curateProgressionSeeds(seeds, constraints);
selectProgressionSeed(seeds, query);
```

Responsibilities:

- Pulse generates broad candidate material and records provenance.
- Array converts to key-relative degrees, rejects repetition/cadence failures, removes transposed duplicates, and selects accepted seeds repeatably.
- Composer continues to resolve product names into generic profiles; product names do not enter the Array bank.
- Humans audition the highest-scoring candidates before the generated file becomes a runtime asset.

Status:

- [x] Shared versioned schema and TypeScript types
- [x] Chord-symbol to Roman-degree normalisation
- [x] Roman-degree transposition back to chord symbols
- [x] Diversity, repetition, functional movement, and cadence validation
- [x] Scoring, transposition deduplication, and deterministic profile selection
- [ ] Pulse candidate generator and bulk export
- [ ] First generated corpus and listening review
- [ ] Curated seeds committed to `progression-seeds.json`
- [ ] `generateChords()` switched from weighted fallback to seed-first generation

### Preset Inputs

Peitho-Composer owns its product preset catalogue. Those presets live with the Composer app, not in `peitho-array`.

Composer direction data should be resolved into plain engine inputs:

- macro values: `density`, `split`, `sync`, `rhythm`
- chord bias: `chordLengths`, `extensionProbability`, `start`, `cadence`, `tension`, `repetition`
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
  progressionProfile: preset.progressionProfile,
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

Peitho-Composer stores its chord translation rules in `apps/peitho-composer/src/direction-presets.json`:

- type defaults provide the base `ProgressionProfile`
- segment modifiers shift tension, repetition, harmonic rhythm, extensions, and cadence
- option modifiers apply the final local direction
- Composer clamps the resolved values, scales `chordLengths`, then passes only generic values to `generateChords()`

Cadence overrides resolve option first, then segment, then type. Tension and repetition shifts are additive and clamped to `0..1`. Chord-length scales are multiplicative; extension shifts are additive and clamped to `0..1`.

This makes combinations meaningfully different. For example, Ballad + Verse + Rousing Crescendo resolves to shorter harmonic rhythm, richer extensions, rising tension, and a strong cadence. Ballad + Verse + Driving Pulse resolves to higher repetition, leaner extensions, shorter repeated changes, and a loop cadence.

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

The immediate weighted-progression checklist and the progression-seed quality gate are implemented. Runtime seed-first generation waits for the Pulse corpus and listening review.

## Repair Pass Helpers

`peitho-array` exports small public repair helpers for consumers that receive loose or model-generated notes.

```ts
export function snapToScale(notes: NoteEvent[], key: string, scale: ScaleInput): NoteEvent[];
export function quantizeToGrid(notes: NoteEvent[], stepsPerBeat: number): NoteEvent[];
export function thinDensity(notes: NoteEvent[], density: number, seed: number): NoteEvent[];
```

`peitho-pulse` can run AI model output through these helpers before returning a `PeithoPattern`.
