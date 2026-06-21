import { quantizeToGrid, snapToScale, thinDensity, SCALE_INTERVALS, keyToPitchClass, normalizeScaleName, type NoteEvent } from "@peitho/array";
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

  // Step 4b: merge consecutive same-pitch notes produced by deoverlap into one longer note
  const MAX_MERGE_LEN = 8;
  const mergedSamePitch: NoteEvent[] = [];
  for (const note of working) {
    const prev = mergedSamePitch.at(-1);
    if (prev && prev.midi === note.midi && prev.step + prev.len === note.step) {
      mergedSamePitch[mergedSamePitch.length - 1] = { ...prev, len: Math.min(prev.len + note.len, MAX_MERGE_LEN) };
    } else {
      mergedSamePitch.push(note);
    }
  }
  working = mergedSamePitch;

  // Step 5: snap non-scale pitches to nearest scale tone
  const beforeSnap = working.map((n) => n.midi);
  working = snapToScale(working, request.key, request.scale);
  report.pitchRepairs = working.filter((n, i) => n.midi !== beforeSnap[i]).length;

  // Step 5b: break up runs of 3+ consecutive same-pitch notes by nudging each 3rd+ note one scale step
  const root = keyToPitchClass(request.key);
  const scaleName = normalizeScaleName(request.scale);
  const scaleIntervals = SCALE_INTERVALS[scaleName] ?? SCALE_INTERVALS["major"];
  const scaleSet: number[] = [];
  for (let octave = 0; octave < 11; octave++) {
    for (const interval of scaleIntervals) {
      const midi = octave * 12 + root + interval;
      if (midi >= 0 && midi <= 127) scaleSet.push(midi);
    }
  }
  scaleSet.sort((a, b) => a - b);

  let samePitchRun = 1;
  const varied: NoteEvent[] = working.slice();
  for (let i = 1; i < varied.length; i++) {
    if (varied[i].midi === varied[i - 1].midi) {
      samePitchRun++;
      if (samePitchRun >= 3) {
        const idx = scaleSet.indexOf(varied[i].midi);
        if (idx >= 0) {
          const newMidi = idx < scaleSet.length - 1 ? scaleSet[idx + 1] : scaleSet[idx - 1];
          varied[i] = { ...varied[i], midi: newMidi };
          samePitchRun = 1;
        }
      }
    } else {
      samePitchRun = 1;
    }
  }
  working = varied;

  // Step 6: enforce density — thin if significantly over target
  const targetCount = Math.round(totalSteps * request.density * 0.5);
  if (working.length > targetCount * 1.5) {
    const beforeCount = working.length;
    working = thinDensity(working, request.density, seed);
    report.densityRepairs = beforeCount - working.length;
  }

  return { notes: working, report };
}
