# peitho-pulse User Guide

`peitho-pulse` is the AI planning engine for Peitho. It generates musical material — chord progressions, melodies, counter-melodies, beats — that `peitho-array` can validate, compile, and render to MIDI.

## Array And Pulse Runtime Split

`peitho-array` owns lightweight browser/React Native use. Its optional chord inference uses `conditional_small`, two candidates, strict in-key masking, reject/free ending policy, and chord counts of 8 or 16. Remaining musical controls come from resolved presets and are not user-overridable in Array mode.

`peitho-pulse` is the workhorse local/API path. It exposes larger models, more candidates, cadence/scale policies, harmonic rhythm, chord counts, and expert sampling controls.

Both paths produce the same `ProgressionSeed` contract. Array's model is hosted in object storage and runs client-side; Pulse models run locally or behind the API.

See [`docs/peitho-pulse.md`](./peitho-pulse.md) for architecture decisions, model candidate evaluations, and staging plan.

---

## Package

```
packages/peitho-pulse/
  src/
    index.ts              — public PulsePlanner API
    chord-seq-ai/         — chord progression generator (internal)
  test/
    chord-seq-ai.test.ts  — 49 tests
  scripts/
    smoke-chordseqai.ts   — ONNX model smoke test
```

Import from `@peitho/pulse` only. Do not import from subpaths.

---

## PulsePlanner API

The main planner interface: takes a fully-resolved `PulseRequest`, returns a `PeithoPattern`.

```typescript
import { MagentaPulsePlanner, StubPulsePlanner } from "@peitho/pulse";
import type { PulseRequest, PulsePlanner } from "@peitho/pulse";

// Active Stage 1 planner — ImprovRNN (melody/counter) + DrumsRNN (beats)
const planner: PulsePlanner = new MagentaPulsePlanner();

// Stub — returns empty PeithoPattern; used in tests and as fallback
const stub: PulsePlanner = new StubPulsePlanner();
```

`MagentaPulsePlanner` lazy-loads ONNX checkpoints on first `generate()` call.

```typescript
const result = await planner.generate({
  target: "melody",
  key: "C",
  scale: "major",
  bars: 8,
  density: 0.6,
  split: 0.4,
  sync: 0.5,
  rhythm: 0.5,
  chords: [...],   // locked chord events → conditions melody
  seed: 42,
});
// result: PeithoPattern with result.melody populated
```

### PulseRequest fields

| Field | Type | Notes |
| --- | --- | --- |
| `target` | `"chords" \| "drums" \| "melody" \| "counter"` | What to generate |
| `key` | `string` | e.g. `"C"`, `"F#"` |
| `scale` | `ScaleInput` | e.g. `"major"`, `"natural-minor"` |
| `bars` | `number` | |
| `seed` | `number?` | |
| `density` | `number` | 0–1 macro |
| `split` | `number` | 0–1 macro |
| `sync` | `number` | 0–1 macro |
| `rhythm` | `number` | 0–1 macro |
| `chords` | `ChordEvent[]?` | Locks chords → primes melody/counter |
| `melody` | `NoteEvent[]?` | Locks melody → primes counter |
| `prompt` | `string?` | Keyword string from direction-presets; reserved for Stage 4 LM conditioning |

### Generation pipeline

Composer calls Pulse once per target, passing locked context forward:

```
1. target: "chords"  → ChordEvent[]    (from peitho-array or ChordSeqAI seeds)
2. target: "drums"   → drums pattern
3. target: "melody"  → NoteEvent[]     (chord-conditioned via ImprovRNN)
4. target: "counter" → NoteEvent[]     (melody + chord conditioned)
```

---

## Chord Progression Generation

`ChordSeqAIGenerator` generates `ProgressionSeed` objects — Roman-degree chord progressions — via pre-trained ONNX models. Primary use: building `progression-seeds.json` for `peitho-array`'s static seed bank.

Seven ONNX models in `.contrib/chord-progression-ai/chord-seq-ai-app/public/models/` (not in git):

| Model | Size | Style conditioning |
| --- | --- | --- |
| `recurrent` | 1.4 MB | none |
| `transformer_small` | 4.5 MB | none |
| `transformer_medium` | 9.4 MB | none |
| `transformer_large` | 18 MB | none |
| `conditional_small` | 4.6 MB | genre + decade |
| `conditional_medium` | 9.6 MB | genre + decade ← default |
| `conditional_large` | 18 MB | genre + decade |

Runtime: `onnxruntime-node` via N-API under Bun. All seven pass the smoke test (see below). Inference: 3–14 ms per chord on Apple Silicon.

### Basic usage

```typescript
import { ChordSeqAIGenerator } from "@peitho/pulse";

const gen = new ChordSeqAIGenerator();
// Optional: pass a custom models directory
// const gen = new ChordSeqAIGenerator("/path/to/onnx/models");

const result = await gen.generate({
  key: "C",
  mode: "major",
  bars: 8,
  tension: 0.5,
  repetition: 0.4,
  cadence: "strong",
});

for (const candidate of result.candidates) {
  console.log(candidate.progressionSeed.degrees); // ["I", "vi", "IV", "V"]
  console.log(candidate.validation.valid);         // true
}
```

Reuse one `ChordSeqAIGenerator` instance — it caches the ONNX session between calls.

### ChordGenRequest — full parameter reference

#### Required

| Parameter | Type | Description |
| --- | --- | --- |
| `key` | `string` | Root key: `"C"` `"C#"` `"D"` … `"B"` |
| `mode` | `ScaleName` | `"major"` \| `"natural-minor"` \| `"pentatonic-major"` \| `"pentatonic-minor"` |
| `bars` | `number` | Length in bars |
| `tension` | `number` | 0–1. Maps to sampling temperature 0.5–1.5. Higher = more adventurous harmonies. |
| `repetition` | `number` | 0–1. Weights motif-reuse score during candidate ranking. Does not affect sampling. |
| `cadence` | `ProgressionSeedCadence` | `"none"` \| `"soft"` \| `"strong"` \| `"loop"` |

#### Harmonic structure

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `chordLengths` | `number[]` | `[1,1,2,2,2,3,4]` | Half-bar length distribution; used to derive chord count |
| `chordCount` | `number` | derived | Explicit chord count; overrides derivation |
| `harmonicRhythm` | `number[]` | derived | Explicit half-bar durations. Sum must equal `bars × 2`. |

#### Policies

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `cadencePolicy` | `"reject" \| "repair"` | `"repair"` | `repair`: enforce cadence via logit masking during generation. `reject`: discard candidates where cadence validation fails. |
| `scalePolicy` | `"strict" \| "cadential" \| "chromatic"` | `"cadential"` | `strict`: diatonic tokens only. `cadential`: diatonic except at cadence positions. `chromatic`: no scale masking. |

#### Repeat control

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `allowImmediateRepeat` | `boolean` | `false` | Allow the same chord to immediately follow itself |
| `repetitionPenalty` | `number` | `3.0` | Logit subtraction applied to recent tokens (logit units) |
| `repetitionWindow` | `number` | `1` | Number of recent tokens to penalise |

#### Model and style

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `model` | `ModelVariant` | `"conditional_medium"` | ONNX model. Only `conditional_*` models accept genre/decade. |
| `genres` | `Genre[]` | — | Multi-hot genre conditioning (up to 20 genres) |
| `decade` | `Decade` | — | One-hot decade: `1950` \| `1960` \| `1970` \| `1980` \| `1990` \| `2000` \| `2010` \| `2020` |
| `primerChords` | `number[]` | `[]` | Internal token IDs to seed continuation from |

**Available genres:** Rock, Folk, Pop, Soundtrack, R&B & Funk & Soul, Country, Jazz, Experimental, Religious Music, Reggae & Ska, Hip Hop, Electronic, Comedy, Metal, Blues, World Music, Disco, Classical, New Age, Darkwave

#### Sampling

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `temperature` | `number` | derived from `tension` | Expert override; bypasses tension→temperature mapping |
| `seed` | `number` | `0` | Generation seed. Per-candidate sub-seeds are derived from this so any candidate can be reproduced independently. |
| `samplingStrategy` | `SamplingStrategy` | `"multinomial"` | `"multinomial"` \| `"greedy"` \| `"top-k"` \| `"top-p"` |
| `topK` | `number` | `50` | Token pool for `"top-k"` strategy |
| `topP` | `number` | `0.9` | Nucleus threshold for `"top-p"` strategy |
| `candidateCount` | `number` | `4` | Candidate progressions to generate per call |

### ChordGenResult

```typescript
type ChordGenResult = {
  candidates: {
    tokenIds: number[];               // internal model token IDs
    chordSymbols: string[];           // e.g. ["Am", "F", "G", "C"]
    progressionSeed: ProgressionSeed; // ready for peitho-array
    validation: ProgressionSeedReport;
  }[];
  resolvedControls: {
    temperature: number;
    repetitionPenalty: number;
    repetitionWindow: number;
    chordCount: number;
    scalePolicy: ScalePolicy;
    cadencePolicy: CadencePolicy;
  };
};
```

Candidates are ranked: `validation.score + motifReuseScore × repetition × 5`. `candidates[0]` is best.

### ProgressionSeed shape

```typescript
{
  degrees: ["I", "vi", "IV", "V"],
  mode: "major",               // "major" | "minor" (pentatonic modes map to their parent)
  cadence: "strong",
  tension: 0.5,
  repetition: 0.4,
  harmonicRhythm: [4, 4, 4, 4], // half-bar durations
  source: {
    provider: "chord-seq-ai",
    model: "conditional_medium",
    modelVersion: "1.0.0",
    seed: 3712846891,           // per-candidate derived seed
    conditions: {
      genres: ["Jazz"],
      decade: 1980,
      temperature: 1.0,
      scalePolicy: "cadential"
    }
  }
}
```

---

## Codex Handover — Batch Seed Generator CLI

### Goal

Build `packages/peitho-pulse/src/cli/generate-seeds.ts`. Iterates over generation combinations, collects valid `ProgressionSeed` objects, curates and deduplicates, writes `progression-seeds.json` for `peitho-array`.

### CLI interface

```
bun packages/peitho-pulse/src/cli/generate-seeds.ts [options]

  --key         C|C#|D|...|B or "all" (default: all)
  --mode        major|minor|all (default: all)
  --bars        4|8 (default: 8)
  --cadence     none|soft|strong|loop|all (default: all)
  --tension     comma-separated values (default: 0.3,0.5,0.7)
  --repetition  comma-separated values (default: 0.3,0.5,0.7)
  --genres      comma-separated genre names (default: none — unconditional)
  --decade      1950|1960|...|2020 (default: none)
  --model       model variant (default: conditional_medium)
  --candidates  candidates per combination (default: 8)
  --seed        base seed (default: 0)
  --out         output path (default: packages/peitho-array/src/progression-seeds.json)
  --dry-run     print stats only, do not write
```

### Output format

```typescript
// from @peitho/array
type ProgressionSeedLibrary = {
  version: 1;
  seeds: ProgressionSeed[];
};
```

### Generation loop

```typescript
import { ChordSeqAIGenerator } from "@peitho/pulse";
import { curateProgressionSeeds } from "@peitho/array";
import type { ProgressionSeed, ProgressionSeedLibrary } from "@peitho/array";

// deriveCandidateSeed: (seed ^ (index * 0x9e3779b9)) >>> 0
// source: packages/peitho-pulse/src/chord-seq-ai/sampler.ts — copy inline
function deriveCandidateSeed(requestSeed: number, index: number): number {
  return ((requestSeed ^ (index * 0x9e3779b9)) >>> 0);
}

const gen = new ChordSeqAIGenerator();
const allSeeds: ProgressionSeed[] = [];

for (const [index, combo] of combinations.entries()) {
  const comboSeed = deriveCandidateSeed(baseSeed, index);
  const result = await gen.generate({ ...combo, seed: comboSeed, candidateCount });
  for (const c of result.candidates) {
    if (c.validation.valid) allSeeds.push(c.progressionSeed);
  }
}

const { accepted } = curateProgressionSeeds(allSeeds);
const library: ProgressionSeedLibrary = { version: 1, seeds: accepted };
```

### peitho-array imports

```typescript
import {
  curateProgressionSeeds,
  validateProgressionSeed,
  dedupeProgressionSeeds,
} from "@peitho/array";
import type {
  ProgressionSeed,
  ProgressionSeedLibrary,
} from "@peitho/array";
```

### Determinism

Each combination seed is `deriveCandidateSeed(baseSeed, combinationIndex)`. Any combination can be re-run independently without re-running prior combinations.

### Combination sizing

Default sweep (no genre/decade):

```
12 keys × 2 modes × 4 cadences × 3 tension values × 3 repetition values = 864 combinations
864 × 8 candidates × ~8 ms ≈ 55 seconds
```

### Progress logging

Per combination:

```
[12/864] C minor strong t=0.3 r=0.3 → 7 valid candidates
```

Final summary:

```
Generated: 6912 candidates
Accepted:  4821
Rejected:  2091
Unique:    1204
Written:   packages/peitho-array/src/progression-seeds.json
```

---

## Tests

```bash
bun test packages/peitho-pulse/test/chord-seq-ai.test.ts
# 49 tests, ~1.2 s
```

Covers: token vocab integrity, sampler determinism, harmonic rhythm validation, scale mask correctness, cadence mask positions, Roman degree conversion (all 12 keys), strong/soft/loop cadence repair, reject policy, motif ranking, temperature mapping, provenance completeness.

## Smoke Test (all 7 ONNX models)

```bash
bun packages/peitho-pulse/scripts/smoke-chordseqai.ts
```

Loads all seven ONNX models and runs one inference pass each. Reports load time, inference time, output shape, pass/fail. All seven pass in under 200 ms total.
