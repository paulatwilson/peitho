# peitho-array

`@peitho/array` is Peitho's deterministic symbolic music engine and canonical
contract package. It is reusable in browser, mobile, game, server and Composer
contexts.

## Boundary

Array may contain:

- music/event contracts
- explicit theory data
- deterministic generation and repair
- MIDI compilation
- small static progression data

Array must not contain:

- Composer Type/Segment/Option names
- model runtimes or checkpoints
- Pulse dependencies
- UI state, playback or persistence

Composer constraints such as 8 bars and 4/4 are request values, not package-wide
limits.

## Source Layout

- `src/contracts.ts`: shared event, pattern and option types.
- `src/index.ts`: current implementation and public exports.
- `src/progression-seeds.ts`: progression conversion, validation and selection.
- `src/progression-seeds.json`: compact fallback seed bank.

`src/index.ts` remains a refactor target. Planned modules: theory, harmony,
melody, rhythm, repair and MIDI.

## Core Contracts

```ts
type NoteEvent = {
  step: number;
  len: number;
  midi: number;
  vel?: number;
};

type ChordEvent = {
  name: string;
  start: number;
  len: number;
  tones: number[];
};

type PeithoPattern = {
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

## Implemented API Areas

### Theory And Repair

- `keyToPitchClass`
- `normalizeScaleName`
- `scaleMidi`
- `snapToScale`
- `quantizeToGrid`
- `thinDensity`

Supported scales: pentatonic major/minor and heptatonic major/natural minor.

### Chords

- `chordPool`
- `generateChords`
- weighted functional-role movement
- seeded repeatability
- exact chord-count requests
- strong, soft and loop cadence profiles
- tension and repetition weighting
- triad and selected extension voicings

Composer's fixed lightweight policy is exposed as
`ARRAY_CHORD_RUNTIME_PROFILE`. It describes product integration policy; Array's
generator remains callable with general options.

### Melody And Rhythm

- `generateMono`
- `generateDrums`
- `waveformBins`

Monophonic generation uses seeded scale movement, macro values, segment profiles
and option envelopes. Musical quality still requires listening evaluation; tests
currently prove structural behaviour and determinism.

### Patterns And MIDI

- `createEmptyPattern`
- `buildMidi`

MIDI builder returns Standard MIDI File bytes from note-event tracks. Audio
playback belongs to consumers.

### Progression Seeds

- Roman-degree conversion and transposition
- validation and quality reports
- cadence and repetition checks
- deterministic seed selection
- provenance metadata

`progression-seeds.json` is fallback/test data. It is not internal Composer state.

## Determinism

Supply a seed for repeatable output. Same request and seed should return identical
events. Omitted seed permits fresh random output.

Determinism covers generation, not user interaction or model output from Pulse.

## Example

```ts
import { buildMidi, generateChords, generateMono } from "@peitho/array";

const chords = generateChords({
  key: "A",
  scale: "natural-minor",
  bars: 8,
  seed: 42,
  chordCount: 8,
  progressionProfile: {
    start: "tonic",
    cadence: "loop",
    tension: 0.65,
    repetition: 0.4,
  },
});
```

## Current Limitations

- most implementation still occupies one large `index.ts`
- no chord-conditioned melody anchoring contract
- no reusable Session Player package
- no browser ONNX adapter
- no listening-regression corpus
- limited time-signature-specific musical behaviour

## Next Work

1. Split implementation without changing public exports.
2. Extract deterministic arpeggiator/player primitives.
3. Add chord-aware melody constraints using explicit `ChordEvent[]` input.
4. Build fixed listening fixtures and evaluation notes.
5. Expand progression bank only when it improves measured coverage.

## Verification

```sh
bun test packages/peitho-array/test
bun run typecheck
```
