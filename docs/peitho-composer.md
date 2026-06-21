# Peitho-Composer

Peitho-Composer is the user-facing 8-bar music sketchpad. It owns product
workflow, direction presets, editing, playback and export. It consumes Array and
Pulse through explicit symbolic contracts.

## Current Status

Implemented:

- 8-bar/4/4 composition surface
- key, scale, tempo and direction selection
- Array chord, melody, counter and drum generation
- Pulse ChordSeqAI generation and advanced controls
- chord and piano-roll editing
- soundfont audition playback
- track mute/solo and instrument selection
- per-track and multi-track MIDI export

Not implemented:

- Pulse melody/counter/drum calls from Composer
- persistence, projects, undo/redo
- TokenMusicStream UI import/export
- model-backed Session Players

## Active Files

| Concern | File |
| --- | --- |
| UI/component state | `apps/peitho-composer/public/index.html` |
| preset data | `apps/peitho-composer/src/direction-presets.json` |
| preset/engine facade | `apps/peitho-composer/src/composer-engine.ts` |
| Pulse endpoints | `apps/peitho-composer/src/pulse-api.ts` |
| static/bundle serving | `apps/peitho-composer/src/static-assets.ts` |
| server composition | `apps/peitho-composer/src/server.ts` |
| soundfont runtime | `apps/peitho-composer/public/soundfont-player.js` |

Reference prototype: `.contrib/Peitho/Peitho.dc.html`. Never edit it.

## Ownership

Composer owns:

- Type, Segment and Option labels
- direction preset catalogue
- mapping presets to explicit engine parameters
- workflow locks and variants
- user-visible model controls
- instrument selection and audition state

Composer must not own reusable theory/generation algorithms or leak UI labels
into engine packages.

## Direction Resolution

`direction-presets.json` is sole preset source of truth. Do not duplicate its full
catalogue in documentation.

Each Type supplies base macros, chord length weights, extension probability,
drum recommendations, Pulse genres/default decade and keyword chips. Segment and
Option entries modify those values. Composer resolves them into numbers and
small profiles before calling an engine.

```text
Type + Segment + Option + Scale
  -> ComposerEngine
  -> macros, chord profile, segment profile, option profile
  -> Array request or Pulse request
```

Preset names must not cross into Array.

## Front-End Surface

Current Composer UI contains:

| Area | Controls and behaviour |
| --- | --- |
| Header | play/pause, loop, tempo context, ambient seed, multi-track export |
| Tonality | key, scale and tempo |
| Direction | Type, Segment and Option preset selectors |
| Chords | add, regenerate, split, merge, swap, clear and MIDI export |
| Engine | Peitho-Array or Peitho-Pulse chord generation |
| Pipeline | generate/lock chords, generate/lock melody, generate counter |
| Macro shaping | density, split, syncopation, rhythm complexity and reset |
| Matrix | chord, optional bass, melody, counter and drum lanes |
| Editing | note move/add/delete/resize, velocity edit and drum-cell toggles |
| Views | MIDI matrix/waveform plus horizontal and vertical zoom |
| Variants | three melody slots and three counter-melody slots |
| Mixer | per-lane mute, solo and gain |
| Instruments | soundfont selection per pitched lane and drum-kit selection |
| Arpeggiator | chord-lane rate, step count, straight/looped pattern and preview |
| Export | chord, bass, melody, counter, drums and multi-track MIDI |

Chord cells show a green/orange/red scale relationship indicator: in-key,
parallel-mode borrowed or out-of-key. The chord menu defaults to in-key choices
and can include borrowed choices; each option carries the same green/orange dot.
Bass derives from chord roots when enabled.

Manual melody/counter edits create an override for active variant. Regeneration,
direction changes or macro changes clear affected overrides.

## Direction Preset Shape

Exact entries live in `direction-presets.json`; documentation records schema and
behaviour, not duplicated catalogues.

```ts
type TypePreset = {
  name: string;
  pulseConditions: { genres: string[]; defaultDecade: PulseDecade };
  macro: MacroSettings;
  chordLengths: number[];
  extensionProbability: number;
  drumRecommendations: DrumPattern[];
  pulseKeywords: string[];
};

type SegmentPreset = {
  name: string;
  macro: Partial<MacroSettings>;
  profile: SegmentProfile;
  pulseKeywords: string[];
};

type OptionPreset = {
  name: string;
  macro: Partial<MacroSettings>;
  envelope: "rise" | "fall" | "swell" | "flat" | "sparse" | "alternate";
  length: number;
  pulseKeywords: string[];
};
```

Type supplies baseline. Segment and Option add deltas. Scale adjusts rhythm and
may replace/add refinement keywords.

## Engine Behaviour

### Array

Array currently calls deterministic `generateChords()` directly. Composer also
exposes a fixed lightweight policy describing future/supported chord-adapter
constraints:

- chord count: 8 or 16
- deterministic seeded generation
- strict scale policy
- reject invalid cadence candidates
- no immediate repeats

Melody, counter and drums currently use Array regardless of selected engine tile.

The Array card exposes only chord count (`8` or `16`). Type, Segment and Option
resolve all other chord and melody values.

### Pulse

Pulse chord mode posts a resolved `ChordGenRequest` to `/pulse/chords`. Server
returns ranked candidates; Composer converts best `ProgressionSeed` into existing
chord-lane events.

Pulse refinement provides structured model controls plus keyword chips. Keywords
are currently retained only in Composer state. They are not sent to
`/pulse/chords`, and Composer does not yet call `/pulse/generate`; therefore chips
do not currently change generated music. ChordSeqAI consumes structured genre,
decade and harmonic controls, not keywords or free text.

### Pulse Refinement

Selecting Pulse reveals:

- decade: `1950` through `2020`; seeded from selected Type
- selected keyword chips: remove individually
- available keyword catalogue: add individually
- reset: restore Type + Segment + Option + Scale defaults
- generation error display

Pulse chord parameters:

| UI control | Request value |
| --- | --- |
| Tension | `0..1`; maps to sampling temperature unless overridden |
| Repetition | `0..1`; affects candidate ranking and repeat behaviour |
| Ending | `none`, `soft`, `strong`, `loop` cadence |
| Chord Speed | preset lengths or slow/medium/fast length weights |
| Chord Palette | `strict`, `cadential`, `chromatic` scale policy |
| Chord Count | auto, 4, 6, 8, 12 or 16 |
| Model | Fast=`conditional_small`, Standard=`conditional_medium`, Deep=`conditional_large` |
| Tries | 2, 4, 6 or 8 candidates |
| Ending Policy | repair cadence or reject invalid candidate |
| Immediate Repeats | allow/block adjacent identical chord token |

Type supplies ChordSeqAI genres and default decade. Direction presets also seed
tension, repetition, cadence, scale policy, model, tries and ending policy.
Changing relevant direction inputs resets these values and invalidates generated
Pulse chords. Advanced reset restores current direction defaults.

`/pulse/generate` exists for melody/counter/drums but is not wired into Composer.

## Macro Shaping And Melody Generation

Four macros are resolved by `ComposerEngine.recommendMacros()`:

```text
resolved macro = Type base + Segment delta + Option delta
rhythm also receives -0.05 for pentatonic or +0.05 for heptatonic scale
all values are clamped to supported ranges
```

| Macro | Current Array melody effect |
| --- | --- |
| Note Density | scales event probability; higher density also shortens notes |
| Note Split | biases generation balance: higher favours melody, lower favours counter |
| Syncopation | increases weak-beat and off-beat trigger probability |
| Rhythm Complexity | increases non-beat subdivision activity |

Each Macro Shaping control has a plain-language information tooltip describing
its low/high effect and whether Array updates immediately or Pulse requires
regeneration. Note Split balances counter-melody against melody; it does not
balance chords against melody.

Segment profile additionally changes density multiplier, register, note length and
syncopation. Option profile applies bar-to-bar envelope plus note-length
multiplier. Melody uses register `58..84`; counter uses `46..74` before Segment
register shift. Counter probability receives an additional reduction.

Macro sliders affect generated melody and counter material, not existing chord
selection. Moving a macro clears manual melody/counter overrides so active seeded
variants are recomputed. Reset recalculates defaults from current direction and
scale.

Current limitation: melody generation is scale-aware but not conditioned on
active chord tones. Pulse keyword chips do not influence it.

Target Pulse melody architecture:
[`melody-generation-design.md`](./melody-generation-design.md).

## Variants And Locks

- Chords must be generated and locked before melody generation.
- Melody must contain material and be locked before counter generation.
- Melody and counter each have three independent seed/override slots.
- Regenerating active slot replaces its seed and clears its override.
- Locking protects workflow stage; it does not persist data across refresh.

## Arpeggiator

Current chord-lane arpeggiator supports:

- rates: sixteenth, eighth or quarter note
- chord-tone step counts: 3, 4, 5 or 6
- straight permutations or looped up/down-style patterns
- visual pattern selection
- preview, accept, cancel and turn-off actions

It changes derived chord-lane playback/export notes while enabled. Logic currently
lives inline in `public/index.html`; extraction into reusable TypeScript remains a
refactor target.

## Workflow

1. Select key, scale and tempo.
2. Select Type, Segment and Option.
3. Choose Array or Pulse chord engine.
4. Generate and lock chords.
5. Generate and lock melody.
6. Generate counter-melody.
7. Edit notes, velocities, drums and chords.
8. Audition using soundfonts.
9. Export MIDI.

## Time And Event Units

- 8 bars x 16 steps = 128 sixteenth-note steps.
- `NoteEvent.step` and `len` use steps.
- chord `start` and `len` use half-bars; multiply by 8 for matrix steps.
- drum export uses MIDI channel 9; other tracks use separate channels.

Canonical types live in `packages/peitho-array/src/contracts.ts`.

## Design Component Runtime

`public/index.html` contains `<x-dc>` markup and `Component extends DCLogic`.

- template holes allow dotted lookups only
- expressions belong in logic, exposed through `renderVals()`
- `renderVals()` is component-to-template boundary
- `support.js` is framework code; do not edit it casually
- reusable musical logic belongs in TypeScript modules

`/composer-engine.js` is built from `src/composer-engine.ts` in memory by Bun.
Generated copies are ignored.

## Playback And Export

Soundfonts provide audition quality only. Playback and export consume same
canonical note events. MIDI remains primary deliverable.

Instrument changes preload required soundfont. AudioContext starts through user
interaction as required by browsers.

## Refactor Targets

1. Extract preset resolution from `composer-engine.ts`.
2. Extract chord conversion/status helpers.
3. Extract arpeggiator/player logic from `public/index.html`.
4. Add browser workflow tests.
5. Add undo/redo before persistence.

## TokenMusicStream

TokenMusicStream is optional cross-project storage/transport. It is not Composer
editing state and not engine output. Sole schema:
[`token-music-stream.md`](./token-music-stream.md).

## Verification

```sh
bun test apps/peitho-composer/test
bun run typecheck
./dev.sh
```
