# Peitho Current Handoff

This file describes current product and implementation truth. Use
[`code-map.md`](./code-map.md) to find owning files before loading broad docs.

## Product

Peitho-Composer is an 8-bar, 4/4 symbolic music sketchpad. User selects tonality
and creative direction, generates musical parts, edits a piano roll, auditions
with soundfonts and exports multi-track MIDI.

Composer currently supports:

- key, scale and tempo selection
- Type, Segment and Option direction presets
- deterministic Array chord, melody, counter and drum generation
- Pulse ONNX chord generation with model controls
- chord split, merge, swap and regeneration
- note movement, resizing, velocity and deletion
- mute, solo, playback and per-track instruments
- per-track and multi-track MIDI export

State remains in memory. Refresh resets the composition.

## Workspace Boundaries

```text
peitho-composer -> peitho-pulse -> peitho-array
peitho-composer ----------------> peitho-array
```

- Composer owns product presets and UI state.
- Array owns deterministic symbolic music operations and shared contracts.
- Pulse owns model runtimes and converts output into Array contracts.
- `TokenMusicStream` is an optional storage/transport format, not engine state.
- `.contrib/*` is read-only reference material. Never edit or import it.

## Current Runtime

Composer uses a custom Design Component runtime:

- active UI: `apps/peitho-composer/public/index.html`
- runtime copy: `apps/peitho-composer/public/support.js`
- source facade: `apps/peitho-composer/src/composer-engine.ts`
- Bun server: `apps/peitho-composer/src/server.ts`

The UI template supports dotted `{{ value }}` lookups only. Compute expressions
in component logic and expose them through `renderVals()`.

The original prototype is `.contrib/Peitho/Peitho.dc.html`; reference only.

## Musical Contracts

One Composer sketch uses 128 sixteenth-note steps. Chords use half-bar units:
16 units across 8 bars.

```ts
type NoteEvent = {
  step: number;
  len: number;
  midi: number;
  vel?: number;
};

type ChordEvent = {
  name: string;
  start: number; // half-bars
  len: number;   // half-bars
  tones: number[];
};
```

Canonical contracts live in `packages/peitho-array/src/contracts.ts`.

## Generation Status

### Array

Implemented in `packages/peitho-array/`:

- seeded weighted chord movement and cadence handling
- chord pools, scale helpers and repair operations
- seeded melody/counter generation
- procedural drum patterns
- MIDI byte generation
- progression seed bank and validation

Array remains model-free. Browser ONNX support described in older plans is not
implemented.

### Pulse

Implemented in `packages/peitho-pulse/`:

- ChordSeqAI inference using local ONNX models
- Magenta ImprovRNN and DrumsRNN adapter
- shared Pulse request contract and deterministic repair

Composer calls Pulse for chords through `POST /pulse/chords`. Composer does not
yet call the Magenta planner for melody, counter or drums, although
`POST /pulse/generate` exists.

Not implemented: ACE-Step planner adapter, MLX runtime, TyTorch runtime,
Anticipatory Music Transformer adapter or persistent projects.

## Development

```sh
bun install
./dev.sh
bun test
bun run typecheck
```

`./dev.sh` selects a free port from `43117` to `43121`. Enter `rs` to restart or
`q` to stop.

## Editing Rules

- Preserve package direction.
- Keep preset names out of Array.
- Keep model objects out of public app contracts.
- Put reusable logic in TypeScript modules, not `public/index.html`.
- Do not commit generated `public/composer-engine.js`.
- Add focused tests beside changed boundaries.
- Update implemented/planned status when behaviour changes.
- Leave `.contrib/*` untouched.

## Next Refactor Targets

1. Split remaining Array implementation by theory, harmony, melody, rhythm and MIDI.
2. Split Composer preset resolution from browser facade.
3. Extract reusable arpeggiator/player logic from `public/index.html`.
4. Add browser workflow coverage before changing the UI runtime.
