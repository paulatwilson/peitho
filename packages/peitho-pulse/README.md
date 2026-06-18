# @peitho/pulse

AI-assisted symbolic planning engine for Peitho systems.

`@peitho/pulse` sits above `@peitho/array`. It will adapt planners such as ACE-Step 1.5 and optional Magenta-style symbolic models into Peitho-native pattern data.

It should output symbolic music structures, not finished audio renders.

## Install

```sh
bun add @peitho/pulse
```

## Current API

```ts
import { StubPulsePlanner } from "@peitho/pulse";

const planner = new StubPulsePlanner();
const pattern = await planner.generate({
  prompt: "8-bar ballad verse",
});
```

## Documentation

See [`../../docs/peitho-pulse.md`](../../docs/peitho-pulse.md).

## Licence

MIT. See [`LICENSE`](./LICENSE).
