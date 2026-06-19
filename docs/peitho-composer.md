# Peitho-Composer

`Peitho-Composer` is the Bun-based front end for Peitho. It is the music composition surface that uses `peitho-array` and `peitho-pulse` in the background.

The original prototype lives here and should be treated as reference material:

```txt
docs/Peitho/Peitho.dc.html
```

The working Peitho-Composer copy lives here:

```txt
apps/peitho-composer/public/index.html
```

That Composer copy is the file to edit while converting the prototype into the Bun application.

## Role

Peitho-Composer owns the user-facing composition workflow:

- key, scale, and tempo selection
- creative direction selection
- chord generation and editing
- melody and counter-melody generation
- drum groove generation and editing
- piano-roll editing
- audition playback
- MIDI export
- engine switching between Peitho-Array and Peitho-Pulse

It should not own the reusable music-generation engine logic long term. That logic should move into `peitho-array` and `peitho-pulse`.

## Relationship To The Engines

Peitho-Composer is an engine consumer.

The user should experience one composer workflow. Engine choice, validation, repair, and compilation happen behind the scenes unless the UI deliberately exposes an engine selector for control or debugging.

| Module | Composer Uses It For | Composer Must Not Do |
| --- | --- | --- |
| `peitho-array` | deterministic generation, scale maths, chord pools, melody repair, rhythm masks, MIDI-ready pattern data | duplicate reusable engine logic once extracted |
| `peitho-pulse` | AI-assisted prompt planning, phrase suggestions, symbolic variation, future ACE-Step/Magenta adapter output | expose raw model objects directly to UI |

The Composer may impose product limits such as 8 bars, 4/4, and a compact sketch workflow. Those limits belong to the Composer, not the engines.

## Direction Selection

Peitho-Composer's first musical choice is not decoration. Tonality plus Type, Segment, and Option seed the rest of the interface.

Those selections initialise:

- macro values
- chord progression bias
- melodic density
- note split between melody/counter material
- syncopation level
- rhythmic complexity
- future Peitho-Pulse prompt constraints

Current direction axes come from `peitho-array`:

- Type: Ballad, Pop, Cinematic, Lo-Fi, Ambient, New Wave, Electropop, Classical, Jazz, Synth, Rock, Darkwave.
- Segment: Intro, Verse, Pre-Chorus, Chorus, Hook, Bridge, Middle-Eight, Breakdown, Outro.
- Option: Rousing Crescendo, Moody Wind Down, Gentle Swell, Steady Groove, Sparse Reflection, Driving Pulse, Tension Lift, Release Drop, Nocturne Drift, Angular Push, Anthem Rise, Minimal Loop.

Peitho-Composer should call `recommendMacros()` from `@peitho/array` whenever Type, Segment, Option, or Scale changes. Later, `@peitho/pulse` should receive the same selection so AI plans and deterministic repair passes share one musical intent.

## Prototype Baseline

The prototype is a Design Component rather than a normal React app. It runs directly in the browser through:

```txt
apps/peitho-composer/public/support.js
```

Important prototype rules:

- `apps/peitho-composer/public/support.js` is runtime/framework code and should not be edited.
- Template holes such as `{{ key }}` are dotted lookups only.
- Template expressions such as `{{ a + b }}` are invalid.
- `renderVals()` is the bridge between state and template.
- Styling is inline, with only limited global CSS in the `<helmet><style>` block.
- Pure helper functions at the top of the script are extraction targets for `peitho-array`.

## Product Constraints

Peitho-Composer deliberately starts as an 8-bar composition tool:

- 8 bars
- 4/4
- 16th-note grid
- 128 visible steps
- in-memory state
- MIDI-first output
- Web Audio audition only

These constraints are good for the Composer because it is meant to be fast, focused, and DAW-friendly. They should not leak into `peitho-array` or `peitho-pulse`.

## Current Workflow

The prototype workflow is:

1. Select tonality: key, scale, tempo.
2. Select direction: type, segment, option.
3. Select engine model: Peitho-Array now, Peitho-Pulse later.
4. Generate chords.
5. Lock chords.
6. Generate melodies.
7. Lock melody.
8. Generate counter-melody.
9. Edit notes, velocity, drums, and chord cells by hand.
10. Audition through Web Audio.
11. Export MIDI.

## Extraction Plan

Peitho-Composer should gradually become thinner as engine logic moves into packages.

### Stage 1: Keep Prototype Running

Keep `docs/Peitho/Peitho.dc.html` as read-only reference while the Bun app shell grows. Work in `apps/peitho-composer/public/index.html`.

### Stage 2: Extract Peitho-Array Logic

Move deterministic helpers from the prototype into `packages/peitho-array`:

- scales and keys
- chord pool (started)
- chord generation (started)
- macro recommendations
- segment and option profiles
- seeded RNG
- melody and counter generation
- drum patterns
- MIDI writer

The Composer then imports those behaviours instead of owning them.

### Stage 3: Composer App Shell

Build the Bun app around the same first-screen experience:

- no landing page
- composition surface first
- same dark production-tool feel
- same matrix-first workflow
- engine selector wired to package APIs

### Stage 4: Peitho-Pulse Integration

Add Peitho-Pulse as an optional generation path:

- prompt panel
- plan preview
- generated phrase suggestions
- model output repair through `peitho-array`
- same MIDI/editing surface after generation

### Stage 5: Persistence And Projects

Only after engine extraction and Composer shell are stable, add:

- saved projects
- user presets
- export settings
- project import/export
- possible local database

## Tokenised Clip JSON

Peitho-Composer may export or store compact tokenised JSON clips for later reuse, sharing, game import, or block/object storage.

The project-wide tokenised format is `TokenMusicStream`, documented in [`token-music-stream.md`](./token-music-stream.md). This should be the same compact music format used across Peitho-Composer, game music systems, and other projects that need shared clip storage or import/export.

This format is an adapter/transport format. It is not the internal engine format. `peitho-array` and `peitho-pulse` should output readable Peitho-native symbolic objects first, then projects can encode those objects into tokenised clips when compact storage or transport is useful.

Recommended flow:

```text
peitho-array / peitho-pulse
  -> PeithoPattern / PhrasePlan / Motif data
  -> Composer clip encoder
  -> TokenMusicStream JSON
  -> local save, object storage, game import, or share/export
```

The tokenised schema is compact transport/storage data. Keep readable canonical project data for editing, tests, tooling, and debugging.

The full token dictionary, tuple definitions, TypeScript shape, and example payload live in [`token-music-stream.md`](./token-music-stream.md).

### Token Dictionary

The token dictionary is versioned with the stream schema. Clients must decode by `v`.

Top-level keys:

| Token | Meaning | Type |
| --- | --- | --- |
| `v` | schema version | integer |
| `i` | clip/session id | string |
| `r` | parent/reference id | string optional |
| `sd` | deterministic seed | integer |
| `b` | BPM | integer |
| `ts` | time signature token | integer |
| `a` | A4 tuning frequency | integer/float |
| `k` | root MIDI note | integer |
| `m` | mode interval array | integer array |
| `s` | sections | array |

Section tuple positions:

| Index | Token | Meaning |
| --- | --- | --- |
| `0` | `r` | role token |
| `1` | `o` | start offset in beats |
| `2` | `l` | length in beats |
| `3` | `c` | chord tuples |
| `4` | `e` | event tuples |

Chord tuple positions:

| Index | Token | Meaning |
| --- | --- | --- |
| `0` | `o` | beat offset within section |
| `1` | `l` | length in beats |
| `2` | `d` | scale degree |
| `3` | `x` | accidental token |
| `4` | `q` | chord quality token |
| `5` | `f` | optional pad oscillator frequency array |

Event tuple positions:

| Index | Token | Meaning |
| --- | --- | --- |
| `0` | `t` | beat offset within section |
| `1` | `f` | oscillator frequency in Hz |
| `2` | `v` | velocity `0..127` |
| `3` | `l` | duration in beats |
| `4` | `w` | voice token |

Enum tokens:

| Domain | Token | Meaning |
| --- | --- | --- |
| section role | `0` | intro |
| section role | `1` | body |
| section role | `2` | bridge |
| section role | `3` | outro |
| time signature | `44` | 4/4 |
| time signature | `34` | 3/4 |
| time signature | `68` | 6/8 |
| accidental | `-1` | flat |
| accidental | `0` | natural |
| accidental | `1` | sharp |
| chord quality | `0` | minor |
| chord quality | `1` | major |
| chord quality | `2` | sus2 |
| chord quality | `3` | sus4 |
| chord quality | `4` | add9 |
| chord quality | `5` | power |
| voice | `0` | pad |
| voice | `1` | pulse |
| voice | `2` | chime |
| voice | `3` | shimmer |
| voice | `4` | bass |

Reference decoder:

```ts
export const MUSIC_TOKEN_TABLE_V1 = {
  top: {
    v: "schemaVersion",
    i: "id",
    r: "referenceId",
    sd: "seed",
    b: "bpm",
    ts: "timeSignature",
    a: "tuningA4",
    k: "rootMidi",
    m: "modeIntervals",
    s: "sections",
  },
  section: ["role", "offsetBeats", "lengthBeats", "chords", "events"],
  chord: ["offsetBeats", "lengthBeats", "degree", "accidental", "quality", "frequencies"],
  event: ["offsetBeats", "frequency", "velocity", "lengthBeats", "voice"],
  enums: {
    sectionRole: ["intro", "body", "bridge", "outro"],
    chordQuality: ["min", "maj", "sus2", "sus4", "add9", "power"],
    voice: ["pad", "pulse", "chime", "shimmer", "bass"],
  },
} as const;
```

### TypeScript Shape

```ts
export type TokenMusicStream = {
  v: 1;
  i: string;
  r?: string;
  sd: number;
  b: number;
  ts: 44 | 34 | 68;
  a: number;
  k: number;
  m: number[];
  s: TokenSection[];
};

export type TokenSection = [
  r: number,
  o: number,
  l: number,
  c: TokenChord[],
  e: TokenEvent[],
];

export type TokenChord = [
  o: number,
  l: number,
  d: number,
  x: -1 | 0 | 1,
  q: number,
  f?: number[],
];

export type TokenEvent = [
  t: number,
  f: number,
  v: number,
  l: number,
  w: number,
];
```

### Example Payload

```json
{
  "v": 1,
  "i": "peitho-clip-12345",
  "sd": 12345,
  "b": 58,
  "ts": 44,
  "a": 440,
  "k": 57,
  "m": [0, 3, 5, 7, 10],
  "s": [
    [
      0,
      0,
      16,
      [
        [0, 8, 1, 0, 0, [220, 329.628, 440]],
        [8, 8, 7, 0, 1, [195.998, 293.665, 391.995]]
      ],
      [
        [0, 220, 34, 4, 0],
        [3, 440, 22, 1, 2],
        [6.5, 329.628, 18, 1.5, 3]
      ]
    ]
  ]
}
```

### Encoding Rules

- Use beats, not seconds.
- Tokenise stable object keys and enum values.
- Prefer tuple arrays for repeated structures.
- Store canonical project data as MIDI notes or Peitho note events.
- Store Hz in token streams only when fast playback or game import needs it.
- Round frequencies to 3 decimals.
- Use integer velocity `0..127`, not floats.
- Use numeric tokens for section role, chord quality, and voice.
- Gzip/Brotli object payloads in storage and HTTP where available.
- Treat this as import/export data, not the main editing model.

## Non-Goals

Peitho-Composer should not:

- become the reusable engine
- hard-code limits into engine packages
- generate finished audio renders as the main output
- require ACE-Step or Magenta for basic use
- expose raw model-specific data in the UI
- turn into a landing page before the composition surface exists

## Current Implementation

Current app server:

```txt
apps/peitho-composer/src/server.ts
```

Current prototype:

```txt
apps/peitho-composer/public/index.html
```

Current handoff documentation:

```txt
docs/PEITHO.md
```

Next implementation step:

1. Keep `docs/PEITHO.md` aligned with Peitho-Composer terminology.
2. Extract deterministic helpers into `peitho-array`.
3. Replace prototype helper calls with package imports once the Bun app shell is ready.
