# Peitho Roadmap

Current code truth belongs in [`PEITHO.md`](./PEITHO.md). This file contains only
planned work. A listed technology is not an architectural commitment until a
working spike proves it.

## Product Goal

Build a focused symbolic music sketchpad that gets useful, editable material into
a DAW quickly. Peitho generates MIDI-ready structure; it does not replace sound
design, arrangement or mixing.

Composer may constrain sketches to 8 bars and 4/4. Reusable engines must not
inherit those product limits unless an explicit request supplies them.

## Package Direction

```text
Composer: presets, workflow, editing, playback, export
    -> Pulse: optional model inference and adapters
        -> Array: contracts, theory, deterministic generation and repair
```

## Near-Term Work

### 1. Finish Reuse-First Refactor

- [x] Split Composer server routing from static serving.
- [x] Split Pulse contracts, repair and Magenta adapter.
- [x] Extract Array public contracts.
- [ ] Split Array theory, harmony, melody, rhythm and MIDI modules.
- [ ] Split Composer presets, chord conversion and browser facade.
- [ ] Extract arpeggiator/session-player logic from UI file.
- [ ] Add browser workflow tests.

### 2. Prove Musical Value

- [ ] Create fixed musical briefs and seed fixtures.
- [ ] Compare generated clips through structured listening sessions.
- [ ] Record accepted/rejected outputs and reasons.
- [ ] Improve generation only where listening evidence shows failure.

### 3. Complete Existing Pulse Path

- [ ] Decide whether Pulse owns only chords or all generation stages.
- [ ] If retained, connect Composer melody/counter/drum actions to
  `/pulse/generate`.
- [ ] Host Magenta checkpoints locally or remove Magenta runtime.
- [ ] Add endpoint validation, timeout and cancellation.
- [ ] Add browser-visible loading and failure states.

### 4. Persistence

- [ ] Define project/session contract using canonical symbolic data.
- [ ] Add undo/redo before durable persistence.
- [ ] Add TokenMusicStream import/export only at storage boundaries.

## Session Players

Build deterministic players before model-backed players:

1. arpeggiator
2. root/fifth bass
3. chord comping
4. string voice leading
5. guitar strumming/fingerpicking
6. walking bass and fills

Each player must accept explicit context and return `NoteEvent[]`. See
[`session-players.md`](./session-players.md).

## Research Backlog

These require isolated spikes. None is implemented:

- Anticipatory Music Transformer for controlled infilling
- TyTorch/libtorch compatibility with Bun and available checkpoints
- ACE-Step planner output suitability for symbolic arrangement
- MLX or Node-API model execution on Apple Silicon

Spike acceptance criteria:

- real checkpoint loads locally
- licence and provenance documented
- deterministic fixture or reproducible sampling config
- output converts cleanly to Peitho contracts
- measured latency and memory
- no model/runtime leakage into Array

Reject research path when required assumptions fail. Do not write hypothetical
bindings or performance numbers into implementation docs.

## Non-Goals

- finished audio generation
- model dependencies inside Array
- Composer preset catalogues inside engine packages
- direct application imports from `.contrib/*`
- broad model integration before core workflow validation
