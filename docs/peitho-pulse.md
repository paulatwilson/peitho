# Peitho-Pulse: Melody & Session Player Generation

`peitho-pulse` is the local AI generation engine for Peitho. Its primary role is to run pre-trained symbolic models to generate melodies, counter-melodies, and instrument parts that are conditioned on chord progressions, user-edited notes, and real-time macro controls.

The entire application runs **locally under Bun** and is **100% Python-free**. It supports two complementary local planning engines:

1.  **Magenta (Lightweight/Zero-Setup)**: Runs `@magenta/music` via TensorFlow.js in Bun.
2.  **Anticipatory Music Transformer (High-Fidelity/Ensemble)**: Runs AMT via TyTorch (libtorch C++ Metal core).

---

## 1. Local Architecture

`peitho-pulse` implements two parallel planner interfaces in the Bun backend:
`PulsePlanner` for drums and `MelodyPlanner` for melody and counter. The
`/pulse/generate` endpoint routes on `target` to select the correct path.

```
                          +-----------------------------------+
                          |        peitho-composer UI         |
                          +-----------------------------------+
                                            |
                          +-----------+-----+-----+-----------+
                          |                             |
                  (PulseRequest)           (MelodyGenerationRequest)
                  target: drums            target: melody | counter
                          |                             |
                          v                             v
              +----------------------+   +------------------------------+
              |  MagentaPulsePlanner |   |   MelodyPlanner pipeline     |
              |  (TF.js / DrumsRNN)  |   |                              |
              |  - drums patterns    |   |  enrichChords()              |
              +----------------------+   |  planner.generate()          |
                          |              |  (MagentaMelodyPlanner /     |
                          |              |   future: MidiGenAI, AMT)    |
                          |              |  repairMelodyCandidate()     |
                          |              |  scoreMelodyCandidate()      |
                          |              |  sort best-first             |
                          |              +------------------------------+
                          |                             |
                  (PeithoPattern)       (MelodyCandidateReport[])
                          |                             |
                          +-------------+---------------+
                                        v
                          +-----------------------------------+
                          |        peitho-composer UI         |
                          |   populates variant slots / MIDI  |
                          +-----------------------------------+
```

`peitho-array` provides deterministic repair primitives used inside the melody
pipeline (quantise, scale snap, density limits). It remains model-free.

---

## 2. Planner Specifications

### 2.1 MagentaPulsePlanner (Active — Drums)

*   **Role**: Drum pattern generation via `PulsePlanner` interface.
*   **Models**: `DrumsRNN` — 1-bar and 8-bar drum patterns.
*   **Runtime**: `@magenta/music` under TensorFlow.js with native Node bindings in Bun.
*   **Local Checkpoints**: Served locally by Composer dev server rather than Google storage.

### 2.2 MagentaMelodyPlanner (Active — Melody / Counter)

*   **Role**: Multi-candidate melody and counter generation via `MelodyPlanner` interface.
*   **Model**: `ImprovRNN` (`chord_pitches_improv` checkpoint) — monophonic, chord-conditioned.
*   **Candidates**: generates `candidateCount` candidates via temperature variation (base
    derived from density + sync; ±0.12 spread across candidates). Each candidate receives a
    deterministic seed derived from the request seed.
*   **Chord conditioning**: Pulse enriches `ChordEvent[]` to `EnrichedChordEvent[]` before
    the planner call. Planner maps half-bar chord events to ImprovRNN chord symbols.
*   **Counter primer**: locked melody notes are converted to an ImprovRNN primer sequence
    when `target === "counter"`.
*   **Runtime**: same `@magenta/music` / TF.js stack as 2.1 above.

### 2.3 The TyTorch / AMT Planner (Stage 2 — High-Fidelity, Planned)

*   **Role**: Interactive, multi-instrument ensemble playing.
*   **Source Code**: `.contrib/ai-models/anticipation` (Stanford CRFM) — reference only.
*   **Model Checkpoint**: `stanford-crfm/music-medium-800k` (Safetensors/PyTorch binary).
*   **Runtime**: `astrohackerlabs/tytorch` loading weights natively in TS/Bun, binding to the
    pre-compiled C++ **libtorch** library (`libtorch.dylib`) on macOS to execute on Metal GPU.
    TyTorch currently lacks slice/cat/argmax/model-loading; spike required before this planner
    can be implemented.
*   **Why AMT**: Multi-track infilling transformer. Takes locked chord track and generates
    guitar, bass, piano, and synth parts in parallel with cohesive cross-instrument context.

### 2.4 AMT Reference Spike (Experimental)

`POST /pulse/session-player/amt` is a research endpoint for proving AMT before a
native runtime or full Session Player architecture is built. It accepts locked
Peitho chords, optional locked note tracks and one target role: `piano` or `pad`.
The endpoint invokes the read-only Python reference implementation and masks
generated note tokens to the requested General MIDI program.

Composer's **Add Piano Player** action sends the current chords and existing
note tracks to this endpoint, then creates a separate playable/exportable track
from the returned notes. The UI intentionally exposes only piano during this
first listening spike; the endpoint also accepts `pad`.

This proves only whether AMT can generate a useful same-timeline part around
Peitho controls. It is not the TyTorch planner described above, does not interpret
style language and currently loads the model in a fresh worker per request.

---

## 3. API Contracts

### 3.1 PulseRequest (drums)

```typescript
export type PulseTarget = "chords" | "drums" | "melody" | "counter" | "accompaniment";

export type PulseRequest = {
  target: PulseTarget;
  key: string;
  scale: string;
  bars: number;
  seed?: number;
  density: number;
  split: number;
  sync: number;
  rhythm: number;
  chords?: ChordEvent[];
  melody?: NoteEvent[];
};
```

### 3.2 MelodyGenerationRequest (melody / counter)

Used when `target` is `"melody"` or `"counter"`. Composer resolves presets and
macros before sending; Pulse enriches chords internally.

```typescript
type MelodyGenerationRequest = {
  target: "melody" | "counter";
  bars: number;
  beatsPerBar: number;
  stepsPerBeat: number;
  tempo: number;
  key: string;
  scale: string;
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
  melody?: NoteEvent[];       // required for counter; locked melody
  existingNotes?: NoteEvent[]; // user-authored infilling context
  planner: "magenta" | "midigenai" | "amt";
};
```

Response: `MelodyCandidateReport[]` sorted best-first. Each entry includes repaired
`notes`, `source` provenance, `score`, 10-metric `metrics` object, `repair` report
and `warnings`.

---

## 4. Mapping Slider Controls & Keywords

Whether using Magenta or TyTorch/AMT, the user's frontend variables shape the generation:

### 4.1 Sliders (Density, Split, Syncopation)
*   **Density & Split**:
    *   Sets note-length bounds and the threshold for the procedural `thinDensity()` repair pass.
*   **Syncopation**:
    *   Adjusts model temperature/top-p. High syncopation increases probability of choosing off-beat subdivisions and syncopated time-shifts.

### 4.2 Pulse Refinement (Keywords)
*   Keywords (e.g. *"Lyrical"*, *"Virtuoso"*, *"Minimalist"*) are processed by the local **ACE-Step 1.5 Conductor** (running via MLX) to output arrangement constraints (e.g., restricting pitch ranges or phrase intervals) before running the planners.
