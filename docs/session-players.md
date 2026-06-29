# AI-First Session Players

Status: design proposal. No model-backed Session Player is implemented. The
existing Composer arpeggiator is a deterministic utility, not the target Session
Player system.

## Goal

Session Players act as virtual musicians. They turn locked chords, timing,
direction controls and existing musical context into expressive symbolic
performances for guitar, keys, strings, bass, lead and drums.

The quality target is not merely valid MIDI. Each part should sound intentional,
respond to the other parts and offer useful creative alternatives. Trained
symbolic models are the primary generation mechanism because fixed pattern rules
alone will become repetitive and cannot provide enough musical judgement across
styles and contexts.

Session Players return canonical Peitho note events. Composer remains responsible
for workflow, instrument selection, playback and export.

## AI And Algorithmic Responsibilities

AI owns the musical performance:

- rhythm, phrasing and articulation
- voicing and register choices
- motif creation, variation and fills
- interaction with chords, melody and other players
- tension, release and activity across the section
- variation between candidates
- response to resolved direction controls

Deterministic code owns the safety boundary:

- request and output validation
- timing, pitch and velocity bounds
- overlap and collision repair
- instrument-specific physical constraints where they can be verified
- density and register limits
- candidate metrics, ranking and provenance
- reproducible fallback when a model cannot run

Repair must preserve model intent. If a candidate needs extensive rewriting, it
is a failed candidate rather than raw material for a procedural composition
engine.

Deterministic arpeggiation, comping, strumming and bass patterns remain useful as
fallbacks, fixtures and editing tools. They are not the creative production path.

## Package Boundary

```text
Peitho-Composer
  - resolves Type, Segment, Option and keyword choices
  - supplies locked chords and track context
  - presents ranked variants
        |
        v
@peitho/pulse
  - selects a model adapter
  - generates multiple performance candidates
  - converts model-native events to canonical events
  - validates, minimally repairs, scores and ranks candidates
        |
        v
@peitho/array
  - supplies model-free validation and repair primitives
```

Composer labels must be resolved into explicit profiles and controls before the
request crosses into Pulse. Model tensors, tokens and runtime details must not
cross the Pulse boundary. `.contrib/*` remains read-only reference material.

## Model-Neutral Contract

The exact TypeScript contract should be implemented beside the existing Pulse
planner contracts. This is the intended shape:

```ts
type SessionPlayerRole =
  | "guitar"
  | "keys"
  | "strings"
  | "bass"
  | "lead"
  | "drums";

type PlayerTrackContext = {
  role: SessionPlayerRole | "melody" | "counter";
  notes: NoteEvent[];
  locked: boolean;
};

type PlayerRequest = {
  role: SessionPlayerRole;
  bars: number;
  beatsPerBar: number;
  stepsPerBeat: number;
  tempo: number;
  seed: number;
  candidateCount: number;

  key: string;
  scale: ScaleInput;
  chords: ChordEvent[];
  contextTracks: PlayerTrackContext[];

  density: number;
  sync: number;
  rhythm: number;
  intensity: number;
  segmentProfile: SegmentProfile;
  optionProfile: OptionProfile;
  prompt: string;
  keywords: string[];

  constraints: RoleConstraints;
  planner: "magenta" | "midigenai" | "amt";
};

type RawPlayerCandidate = {
  notes: NoteEvent[];
  source: {
    planner: string;
    model?: string;
    modelVersion?: string;
    seed: number;
  };
};

type SessionPlayer = {
  generate(request: PlayerRequest): Promise<RawPlayerCandidate[]>;
};
```

`RoleConstraints` should be a discriminated union. Shared controls stay shared;
role-specific facts do not get flattened into vague strings. Examples include
guitar tuning and fret span, keyboard hand/register ranges, string voice count,
bass range and technique, lead monophony, and drum kit mapping.

The public Pulse pipeline should return ranked candidate reports containing
canonical `NoteEvent[]`, provenance, metrics, repair details and warnings. This
mirrors the melody-generation pipeline rather than inventing another result
format.

## Context And Ensemble Coherence

A player must receive all locked musical context relevant to its decision, not
only an unlabelled `existingNotes` array. At minimum this includes chords, melody,
counter-melody and already accepted player tracks.

Generating every role independently may produce locally plausible parts that do
not form a coherent ensemble. The architecture must therefore allow two paths:

1. generate or regenerate one role while conditioning on locked tracks;
2. generate several roles together when a multi-track model materially improves
   interaction between parts.

Both paths must end in the same per-track Peitho event contracts.

## Model Strategy

No production Session Player model has been selected.

An experimental `POST /pulse/session-player/amt` endpoint now provides the first
model spike for `piano` and `pad`. It uses the Python AMT reference runtime and a
target-program sampling mask. Results must not be treated as a production player
until listening, latency and control-following tests pass.

Composer currently exposes the smallest useful audition path: **Add Piano
Player** conditions AMT on the current arrangement and creates a dynamic track
with playback, mute, solo, gain, instrument selection, removal and MIDI export.
Pad remains endpoint-only until piano output has been judged useful.

| Engine | Relevant capability | Main uncertainty |
| --- | --- | --- |
| Magenta | integrated local baseline for melody and drums | older role-specific models and limited ensemble context |
| MidiGenAI | multi-track symbolic generation plus owned training stack | continuation model lacks Peitho control conditioning |
| AMT | controlled accompaniment and multi-track infilling | Python reference runtime, token adapter and Bun execution remain unproven |

AMT is a strong research candidate for ensemble work, not an assumed Peitho
runtime. Reference source: `.contrib/ai-models/anticipation` (read-only).
MidiGenAI remains available at `.contrib/ai-models/midigenai` (read-only).

Model selection must come from blind listening and measured integration spikes,
not repository descriptions. Different roles may ultimately use different
models.

## Generation Pipeline

```text
resolved player request
  -> selected model generates multiple raw candidates
  -> model events convert to canonical Peitho events
  -> deterministic validation and minimal repair
  -> role realism and musical-context metrics
  -> candidates ranked best-first
  -> Composer receives variants and provenance
```

A deterministic fallback may keep the workflow operational when no model is
available. Fallback output must be labelled honestly and must not be used as
evidence that the AI Session Player is complete.

## Build Order

1. Implement the shared request, candidate and report contracts.
2. Reuse the melody bake-off harness for role-labelled listening fixtures.
3. Spike Magenta, MidiGenAI and AMT against identical bass and keys briefs.
4. Implement the best single-role adapter with candidate ranking and provenance.
5. Add guitar constraints, then strings and drums.
6. Test locked-track regeneration and multi-track ensemble generation.
7. Connect thin Composer adapters without duplicating generation logic.
8. Retain the extracted arpeggiator and pattern players as explicit fallbacks.

Lead generation should reuse the melody pipeline unless testing proves it needs a
separate player model.

## Acceptance Criteria Per Role

- blind listening shows a useful improvement over deterministic fallback
- output follows locked harmony and does not collide with locked tracks
- repeated seeds reproduce results where the model runtime permits it
- candidates provide meaningful musical variation, not trivial mutations
- direction controls cause audible and predictable changes
- repair is minimal and reported; heavily repaired candidates are rejected
- role-specific constraints produce playable or credible performances
- pitch, velocity and timing remain within canonical bounds
- latency and memory are measured on the target local runtime
- MIDI export and playback consume exactly the returned note events
- model, version, sampling controls and seed are preserved as provenance
- Composer contains no duplicated player-generation logic

## Existing Composer Arpeggiator

Current work lives inside `apps/peitho-composer/public/index.html`. Extract it to
reusable TypeScript with explicit pattern, rate and timing inputs plus focused
tests. It becomes a deterministic utility and fallback; it must not define the
AI Session Player contract.
