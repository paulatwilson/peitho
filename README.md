# Peitho

Peitho is a TypeScript/Bun workspace for three public outputs:

- `@peitho/array`: deterministic MIDI and theory engine.
- `@peitho/pulse`: ACE-Step/MLX-backed symbolic planner engine.
- `peitho-composer`: Bun-based 8-bar music composition surface using both engines in the background.

The Peitho-Composer visual prototype remains in `docs/Peitho/Peitho.dc.html`.

Engine documentation:

- [`docs/peitho-array.md`](./docs/peitho-array.md)
- [`docs/peitho-pulse.md`](./docs/peitho-pulse.md)
- [`docs/peitho-composer.md`](./docs/peitho-composer.md)

## Commands

```sh
bun install
bun test
bun run dev
```

`bun run dev` serves the prototype and future app assets from `apps/peitho-composer`.
