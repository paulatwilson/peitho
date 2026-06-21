# TokenMusicStream

Status: versioned format proposal. Encoder, decoder and Composer import/export are
not yet implemented in this repository.

`TokenMusicStream` is the shared compact JSON music format for Peitho projects.

It is intended for:

- Peitho-Composer clip export
- game music import
- object/block storage
- sharing generated clips between projects
- fast Web Audio playback adapters
- optional MIDI export adapters

It is not the internal editing format and not the primary engine output. Engines should produce readable canonical data first, such as `PeithoPattern`, `PhrasePlan`, `Motif`, `NoteEvent`, and `ChordEvent`. Projects then encode that canonical data to `TokenMusicStream` when compact storage or transport is needed.

Recommended flow:

```text
peitho-array / peitho-pulse
  -> canonical Peitho symbolic data
  -> TokenMusicStream encoder
  -> compact JSON for storage, transport, playback, or import
```

## Versioning

The token dictionary is versioned with the stream schema. Clients must decode by `v`.

Breaking layout changes require a new schema version. Do not change tuple positions inside an existing version.

## Token Dictionary V1

Top-level keys:

| Token | Meaning | Type |
| --- | --- | --- |
| `v` | schema version | integer |
| `i` | clip/session/blueprint id | string |
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

## TypeScript Shape

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

## Example Payload

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

## Encoding Rules

- Use beats, not seconds.
- Tokenise stable object keys and enum values.
- Prefer tuple arrays for repeated structures.
- Store canonical project data as MIDI notes or Peitho note events.
- Store Hz in token streams only when fast playback or game import needs it.
- Round frequencies to 3 decimals.
- Use integer velocity `0..127`, not floats.
- Use numeric tokens for section role, chord quality, and voice.
- Gzip/Brotli object payloads in storage and HTTP where available.
- Treat this as import/export/transport data, not the main editing model.
