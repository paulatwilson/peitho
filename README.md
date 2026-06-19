# Peitho

Peitho is a TypeScript/Bun workspace for three public outputs:

- `@peitho/array`: deterministic MIDI and theory engine.
- `@peitho/pulse`: ACE-Step/MLX-backed symbolic planner engine.
- `peitho-composer`: Bun-based 8-bar music composition surface using both engines in the background.

The original visual prototype remains in `docs/Peitho/Peitho.dc.html`.
The working Composer copy is served from `apps/peitho-composer/public/index.html`.

Engine documentation:

- [`docs/peitho-array.md`](./docs/peitho-array.md)
- [`docs/peitho-pulse.md`](./docs/peitho-pulse.md)
- [`docs/peitho-composer.md`](./docs/peitho-composer.md)
- [`docs/token-music-stream.md`](./docs/token-music-stream.md)

## Commands

```sh
bun install
bun test
bun run dev
```

`bun run dev` serves the prototype and future app assets from `apps/peitho-composer`.

For local development, use:

```sh
./dev.sh
```

Default URL: `http://localhost:43117`.
