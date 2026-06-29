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
production implementations. See [Pulse documentation](../../docs/peitho-pulse.md).

## Experimental AMT Session Player endpoint

`POST /pulse/session-player/amt` runs the unmodified AMT reference source through
an isolated Python worker. It currently supports `piano` (General MIDI program 0)
and `pad` (program 88). The worker masks model output to the requested program;
style planning, candidate ranking and production runtime integration do not exist.

The first request downloads the approximately 1.44 GB
`stanford-crfm/music-medium-800k` checkpoint into the Hugging Face cache.

Research setup on Apple Silicon:

```sh
python3.11 -m venv .venv-amt
.venv-amt/bin/pip install torch transformers==4.29.2 tqdm==4.65.0 numpy mido==1.2.10
```

The reference directory remains read-only and is loaded through `PYTHONPATH` by
the worker. Override paths with `PEITHO_AMT_PYTHON` and `PEITHO_AMT_MODEL`.

Example:

```sh
curl -X POST http://localhost:43117/pulse/session-player/amt \
  -H 'content-type: application/json' \
  -d '{
    "role":"pad",
    "bars":8,
    "beatsPerBar":4,
    "stepsPerBeat":4,
    "tempo":100,
    "seed":7,
    "topP":0.95,
    "chords":[
      {"name":"Cm","start":0,"len":4,"tones":[48,51,55]},
      {"name":"G#","start":4,"len":4,"tones":[56,60,63]},
      {"name":"D#","start":8,"len":4,"tones":[51,55,58]},
      {"name":"A#","start":12,"len":4,"tones":[58,62,65]}
    ]
  }'
```
