# Peitho

Peitho is a Bun/TypeScript workspace for generating, editing, auditioning and
exporting symbolic music.

| Project | Current role |
| --- | --- |
| `@peitho/array` | Deterministic theory, chord, melody, drum and MIDI utilities. |
| `@peitho/pulse` | ONNX chord generation plus Magenta melody/drum adapters. |
| `peitho-composer` | Focused 8-bar composition UI consuming both engines. |

Peitho produces MIDI-ready event data, not finished audio. Composer uses
soundfonts for audition playback and exports Standard MIDI files.

## Status

- Array generation, repair helpers and MIDI export: implemented.
- Pulse ChordSeqAI route: implemented and connected to Composer.
- Pulse Magenta planner: implemented package adapter; Composer does not yet call
  it for melody, counter-melody or drums.
- ACE-Step, MLX, TyTorch and Anticipatory Music Transformer: research only.
- Persistence/projects: not implemented.

## Development

```sh
bun install
./dev.sh
bun test
bun run typecheck
```

Default Composer URL: `http://localhost:43117`.

## Documentation

- [Current handoff](./docs/PEITHO.md)
- [Code map](./docs/code-map.md)
- [Composer](./docs/peitho-composer.md)
- [Array](./docs/peitho-array.md)
- [Pulse](./docs/peitho-pulse.md)
- [TokenMusicStream](./docs/token-music-stream.md)
- [Roadmap](./docs/plan.md)

`.contrib/*` contains read-only reference projects and the original Composer
prototype. Active code must not import from or modify it.
