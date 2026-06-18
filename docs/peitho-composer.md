# Peitho-Composer

`Peitho-Composer` is the Bun-based front end for Peitho. It is the music composition surface that uses `peitho-array` and `peitho-pulse` in the background.

The current prototype lives here:

```txt
docs/Peitho/Peitho.dc.html
```

That prototype is the visual and behavioural baseline for Peitho-Composer.

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
docs/Peitho/support.js
```

Important prototype rules:

- `docs/Peitho/support.js` is runtime/framework code and should not be edited.
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

Keep `docs/Peitho/Peitho.dc.html` as working reference while the Bun app shell grows.

### Stage 2: Extract Peitho-Array Logic

Move deterministic helpers from the prototype into `packages/peitho-array`:

- scales and keys
- chord pool
- chord generation
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
docs/Peitho/Peitho.dc.html
```

Current handoff documentation:

```txt
docs/PEITHO.md
```

Next implementation step:

1. Keep `docs/PEITHO.md` aligned with Peitho-Composer terminology.
2. Extract deterministic helpers into `peitho-array`.
3. Replace prototype helper calls with package imports once the Bun app shell is ready.
