# Peitho Code Map

Use this file to locate code before opening large implementation files.

## Package Direction

```text
peitho-composer -> peitho-pulse -> peitho-array
peitho-composer ----------------> peitho-array
```

Dependencies must never point upward. Composer presets stay in Composer. Pulse
adapters may use Array repair/types. Array remains deterministic and model-free.

## Change Routing

| Change | Start Here | Avoid Loading |
| --- | --- | --- |
| shared music/event types | `packages/peitho-array/src/contracts.ts` | Composer UI |
| deterministic generation | `packages/peitho-array/src/index.ts` | Pulse models |
| progression seed library | `packages/peitho-array/src/progression-seeds.ts` | Composer UI |
| Pulse request contract | `packages/peitho-pulse/src/contracts.ts` | model adapters |
| model-output repair | `packages/peitho-pulse/src/repair.ts` | Composer UI |
| Magenta generation | `packages/peitho-pulse/src/magenta-planner.ts` | ChordSeqAI |
| AI melody target design | `docs/melody-generation-design.md` | model reference trees |
| ONNX chords | `packages/peitho-pulse/src/chord-seq-ai/` | Magenta adapter |
| preset translation | `apps/peitho-composer/src/composer-engine.ts` | server code |
| Pulse HTTP routes | `apps/peitho-composer/src/pulse-api.ts` | static serving |
| static/bundle serving | `apps/peitho-composer/src/static-assets.ts` | model code |
| server composition | `apps/peitho-composer/src/server.ts` | engine internals |
| Composer interaction/UI | `apps/peitho-composer/public/index.html` | reference prototype |

## Public Entry Points

- `@peitho/array`: barrel in `packages/peitho-array/src/index.ts`.
- `@peitho/pulse`: barrel in `packages/peitho-pulse/src/index.ts`.
- Composer browser facade: `ComposerEngine` from `composer-engine.ts`.

Keep barrels declarative. Put implementation in focused modules. Preserve public
exports during internal refactors.

## Generated And Reference Files

- `/composer-engine.js` is built in memory by Bun. Do not commit generated bundle.
- `.contrib/*` is read-only reference material. Never refactor it.
- `.contrib/Peitho/*` is read-only reference prototype material. Product changes
  belong under `apps/peitho-composer/`; never refactor `.contrib/*`.

## Verification

```sh
bun test
bun run typecheck
```

Add focused tests beside changed boundary. Avoid tests importing UI or model
adapters when pure contract/helper coverage is enough.
