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

## Engine Behaviour

### Array

Array uses fixed lightweight policy for Composer chords:

- chord count: 8 or 16
- deterministic seeded generation
- strict scale policy
- reject invalid cadence candidates
- no immediate repeats

Melody, counter and drums currently use Array regardless of selected engine tile.

### Pulse

Pulse chord mode posts a resolved `ChordGenRequest` to `/pulse/chords`. Server
returns ranked candidates; Composer converts best `ProgressionSeed` into existing
chord-lane events.

Pulse refinement provides structured model controls plus keyword chips. Keywords
are currently UI/planner context only; ChordSeqAI consumes genre, decade and
harmonic controls, not free text.

`/pulse/generate` exists for melody/counter/drums but is not wired into Composer.

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
