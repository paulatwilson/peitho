# Peitho Working Rules

Read [`docs/code-map.md`](./docs/code-map.md) first. Open only owning module and
focused tests. Current product handoff: [`docs/PEITHO.md`](./docs/PEITHO.md).

## Commands

```sh
./dev.sh          # port 43117-43121; rs restarts; q quits
bun test
bun run typecheck
```

Do not start `src/server.ts` directly for normal development; `dev.sh` owns port
selection and restart behaviour.

## Boundaries

```text
peitho-composer -> peitho-pulse -> peitho-array
peitho-composer ----------------> peitho-array
```

- Composer owns presets, workflow, playback and UI.
- Pulse owns model adapters.
- Array owns shared contracts, deterministic music logic, repair and MIDI.
- TokenMusicStream is storage/transport only.
- `.contrib/*` is read-only reference material. Never edit or import it.

## Composer Runtime

Active UI: `apps/peitho-composer/public/index.html`.

It uses custom Design Component runtime. Template holes are dotted lookups only;
compute values in logic and expose through `renderVals()`. Do not edit
`public/support.js` for product features.

Reusable logic belongs under `src/` or engine packages, not inline UI script.
`/composer-engine.js` is built in memory; never commit generated bundle.

## Music Units

- Composer matrix: 128 sixteenth-note steps.
- Chords: 16 half-bar units; multiply by 8 for matrix steps.
- Notes: `{ step, len, midi, vel? }`.
- Canonical types: `packages/peitho-array/src/contracts.ts`.

## Change Rules

- Preserve public exports during internal refactors.
- Keep Composer preset names out of Array.
- Keep model-native values inside Pulse adapters.
- Add focused tests beside changed boundary.
- Update implemented/planned status in docs.
- Preserve unrelated user changes; leave work unstaged.
