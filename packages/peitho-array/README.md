# @peitho/array

Deterministic, model-free symbolic music engine for browser, mobile, game and
server consumers.

## Implemented

- shared event and pattern contracts
- scale mapping and pitch snapping
- weighted seeded chord progressions and cadence profiles
- monophonic melody/counter generation
- procedural drum grids
- waveform summaries
- Standard MIDI file generation
- progression seed validation, selection and transposition

```ts
import { generateChords, generateMono } from "@peitho/array";

const chords = generateChords({
  key: "C",
  scale: "major",
  bars: 8,
  seed: 42,
  progressionProfile: { cadence: "strong", tension: 0.5 },
});
```

Composer preset names and model dependencies do not belong here. See
[Array documentation](../../docs/peitho-array.md).
