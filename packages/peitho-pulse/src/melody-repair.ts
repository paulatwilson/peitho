import { quantizeToGrid, snapToScale, thinDensity, type NoteEvent } from "@peitho/array";
import type { MelodyGenerationRequest, MelodyRepairReport } from "./melody-contracts";

const MIDI_LO = 0;
const MIDI_HI = 127;
const VEL_LO = 80;
const VEL_HI = 127;

export function repairMelodyCandidate(
  notes: NoteEvent[],
  request: MelodyGenerationRequest | { bars: number; beatsPerBar: number; stepsPerBeat: number; key: string; scale: import("@peitho/array").ScaleInput; density: number },
  seed: number,
): { notes: NoteEvent[]; report: MelodyRepairReport } {
  const report: MelodyRepairReport = {
    removedEvents: 0,
    quantisedEvents: 0,
    pitchRepairs: 0,
    overlapRepairs: 0,
    densityRepairs: 0,
    envelopeRepairs: 0,
  };

  const totalSteps = request.bars * request.beatsPerBar * request.stepsPerBeat;

  // Step 1: reject malformed or non-finite events
  let working = notes.filter((n) => {
    const ok =
      Number.isFinite(n.step) &&
      Number.isFinite(n.len) &&
      Number.isFinite(n.midi) &&
      n.step >= 0 &&
      n.len >= 1 &&
      n.midi >= MIDI_LO &&
      n.midi <= MIDI_HI;
    if (!ok) report.removedEvents++;
    return ok;
  });

  // Step 2: clamp pitch, velocity, step and duration to valid range
  working = working.map((n) => {
    const step = Math.max(0, Math.min(totalSteps - 1, Math.round(n.step)));
    const len = Math.max(1, Math.min(totalSteps - step, Math.round(n.len)));
    const midi = Math.max(MIDI_LO, Math.min(MIDI_HI, Math.round(n.midi)));
    const vel = n.vel !== undefined ? Math.max(VEL_LO, Math.min(VEL_HI, Math.round(n.vel))) : undefined;
    return { ...n, step, len, midi, vel };
  });

  // Step 3: quantise timing to the step grid
  const stepsPerBeat = request.stepsPerBeat;
  const beforeQuantise = working.map((n) => ({ step: n.step, len: n.len }));
  working = quantizeToGrid(working, stepsPerBeat);
  report.quantisedEvents = working.filter((n, i) => {
    const b = beforeQuantise[i];
    return n.step !== b.step || n.len !== b.len;
  }).length;

  // Step 4: sort and resolve monophonic overlaps (later notes truncate earlier)
  working = working.slice().sort((a, b) => a.step - b.step || a.midi - b.midi);
  const deoverlapped: NoteEvent[] = [];
  for (const note of working) {
    const prev = deoverlapped.at(-1);
    if (prev && prev.step + prev.len > note.step) {
      const truncatedLen = note.step - prev.step;
      if (truncatedLen < 1) {
        report.overlapRepairs++;
        continue;
      }
      deoverlapped[deoverlapped.length - 1] = { ...prev, len: truncatedLen };
      report.overlapRepairs++;
    }
    deoverlapped.push(note);
  }
  working = deoverlapped;

  // Step 5: snap non-scale pitches to nearest scale tone
  const beforeSnap = working.map((n) => n.midi);
  working = snapToScale(working, request.key, request.scale);
  report.pitchRepairs = working.filter((n, i) => n.midi !== beforeSnap[i]).length;

  // Step 6: enforce density — thin if significantly over target
  const targetCount = Math.round(totalSteps * request.density * 0.5);
  if (working.length > targetCount * 1.5) {
    const beforeCount = working.length;
    working = thinDensity(working, request.density, seed);
    report.densityRepairs = beforeCount - working.length;
  }

  return { notes: working, report };
}
