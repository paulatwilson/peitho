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

## Magenta Planner (Drums)

`MagentaPulsePlanner` implements `PulsePlanner`. Use it for drum generation.
Melody and counter targets route through `MagentaMelodyPlanner` instead — see
[Melody Generation](#melody-generation) below.

```ts
import { MagentaPulsePlanner, type PulseRequest } from "@peitho/pulse";

const planner = new MagentaPulsePlanner();
const request: PulseRequest = {
  target: "drums",
  key: "C",
  scale: "major",
  bars: 8,
  seed: 42,
  density: 0.6,
  split: 0.5,
  sync: 0.25,
  rhythm: 0.5,
};

const pattern = await planner.generate(request);
```

Targets via `MagentaPulsePlanner`:

- `chords`: returns empty shell; use `ChordSeqAIGenerator` for chords
- `drums`: DrumsRNN continuation

Override checkpoints when required:

```ts
const planner = new MagentaPulsePlanner({
  improvRnnCheckpoint: "/local/checkpoints/improv",
  drumsRnnCheckpoint: "/local/checkpoints/drums",
});
```

## Melody Generation

Melody and counter targets use `MagentaMelodyPlanner` (implements `MelodyPlanner`)
and the `generateMelodyCandidates` pipeline. The pipeline returns multiple ranked
`MelodyCandidateReport[]` candidates rather than a single pattern.

```ts
import {
  MagentaMelodyPlanner,
  generateMelodyCandidates,
  type MelodyGenerationRequest,
} from "@peitho/pulse";

const planner = new MagentaMelodyPlanner();

const request: MelodyGenerationRequest = {
  target: "melody",
  bars: 8,
  beatsPerBar: 4,
  stepsPerBeat: 4,
  tempo: 120,
  key: "C",
  scale: "major",
  seed: 42,
  candidateCount: 3,
  density: 0.6,
  sync: 0.25,
  rhythm: 0.5,
  melodyShare: 0.6,
  segmentProfile: { register: "mid", activityBias: 0.5 },
  optionProfile: { envelope: "rise", articulationBias: 0.5 },
  prompt: "verse · swell",
  keywords: [],
  chords,           // ChordEvent[] — Pulse enriches internally
  planner: "magenta",
};

const candidates = await generateMelodyCandidates(request, planner);
const best = candidates[0]; // sorted best-first
```

For counter generation, set `target: "counter"` and include `melody` (locked
melody notes) as additional context.

### MelodyGenerationRequest fields

Required:

- `target`: `"melody"` or `"counter"`
- `bars`, `beatsPerBar`, `stepsPerBeat`, `tempo`
- `key`, `scale`
- `chords`: locked `ChordEvent[]`

Common optional controls:

| Field | Purpose |
| --- | --- |
| `seed` | deterministic candidate seeds |
| `candidateCount` | number of candidates (default 3) |
| `density` | target note activity (0.0–1.0) |
| `sync` | syncopation level; conditions model temperature |
| `rhythm` | rhythmic complexity conditioning |
| `melodyShare` | melody/counter activity allocation |
| `segmentProfile` | register and activity bounds |
| `optionProfile` | envelope and articulation targets |
| `prompt` | free-form planner conditioning string |
| `keywords` | refinement chips forwarded to planner |
| `melody` | locked melody for counter generation |
| `existingNotes` | user-authored notes for infilling |

### MelodyCandidateReport

Each entry in the returned array:

```ts
type MelodyCandidateReport = {
  notes: NoteEvent[];
  source: { provider: string; model: string; seed: number; conditions: Record<string, unknown> };
  score: number;
  metrics: {
    validStructure: boolean;
    chordToneDownbeatRatio: number;
    scaleOrChordToneRatio: number;
    registerFit: number;
    densityFit: number;
    syncFit: number;
    rhythmFit: number;
    contourContinuity: number;
    motifReuse: number;
    phraseResolution: number;
    melodyCounterSeparation?: number;
  };
  repair: MelodyRepairReport;
  warnings: string[];
};
```

Candidates are sorted best-first by `score`. Use `candidates[0].notes` for the
primary variant. Populate remaining slots from `candidates[1]` and `candidates[2]`.

Override checkpoint when required:

```ts
const planner = new MagentaMelodyPlanner({
  improvRnnCheckpoint: "/local/checkpoints/improv",
});
```

## Stub Planner

`StubPulsePlanner` returns an empty pattern with requested dimensions. Use it for
fallback wiring and contract tests, not music generation.

## Composer HTTP API

Local Composer server exposes:

- `POST /pulse/chords`: `ChordGenRequest -> ChordGenResult`
- `POST /pulse/generate`: routing depends on `target` field:
  - `"melody"` or `"counter"`: `MelodyGenerationRequest -> MelodyCandidateReport[]`
    (sorted best-first; notes and provenance included in each entry)
  - all other targets: `PulseRequest -> PeithoPattern`

Malformed JSON returns `400`. Runtime/model errors return JSON with status `500`.
Request validation beyond JSON parsing is not yet implemented.

## Tests

```sh
bun test packages/peitho-pulse/test
bun run typecheck
```

ONNX tests require local model files. Research and batch-corpus plans belong in
[`peitho-pulse.md`](./peitho-pulse.md) and [`plan.md`](./plan.md), not this guide.
