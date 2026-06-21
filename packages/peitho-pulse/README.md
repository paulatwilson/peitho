# @peitho/pulse

Symbolic model adapters for Peitho. Pulse depends on `@peitho/array` for shared
contracts and deterministic repair. Array never depends on Pulse.

## Implemented

- `ChordSeqAIGenerator`: seven ONNX chord models through `onnxruntime-node`.
- `MagentaPulsePlanner`: lazy ImprovRNN and DrumsRNN adapter.
- `StubPulsePlanner`: empty-pattern test/fallback adapter.
- `repairNotes`: quantise, snap to scale and thin density.

Models under `models/` are local and gitignored. Magenta checkpoints default to
Google-hosted URLs.

```ts
import { ChordSeqAIGenerator } from "@peitho/pulse";

const generator = new ChordSeqAIGenerator();
const result = await generator.generate({
  key: "C",
  mode: "major",
  bars: 8,
  tension: 0.5,
  repetition: 0.4,
  cadence: "strong",
  seed: 42,
});
```

ACE-Step, MLX, TyTorch and Anticipatory Music Transformer support are not
implemented. See [Pulse documentation](../../docs/peitho-pulse.md).
