# AI-First Melody Generation Design

Status: implementation in progress. Phase 1 complete (steps 1–6 below). Magenta
multi-candidate pipeline is live. MidiGenAI via TyTorch and AMT are next spikes.

## Implemented (phase 1)

- `MelodyGenerationRequest`, `MelodyPlanner`, `RawMelodyCandidate`,
  `MelodyRepairReport`, `MelodyCandidateReport`, `EnrichedChordEvent`,
  `InternalMelodyRequest` — all in `packages/peitho-pulse/src/melody-contracts.ts`
- `enrichChords()` and `activeChordAt()` —
  `packages/peitho-pulse/src/chord-enrichment.ts`
- 6-stage melody repair returning notes + report —
  `packages/peitho-pulse/src/melody-repair.ts`
- 10-metric candidate scoring and ranking —
  `packages/peitho-pulse/src/melody-scoring.ts`
- `MagentaMelodyPlanner` — multi-candidate ImprovRNN at varied temperatures —
  `packages/peitho-pulse/src/magenta-melody-planner.ts`
- `generateMelodyCandidates` pipeline orchestrator —
  `packages/peitho-pulse/src/melody-pipeline.ts`
- `/pulse/generate` routes `melody`/`counter` to the pipeline, returns
  `MelodyCandidateReport[]` sorted best-first
- Composer `genMel`/`genCtr` POST to `/pulse/generate`, populate all 3 variant
  slots from ranked candidates

## Goal

Melody generation should rely on trained symbolic models for musical decisions,
then use deterministic algorithms to validate and repair output.

AI owns:

- phrase shape and continuation
- motif creation and reuse
- chord-aware pitch choices
- rhythmic character
- tension and release
- response to direction and refinement controls
- variation between candidates

Algorithms own:

- schema validation
- timing and MIDI bounds
- scale/chord compatibility checks
- overlap and collision repair
- density limits
- candidate scoring and ranking
- deterministic fallback when model generation fails

Algorithmic cleanup must not rewrite a generated phrase into a procedural melody.
It should preserve model intent whenever output is valid.

## Quality Target

Melody generation should follow the successful chord-generation pattern:

```text
resolved musical request
  -> model generates several candidates
  -> deterministic validation and repair
  -> candidates receive musical quality reports
  -> best candidate becomes active variant
  -> remaining candidates remain available as alternatives
```

One model sample is not enough. Candidate generation, validation, provenance and
ranking are required parts of the feature.

## Current Versus Target

| Area | Current (phase 1) | Target |
| --- | --- | --- |
| Composer melody button | Pulse melody request via `/pulse/generate` — live | best proven adapter from Magenta/MidiGenAI/AMT bake-off |
| Melody model | Magenta ImprovRNN via `MagentaMelodyPlanner` — wired and active | best proven adapter from Magenta/MidiGenAI/AMT bake-off |
| Chord context | locked chords enriched to `EnrichedChordEvent[]`; mandatory for all generation | locked chords are mandatory control |
| Pulse keywords | included in resolved `prompt` string sent to planner | structured keyword-to-constraint mapping per planner |
| Macros | `density` and `sync` condition model temperature; feed repair stage limits | condition model plus repair limits |
| Candidates | three ranked `MelodyCandidateReport[]` populate all variant slots — live | candidates from bake-off winner (MidiGenAI / AMT) |
| Repair | 6-stage repair preserves AI phrase; returns `MelodyRepairReport` — live | cleanup preserves AI phrase |
| Quality report | 10-metric per-candidate score in `MelodyCandidateReport` — live | structural and musical metrics per candidate |

## Package Boundary

```text
Peitho-Composer
  - owns Type, Segment, Option and keyword chips
  - resolves UI choices into explicit request fields
  - sends locked chord and edited-note context
        |
        v
@peitho/pulse
  - selects model adapter
  - enriches ChordEvent[] to EnrichedChordEvent[] before calling planners
  - generates multiple symbolic candidates
  - converts model-native tokens to NoteEvent[]
  - repairs candidates and computes MelodyCandidateReport[]
  - scores and ranks candidates before returning to Composer
        |
        v
@peitho/array
  - provides deterministic repair primitives (quantise, snap, thin)
  - provides reusable metric utility functions
```

Array remains model-free. Model tensors, provider tokens and Composer preset names
must not cross package boundaries.

`MelodyPlanner` is a parallel interface to `PulsePlanner`. `PulsePlanner` remains
the interface for drums generation. Pulse routing selects the correct interface per
target. Neither interface replaces the other.

## Melody Request

Composer should extend its resolved Pulse request rather than sending raw UI
state.

```ts
type MelodyGenerationRequest = {
  target: "melody" | "counter";
  bars: number;
  beatsPerBar: number;
  stepsPerBeat: number;
  tempo: number;
  key: string;
  scale: ScaleInput;
  seed: number;
  candidateCount: number;

  density: number;
  sync: number;
  rhythm: number;
  melodyShare: number;

  segmentProfile: SegmentProfile;
  optionProfile: OptionProfile;
  prompt: string;
  keywords: string[];

  chords: ChordEvent[];
  melody?: NoteEvent[];       // mandatory context for counter generation
  existingNotes?: NoteEvent[]; // optional user-authored control/infilling input

  planner: "magenta" | "midigenai" | "amt";
};
```

`type`, `segment` and `option` remain Composer concepts. Composer converts them to
profiles, structured controls and prompt text before calling Pulse.

`melodyShare` is the resolved meaning of Composer's Note Split macro. Higher
values allocate more activity to melody; lower values allocate more to counter.

## Input Mapping

| Composer input | AI use | Cleanup/validation use |
| --- | --- | --- |
| key and scale | pitch vocabulary/context | allowed pitch validation |
| locked chords | harmonic control sequence | chord-tone/downbeat scoring |
| tempo | rhythmic conditioning | duration and overlap limits |
| Type | resolved prompt and model conditions | none directly |
| Segment | phrase role, register and activity | register/density bounds |
| Option | phrase envelope and articulation | envelope comparison |
| keywords | prompt/refinement constraints | optional metric selection |
| density | target event activity | maximum/minimum event count |
| syncopation | rhythmic conditioning | off-beat ratio target |
| rhythm complexity | duration/onset vocabulary | complexity bounds |
| note split | melody/counter allocation | relative density target |

Keywords must not imply behaviour unless a planner adapter supports them. Unknown
keywords remain prompt text; deterministic code must not invent undocumented
keyword rules.

## Harmonic Conditioning

Locked chords are mandatory for melody and counter generation.

Pulse enriches incoming `ChordEvent[]` to `EnrichedChordEvent[]` before passing to
any planner. Planners always receive the enriched form. Composer sends plain
`ChordEvent[]`; enrichment is a Pulse responsibility.

```ts
type EnrichedChordEvent = ChordEvent & {
  degree?: number;           // scale degree: 1 = tonic, 4 = subdominant, 5 = dominant
  cadenceRole?: "approach" | "arrival" | "passing" | null;
  phrasePosition: "opening" | "middle" | "closing";
  barIndex: number;
};
```

For every chord, Pulse supplies:

- chord name and tones
- start and duration
- bar/beat position
- key-relative degree when available
- cadence and phrase position context

Allowed repair pitches should be:

```text
active scale tones UNION active chord tones
```

This preserves intentional borrowed-chord tones. Strict scale snapping alone can
destroy valid harmony when Pulse chords use chromatic or cadential colour.

Harmonic quality should be encouraged primarily through model conditioning and
candidate ranking. Repair should change pitches only when they violate configured
hard constraints.

## AI Generation Stage

Each planner implements one shared adapter:

```ts
type MelodyPlanner = {
  generate(request: MelodyGenerationRequest): Promise<RawMelodyCandidate[]>;
};

// Pulse enriches request.chords to EnrichedChordEvent[] before calling generate.
// The MelodyGenerationRequest chords field arriving from Composer is ChordEvent[];
// planners receive an internally resolved form with EnrichedChordEvent[].

type RawMelodyCandidate = {
  notes: NoteEvent[];
  source: {
    provider: string;
    model: string;
    modelVersion?: string;
    seed: number;
    conditions: Record<string, unknown>;
  };
};
```

Model generation should produce at least three candidates for Composer's three
variant slots. Candidate seeds derive deterministically from request seed.

### Magenta Planner

Current implemented adapter uses ImprovRNN for melody/counter and DrumsRNN for
drums. It can provide first integrated AI melody path, but current checkpoints are
externally hosted and model quality must be evaluated.

Required changes:

- expose multiple candidates
- accept complete resolved request
- preserve provenance
- support existing-note primer correctly
- return raw candidates before repair

### MidiGenAI Planner

Reference source: `.contrib/ai-models/midigenai` (read-only). Licence: MIT.

MidiGenAI is a serious candidate because Peitho has access to its complete model,
tokeniser, training and evaluation pipeline rather than only an inference API.
The current v2 line provides:

- custom GPT-style symbolic transformer
- published `v2-100m` checkpoint with approximately 113M parameters
- compact 641-token MidiTok MIDILike event vocabulary
- pitch, velocity, timing and MIDI program events
- tempo-invariant training and tempo restoration during decoding
- streamed continuation with KV cache
- multi-track/program event support
- quantitative MIDI metrics and blinded A/B grading UI
- training and fine-tuning pipeline

These properties make MidiGenAI the strongest candidate for a Peitho-owned model
that can eventually learn Composer controls directly.

Current limitations matter:

- v2 generation is causal continuation, not arbitrary infilling
- tokenizer explicitly uses `use_chords=false`; chord symbols are not control tokens
- key, scale, Segment, Option, macros and keywords are not native conditions
- locked chords encoded as ordinary MIDI may be treated as preceding music rather
  than time-aligned harmonic control
- current runtime is Python/PyTorch/MidiTok, not Bun/TypeScript
- pretrained checkpoint is general multi-track MIDI, not a dedicated monophonic
  chord-conditioned melody model

Required reference spike:

1. encode a locked Peitho progression as MIDI prompt events
2. generate multiple seeded continuations from published v2 checkpoint
3. isolate pitched melodic output by program/track
4. map events into `NoteEvent[]`
5. measure chord adherence, phrase quality, repetition, latency and repair counts
6. determine whether continuation can satisfy an 8-bar locked-chord request

If general continuation is good but harmonic alignment is weak, do not patch it
with heavy procedural rewriting. Fine-tune or extend model conditioning instead.
Possible Peitho-specific work:

- add key, scale and chord-control tokens
- add section/envelope and macro tokens
- train target melody/counter track against aligned chord context
- teach infilling or two-stream control rather than prompt-only continuation
- retain its event vocabulary, evaluation tools and training infrastructure

MidiGenAI should be evaluated before any runtime port. A model-quality decision
and runtime decision are separate.

### Anticipatory Music Transformer

AMT is promising for controlled infilling and accompaniment. Local reference at
`.contrib/ai-models/anticipation` uses Python and Hugging Face Transformers.
TyTorch/Bun execution is not proven.

Required spike before selection:

- load real `stanford-crfm/music-medium-800k` checkpoint
- reproduce model event tokenisation and sampling
- supply locked chords/notes as valid control events
- convert output to `NoteEvent[]`
- measure latency, memory and candidate quality

### ACE-Step Planner

ACE-Step may later translate broad text intent into structured phrase guidance.
It is optional. Composer already resolves most structured controls, so ACE-Step
must demonstrate clear improvement before entering the melody request path.

Do not require ACE-Step for every melody generation until its planner output and
local runtime are proven useful.

## Model Bake-Off

All candidate engines receive equivalent musical briefs and produce the same
`RawMelodyCandidate` contract.

| Engine | Initial role | Main strength | Main risk |
| --- | --- | --- | --- |
| Magenta ImprovRNN | integration baseline/fallback | already adapted; chord symbols supported | older single-track model and unknown quality ceiling |
| MidiGenAI v2 | trainable Peitho model candidate | efficient event model plus full training/evaluation stack | continuation lacks explicit chord/control conditioning |
| AMT | controlled infilling candidate | accompaniment and asynchronous control events | Python reference runtime and complex event/control adapter |

Evaluation must use identical:

- chord progressions and timing
- key, scale, tempo and bar count
- target macros and direction profiles
- candidate count and derived seeds where supported
- repair and ranking implementation
- listening rubric

Do not select a production engine from repository claims or aggregate metrics
alone. Listen to blind candidate sets. Record output, provenance, metrics, repair
reports and listener preference.

Initial decision questions:

1. Does Magenta provide a sufficiently musical fast baseline?
2. Can MidiGenAI follow locked chords without model retraining?
3. Does AMT infilling materially outperform continuation approaches?
4. Which model responds predictably to Peitho controls?
5. Which failures are repairable without destroying model intent?

Likely outcome is not necessarily one engine. Magenta may remain fallback,
MidiGenAI may become the customisable main model, and AMT may serve infilling or
counter-melody tasks if listening evidence supports that split.

## Deterministic Repair

Repair order:

1. reject malformed or non-finite events
2. clamp MIDI pitch, velocity, start and duration bounds
3. quantise timing to supported grid
4. resolve overlaps according to monophonic/polyphonic target
5. preserve scale or active-chord tones; move invalid pitches minimally
6. enforce register and total-density bounds
7. apply minimal velocity/duration envelope correction when required

Repair returns both notes and a report:

```ts
type MelodyRepairReport = {
  removedEvents: number;
  quantisedEvents: number;
  pitchRepairs: number;
  overlapRepairs: number;
  densityRepairs: number;
  envelopeRepairs: number;
};
```

Large repair counts reduce candidate score. A model candidate needing extensive
rewriting should lose to a cleaner candidate.

## Candidate Quality Report

```ts
type MelodyCandidateReport = {
  notes: NoteEvent[];
  source: RawMelodyCandidate["source"];
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

`MelodyCandidateReport` is the HTTP response element. It carries the repaired notes
and provenance alongside quality data so Composer can populate variant slots without
a second request.

Ranking must not reduce melody quality to scale compliance. Important signals:

- strong-beat relationship to active chord
- controlled step/leap contour
- motif identity with variation
- phrase-level rise/fall matching Option envelope
- cadence-aware ending
- register and density matching Segment
- rhythmic response to sync/complexity macros
- separation from existing counter/melody line

Weights require listening evaluation. They must not be treated as universal music
rules.

## Composer Integration

Generation flow:

```text
user clicks Layer Melodies
  -> require locked chords
  -> resolve presets, macros and keywords
  -> POST /pulse/generate  { target: "melody", ... MelodyGenerationRequest }
  -> Pulse: enrich chords, generate candidates, repair, score, rank
  -> response: MelodyCandidateReport[]  (sorted best-first, notes included)
  -> fill melody variant slots from response
  -> select best candidate (index 0)
  -> allow audition/edit/lock
```

The `/pulse/generate` endpoint for `melody` and `counter` targets returns
`MelodyCandidateReport[]`. Scoring and ranking run inside Pulse before the response
is sent. Composer does not score candidates.

Correct variant update:

```js
this.setState((state) => {
  const overrides = state.melOverride.slice();
  overrides[state.activeMel] = melodyNotes;
  return { melOverride: overrides };
});
```

Do not clear other variant slots. Generated AI notes use the same soundfont
playback, piano-roll editing and MIDI export paths as Array notes.

Counter generation repeats the flow with locked melody supplied as additional
context. Candidate scoring adds collision, register separation and call/response
metrics.

## Failure Behaviour

- model unavailable: show actionable error and offer Array fallback
- no valid candidate: retain existing variants; do not clear user work
- request cancelled: discard late response
- direction changed during generation: discard response using request identity
- partial model output: repair only when musical intent remains recoverable

Fallback must be explicit. UI should not silently label Array output as Pulse.

## Listening Evaluation

Automated metrics protect contracts; human listening decides musical quality.

Create fixed briefs covering:

- major/minor and pentatonic/heptatonic scales
- simple and borrowed-chord progressions
- verse, chorus, intro, bridge and outro profiles
- rise, fall, swell, sparse and alternating envelopes
- low/high density and syncopation extremes
- melody generation and counter generation

For each brief, retain request, seed, candidates, reports and listener decisions.
Compare models and ranking changes against same fixtures.

## Implementation Order

1. ✅ Extend Pulse melody request and response contracts.
2. ✅ Add reusable melody repair and candidate report types to Array/Pulse boundary.
3. ✅ Refactor Magenta adapter to return multiple raw candidates with provenance.
4. Build shared fixture, metric and blind-listening harness.
5. ✅ Connect Composer melody action to `/pulse/generate` behind explicit planner choice.
6. ✅ Populate three variant slots from ranked candidates.
7. Run MidiGenAI v2 reference spike against same requests and reports.
8. Run AMT reference spike against same requests and reports.
9. Select task-specific model roles from listening evidence.
10. Decide whether selected model needs runtime port, adapter process or fine-tuning.
11. Add ACE-Step only if it improves structured intent interpretation.

## Completion Criteria

- locked chords condition every melody candidate
- at least three deterministic candidates per request seed
- candidates include provenance, repair and quality reports
- UI macros/refinement reach model request
- invalid output is repaired without procedural phrase replacement
- active and alternative variants remain editable
- failures preserve existing user work
- browser, contract and model-adapter tests pass
- listening evaluation shows clear improvement over current Array generator
- Magenta, MidiGenAI and AMT results are compared through one model-neutral harness
