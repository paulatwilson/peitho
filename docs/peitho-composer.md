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
| `peitho-array` | lightweight browser/React Native chord generation, deterministic fallback, repair, rhythm masks, MIDI-ready data | expose or override its locked lightweight model policy |
| `peitho-pulse` | full local/API chord models plus melody, counter-melody, drum, and arrangement planning | expose raw model tokens or provider objects directly to UI |

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
- Peitho-Pulse genre, decade, and refinement controls

Current direction axes come from Peitho-Composer preset data:

```txt
apps/peitho-composer/src/direction-presets.json
```

- Type: Ballad, Pop, Cinematic, Lo-Fi, Ambient, New Wave, Electropop, Classical, Jazz, Funk, R&B, House, Synth, Folk, Rock, Punk, Post-Rock, Darkwave.
- Segment: Intro, Verse, Pre-Chorus, Build, Chorus, Hook, Drop, Bridge, Solo, Middle-Eight, Interlude, Breakdown, Outro.
- Option: Rousing Crescendo, Moody Wind Down, Gentle Swell, Steady Groove, Sparse Reflection, Driving Pulse, Tension Lift, Release Drop, Nocturne Drift, Angular Push, Anthem Rise, Minimal Loop, Motorik Drive, Arpeggio Bloom, Blue Note Turn, Power Chord Lift, Dorian Drift, Chromatic Tension, Half-Time Drop, Call And Response, Staccato Push, Legato Float, Syncopated Lift, Suspended Colour, Pedal Point, Descending Line.

Peitho-Composer resolves Type, Segment, Option, and Scale into concrete generation parameters before calling an engine. `peitho-array` receives explicit macro values, chord-length bias, extension probability, segment profile, and option envelope. `peitho-pulse` receives the corresponding resolved request fields so model generation and deterministic repair share one musical intent.

## Direction Preset JSON

Composer preset data is a product-level library. It lives in:

```txt
apps/peitho-composer/src/direction-presets.json
```

It does not belong in `peitho-array`. Composer resolves these preset choices into explicit engine parameters, then passes those parameters into `peitho-array` or `peitho-pulse`.

Top-level shape:

```ts
type DirectionPresetLibrary = {
  types: DirectionTypePreset[];
  segments: SegmentPreset[];
  options: OptionPreset[];
  chordDirections: ChordDirectionLibrary;
};
```

### Type Presets

`types` represent broad musical idioms such as Ballad, New Wave, Jazz, Rock, or Darkwave.

```ts
type DirectionTypePreset = {
  name: string;
  pulseConditions: {
    genres: PulseGenre[];
    defaultDecade: PulseDecade;
  };
  macro: {
    density: number;
    split: number;
    sync: number;
    rhythm: number;
  };
  chordLengths: number[];
  extensionProbability: number;
  drumRecommendations: string[];
  pulseKeywords: string[];
};
```

Field meanings:

| Field | Meaning |
| --- | --- |
| `name` | UI label and preset id. |
| `pulseConditions.genres` | Explicit translation from the Composer Type to ChordSeqAI-supported genres. |
| `pulseConditions.defaultDecade` | Initial Pulse decade slot; users may override it in Pulse mode. |
| `macro.density` | Base note/event density before Segment and Option adjustments. |
| `macro.split` | Base melody/counter balance. Higher values favour melody. |
| `macro.sync` | Base syncopation amount. |
| `macro.rhythm` | Base rhythmic activity/complexity. |
| `chordLengths` | Weighted half-bar chord segment lengths fed to `peitho-array.generateChords()`. |
| `extensionProbability` | Chance that generated chords keep/add richer tones. |
| `drumRecommendations` | Composer UI recommendations. Values should match `peitho-array` drum pattern names. |
| `pulseKeywords` | Default keyword chips shown when Peitho-Pulse is selected. |

Example:

```json
{
  "name": "Darkwave",
  "pulseConditions": { "genres": ["Darkwave", "Electronic"], "defaultDecade": 1980 },
  "macro": { "density": 0.5, "split": 0.55, "sync": 0.34, "rhythm": 0.58 },
  "chordLengths": [2, 2, 3, 4],
  "extensionProbability": 0.52,
  "drumRecommendations": ["Gated-Reverb Drive", "Driving 16th Open Hat"],
  "pulseKeywords": ["cold", "minor", "shadowy"]
}
```

### Pulse Model Conditions

Composer Types are the user-facing style vocabulary. Users should not have to choose the same genre again when selecting Peitho-Pulse.

Each Type therefore supplies structured ChordSeqAI conditions through `pulseConditions`. Composer passes these model-supported values to Pulse separately from refinement keywords:

```ts
ComposerEngine.pulseConditions("Darkwave");
// { genres: ["Darkwave", "Electronic"], defaultDecade: 1980 }
```

Examples:

| Composer Type | Pulse genres | Default decade |
| --- | --- | --- |
| Ballad | Pop, Folk | 1970 |
| Pop | Pop | 2010 |
| Cinematic | Soundtrack | 2000 |
| Lo-Fi | Hip Hop, Electronic | 2010 |
| Ambient | New Age, Electronic | 1990 |
| New Wave | Electronic, Pop | 1980 |
| Electropop | Electronic, Pop | 2010 |
| Classical | Classical | 1950 |
| Jazz | Jazz | 1960 |
| Funk | R&B, Funk & Soul | 1970 |
| R&B | R&B, Funk & Soul | 2000 |
| House | Electronic, Disco | 1990 |
| Synth | Electronic | 1980 |
| Folk | Folk | 1960 |
| Rock | Rock | 1970 |
| Punk | Rock | 1970 |
| Post-Rock | Rock, Experimental | 1990 |
| Darkwave | Darkwave, Electronic | 1980 |

Only genre labels and decade slots supported by the ChordSeqAI conditioning vector are valid. Decade is single-select: `1950`, `1960`, `1970`, `1980`, `1990`, `2000`, `2010`, or `2020`.

Composer derives genres behind the scenes from Type. Pulse refinement shows the Type's default decade in a dropdown; changing Type restores that Type's default, and the user can choose any other supported decade. Array ignores both fields.

Genre and decade belong specifically to `ChordSeqAIGenerator`'s conditional chord models. They are not fields on the general `PulsePlanner` request. Only `conditional_small`, `conditional_medium`, and `conditional_large` consume these conditions.

### Segment Presets

`segments` represent song-section roles such as Intro, Verse, Hook, Breakdown, or Middle-Eight.

```ts
type SegmentPreset = {
  name: string;
  macro: {
    density?: number;
    split?: number;
    sync?: number;
    rhythm?: number;
  };
  profile: {
    density: number;
    register: number;
    length: number;
    sync: number;
  };
  pulseKeywords: string[];
};
```

Field meanings:

| Field | Meaning |
| --- | --- |
| `macro` | Additive adjustment to selected Type macro values. |
| `profile.density` | Melody/counter generation density multiplier. |
| `profile.register` | MIDI register shift in semitones. |
| `profile.length` | Note-length multiplier. |
| `profile.sync` | Syncopation offset applied during melody/counter generation. |
| `pulseKeywords` | Default Peitho-Pulse keyword chips contributed by this section role. |

Example:

```json
{
  "name": "Breakdown",
  "macro": { "density": -0.22, "split": 0.14, "sync": 0.04, "rhythm": -0.04 },
  "profile": { "density": 0.5, "register": -4, "length": 1.45, "sync": 0.05 },
  "pulseKeywords": ["stripped", "low"]
}
```

### Option Presets

`options` represent intent modifiers such as Rousing Crescendo, Motorik Drive, Blue Note Turn, or Chromatic Tension.

```ts
type OptionPreset = {
  name: string;
  macro: {
    density?: number;
    sync?: number;
    rhythm?: number;
  };
  envelope: "rise" | "fall" | "swell" | "flat" | "sparse" | "alternate";
  length: number;
  pulseKeywords: string[];
};
```

Field meanings:

| Field | Meaning |
| --- | --- |
| `macro` | Additive adjustment to selected Type and Segment macro values. |
| `envelope` | Bar-to-bar intensity shape passed to melody/counter generation. |
| `length` | Note-length multiplier passed to melody/counter generation. |
| `pulseKeywords` | Default Peitho-Pulse keyword chips contributed by this intent modifier. |

Envelope meanings:

| Envelope | Meaning |
| --- | --- |
| `rise` | Builds density/intensity across the 8-bar sketch. |
| `fall` | Starts stronger, then relaxes. |
| `swell` | Peaks near the middle. |
| `flat` | Keeps steady intensity. |
| `sparse` | Keeps restrained, open phrasing. |
| `alternate` | Alternates bar emphasis for call/response or angular patterns. |

Example:

```json
{
  "name": "Motorik Drive",
  "macro": { "density": 0.09, "sync": 0.03, "rhythm": 0.13 },
  "envelope": "flat",
  "length": 0.8,
  "pulseKeywords": ["motorik", "persistent"]
}
```

### Peitho-Pulse Keyword Chips

When the user selects Peitho-Pulse, Composer builds a default keyword chip set from the selected Type, Segment, Option, and Scale:

```ts
const keywords = unique([
  ...typePreset.pulseKeywords,
  ...segmentPreset.pulseKeywords,
  ...optionPreset.pulseKeywords,
  ...scaleProfile.pulseKeywords,
]);
```

Before deduplication, the selected Scale profile replaces incompatible mood terms contributed by other presets. For example, `uplifting` remains for a major Rousing Crescendo, becomes `defiant` in pentatonic minor, and becomes `yearning` in natural minor. Natural minor also contributes `minor` and `melancholic`.

Composer also derives one complete, deduplicated catalogue from every `pulseKeywords` entry in the preset file. The refinement control displays two lists:

- **Selected** contains the active Type, Segment, and Option defaults plus any user additions.
- **Available** contains every catalogue keyword not currently selected.

Clicking a chip moves it between the lists. Reset restores the current Type, Segment, and Option defaults. Refinement is deliberately chip-only so Composer controls remain predictable and can be translated into structured engine inputs.

```ts
type PulseRefinement = {
  keywords: string[];
};
```

Default keywords are hints for the model, not hard engine behaviour. `peitho-array` should never depend on these strings.

### Resolution Flow

When Type, Segment, Option, or Scale changes, Composer resolves the preset data like this:

1. Start with selected Type `macro`.
2. Add selected Segment `macro`.
3. Add selected Option `macro`.
4. Apply scale shift: pentatonic scales reduce `rhythm` slightly; heptatonic scales increase it slightly.
5. Clamp macro values into safe ranges.
6. Resolve Type, Segment, and Option into `chordLengths`, `extensionProbability`, and `progressionProfile` before calling `peitho-array.generateChords()`.
7. Pass resolved macro values plus Segment `profile` and Option `envelope`/`length` into `peitho-array.generateMono()`.
8. Resolve scale-aware Pulse keywords, including contextual replacements, whenever Type, Segment, Option, or Scale changes.
9. When Pulse is selected, pass the Type's structured `pulseConditions` separately from editable keyword refinement.

`peitho-pulse` should use the same resolved context when planning AI-generated material, then repair model output through `peitho-array` helpers before returning `PeithoPattern`.

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

## Audition Playback & Instruments

To improve the auditioning experience from the prototype's basic oscillators without breaking performance, we adopt a dual-stage audio roadmap:

1. **Local Development (Full Version) ✓ Implemented:** Uses `midi-js-soundfonts` (MusyngKite soundfont, mp3 format) to load base64-encoded instrument samples dynamically, decoding them into `AudioBuffer` instances via the Web Audio API. Delivers high-fidelity sound during design sessions.

   **Files added:**
   - `apps/peitho-composer/public/soundfont-player.js` — thin loader/player: dynamically injects soundfont scripts, decodes base64 data URIs to `AudioBuffer`, caches per instrument stem, nearest-note lookup with `playbackRate` pitch-shifting as fallback. Exposes `SoundfontPlayer.load(ctx, label)` and `SoundfontPlayer.play(ctx, master, label, midiNote, startTime, durSec, velocity)`.
   - `apps/peitho-composer/public/soundfonts/MusyngKite/` — 18 soundfont `.js` files: 17 melodic instruments mapped from UI labels + `synth_drum` for all drum kit variants.

   **UI label → GM soundfont stem mapping** (lives in `soundfont-player.js`):

   | UI Label | Soundfont Stem |
   | --- | --- |
   | Acoustic Piano | `acoustic_grand_piano` |
   | Electric Piano 1 | `electric_piano_1` |
   | Vibraphone | `vibraphone` |
   | String Ensemble | `string_ensemble_1` |
   | Choir Aahs | `choir_aahs` |
   | Pad: Warm | `pad_2_warm` |
   | Violin | `violin` |
   | Guitar (Nylon) | `acoustic_guitar_nylon` |
   | Flute | `flute` |
   | Oboe | `oboe` |
   | Synth Lead | `lead_1_square` |
   | Saw Wave | `lead_2_sawtooth` |
   | Acoustic Bass | `acoustic_bass` |
   | Electric Bass (Finger) | `electric_bass_finger` |
   | Electric Bass (Pick) | `electric_bass_pick` |
   | Slap Bass | `slap_bass_1` |
   | Synth Bass | `synth_bass_1` |
   | Acoustic / Electronic / Brushes (drums) | `synth_drum` |

   **Drum MIDI note mapping** (kick=36, snare=38, hat=42, open=46) handled by `Component._drumNote(kind)`.

2. **Production Web (Lite Version):** Uses `WebAudioTinySynth` (General MIDI synthesizer in a single script) to synthesize 128 GM instruments client-side. This keeps the bundle self-contained and allows offline, zero-loading-latency playback of standard instruments for the standalone frontend.

3. **Common Mapping Interface:** Both backends map directly to standard MIDI note numbers, velocities, and durations. `Component._scheduler` is untouched. The swap point is `Component._scheduleStep`, which calls `SoundfontPlayer.play()` for all voices (chord, bass, melody, counter, drums). The old oscillator-based `_voice()`, `_noise()`, and `_drumVoice()` methods have been removed. `Component._ensureAudio()` initialises the `AudioContext` and triggers preloading of all active instruments; `componentDidMount()` calls it so soundfonts begin loading on page mount. `setInstrument()` and `setDrumsKit()` call `SoundfontPlayer.load()` to preload any newly selected instrument immediately.

## Current Workflow

The prototype workflow is:

1. Select tonality: key, scale, tempo.
2. Select direction: type, segment, option.
3. Select Peitho-Array or Peitho-Pulse. Array exposes only chord count 8/16; Pulse exposes full chord controls.
4. Generate chords.
5. Lock chords.
6. Generate melodies.
7. Lock melody.
8. Generate counter-melody.
9. Edit notes, velocity, drums, and chord cells by hand.
10. Audition through Web Audio.
11. Export MIDI.

## Peitho-Pulse Refinement UI

The engine selector is interactive:

- `Peitho-Array` uses the fixed lightweight profile: `conditional_small`, two tries, Free ending policy, In Key palette, no immediate repeats, and chord count 8 or 16. Type/Segment/Option/Scale presets resolve all other values and cannot be overridden.
- `Peitho-Pulse` reveals a refinement panel below the engine selector.

The refinement panel is only visible when `engineModel === "pulse"`. Generate Chords posts the resolved `ChordGenRequest` to `/pulse/chords`; the server reuses one cached `ChordSeqAIGenerator` and returns ranked candidates. Composer renders the best candidate into the existing chord lane.

The panel includes a single-select decade dropdown with the eight model slots from `1950` through `2020`. It starts from the selected Type's default. Changing Type updates it; Reset restores it alongside the default keyword chips.

When Pulse mode is selected, Composer initialises keyword chips from the current Type, Segment, and Option:

```ts
ComposerEngine.pulseKeywords(type, segment, option, scale);
```

Those keywords come from `pulseKeywords` fields and `scaleProfiles` in:

```txt
apps/peitho-composer/src/direction-presets.json
```

The user can move chips between the complete **Selected** and **Available** lists. Removing a chip makes it available; adding an available chip selects it. Reset restores the current preset defaults. No free-text refinement is accepted.

The intended Pulse refinement payload is:

```ts
type PulseRefinement = {
  keywords: string[];
};
```

Composer should send Pulse the resolved preset context and refinement:

```ts
type PulseComposerContext = {
  type: string;
  segment: string;
  option: string;
  key: string;
  scale: string;
  macros: {
    density: number;
    split: number;
    sync: number;
    rhythm: number;
  };
  pulseConditions: {
    genres: PulseGenre[];
    decade: PulseDecade;
  };
  refinement: PulseRefinement;
};
```

Composer translates that internal context into two separate package requests.

For chord generation, Composer calls `ChordSeqAIGenerator` with resolved harmonic controls:

```ts
const chordRequest: ChordGenRequest = {
  key,
  mode,
  bars,
  tension,
  repetition,
  cadence,
  chordLengths,
  model: "conditional_medium",
  genres: pulseConditions.genres,
  decade: pulseConditions.decade,
  seed,
};
```

For melody, counter-melody, or drums, Composer calls `PulsePlanner.generate()` with macros and locked musical context. Selected refinement chips are joined into `prompt`; that field is reserved for Stage 4 LM conditioning and does not currently alter ChordSeqAI output.

```ts
const pulseRequest: PulseRequest = {
  target,
  key,
  scale,
  bars,
  seed,
  density,
  split,
  sync,
  rhythm,
  chords: lockedChords,
  melody: lockedMelody,
  prompt: refinement.keywords.join(", "),
};
```

`docs/peitho-pulse-user-guide.md` is the authoritative package API reference. `peitho-array` should only receive concrete symbolic parameters and repair-pass data.

## Extraction Plan

Peitho-Composer should gradually become thinner as engine logic moves into packages.

### Stage 1: Keep Prototype Running

Keep `docs/Peitho/Peitho.dc.html` as read-only reference while the Bun app shell grows. Work in `apps/peitho-composer/public/index.html`.

### Stage 2: Extract Peitho-Array Logic

Move deterministic helpers from the prototype into `packages/peitho-array`:

- scales and keys
- chord pool (started)
- chord generation (started)
- macro value consumption
- segment and option profile consumption
- seeded RNG
- melody and counter generation
- drum patterns
- MIDI writer

The Composer owns product preset data and imports engine behaviours. Preset choices are converted into plain engine parameters before calling `peitho-array` or `peitho-pulse`.

### Stage 3: Composer App Shell

Build the Bun app around the same first-screen experience:

- no landing page
- composition surface first
- same dark production-tool feel
- same matrix-first workflow
- engine selector wired to package APIs

### Stage 4: Peitho-Pulse Integration

Continue Peitho-Pulse integration beyond the wired chord-generation path:

- keep the existing `ChordSeqAIGenerator` chord route and candidate conversion covered
- route melody, counter-melody, and drums through `PulsePlanner`
- pass selected refinement chips through the reserved `prompt` field
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
