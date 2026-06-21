# peitho-pulse User Guide

Use `@peitho/pulse` for model-backed symbolic generation. Use `@peitho/array`
directly when deterministic generation is sufficient.

## Chord Generation

Local ONNX files must exist in `packages/peitho-pulse/models/`, or pass another
model directory to the constructor.

```ts
import { ChordSeqAIGenerator } from "@peitho/pulse";

const generator = new ChordSeqAIGenerator();
const result = await generator.generate({
  key: "D",
  mode: "natural-minor",
  bars: 8,
  tension: 0.65,
  repetition: 0.35,
  cadence: "loop",
  seed: 42,
  model: "conditional_medium",
  genres: ["Darkwave", "Electronic"],
  decade: 1980,
  candidateCount: 4,
});

const best = result.candidates[0];
```

Reuse one generator instance. It caches one ONNX session for current model.

```ts
const custom = new ChordSeqAIGenerator("/absolute/path/to/models");
```

## Chord Controls

Required:

- `key`, `mode`, `bars`
- `tension`, `repetition`, `cadence`

Common optional controls:

| Field | Purpose |
| --- | --- |
| `seed` | repeatable candidate sampling |
| `model` | ONNX model variant |
| `candidateCount` | number of attempts |
| `chordCount` | explicit progression length |
| `chordLengths` | harmonic-rhythm weighting |
| `harmonicRhythm` | exact half-bar durations |
| `scalePolicy` | `strict`, `cadential` or `chromatic` |
| `cadencePolicy` | `repair` or `reject` |
| `allowImmediateRepeat` | permit adjacent duplicate tokens |
| `repetitionPenalty` | recent-token penalty |
| `repetitionWindow` | recent-token window |
| `samplingStrategy` | multinomial, greedy, top-k or top-p |
| `temperature` | expert sampling override |
| `genres`, `decade` | conditional-model style vector |

`harmonicRhythm.length` must equal chord count and durations must sum to
`bars * 2` half-bars.

## Chord Result

```ts
type ChordGenResult = {
  candidates: {
    tokenIds: number[];
    chordSymbols: string[];
    progressionSeed: ProgressionSeed;
    validation: ProgressionSeedReport;
  }[];
  resolvedControls: ResolvedControls;
};
```

Candidates contain model provenance, resolved conditions, harmonic rhythm and
validation scores. Consumers should handle empty candidate arrays.

## Magenta Planner

`MagentaPulsePlanner` lazy-loads `@magenta/music` checkpoints on first non-chord
request. Defaults use Google-hosted checkpoint URLs.

```ts
import { MagentaPulsePlanner, type PulseRequest } from "@peitho/pulse";

const planner = new MagentaPulsePlanner();
const request: PulseRequest = {
  target: "melody",
  key: "C",
  scale: "major",
  bars: 8,
  seed: 42,
  density: 0.6,
  split: 0.5,
  sync: 0.25,
  rhythm: 0.5,
  chords,
};

const pattern = await planner.generate(request);
```

Targets:

- `chords`: returns empty shell; use `ChordSeqAIGenerator` for chords
- `drums`: DrumsRNN continuation
- `melody`: ImprovRNN conditioned by chords
- `counter`: ImprovRNN using melody primer and chord context

Generated melodic notes pass through quantisation, scale snapping and density
repair.

Override checkpoints when required:

```ts
const planner = new MagentaPulsePlanner({
  improvRnnCheckpoint: "/local/checkpoints/improv",
  drumsRnnCheckpoint: "/local/checkpoints/drums",
});
```

## Stub Planner

`StubPulsePlanner` returns an empty pattern with requested dimensions. Use it for
fallback wiring and contract tests, not music generation.

## Composer HTTP API

Local Composer server exposes:

- `POST /pulse/chords`: `ChordGenRequest -> ChordGenResult`
- `POST /pulse/generate`: `PulseRequest -> PeithoPattern`

Malformed JSON returns `400`. Runtime/model errors return JSON with status `500`.
Request validation beyond JSON parsing is not yet implemented.

## Tests

```sh
bun test packages/peitho-pulse/test
bun run typecheck
```

ONNX tests require local model files. Research and batch-corpus plans belong in
[`peitho-pulse.md`](./peitho-pulse.md) and [`plan.md`](./plan.md), not this guide.
