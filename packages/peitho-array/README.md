# @peitho/array

Deterministic TypeScript music engine for Peitho systems.

`@peitho/array` provides the lightweight symbolic foundation: grid configuration, scale/key mapping, note and chord event shapes, deterministic generation utilities, and future motif/rhythm helpers.

It does not load ML models, generate audio, or depend on Peitho-Composer.

## Install

```sh
bun add @peitho/array
```

## Current API

```ts
import { createEmptyPattern, scaleMidi } from "@peitho/array";

const pattern = createEmptyPattern({
  bars: 8,
  beatsPerBar: 4,
  stepsPerBeat: 4,
});

const notes = scaleMidi("C", "major", 60, 72);
```

## Documentation

See [`../../docs/peitho-array.md`](../../docs/peitho-array.md).

## Licence

MIT. See [`LICENSE`](./LICENSE).
