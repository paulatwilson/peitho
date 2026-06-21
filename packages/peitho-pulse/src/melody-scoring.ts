import { SCALE_INTERVALS, keyToPitchClass, normalizeScaleName, type NoteEvent } from "@peitho/array";
import { activeChordAt } from "./chord-enrichment";
import type {
  EnrichedChordEvent,
  InternalMelodyRequest,
  MelodyCandidateReport,
  MelodyRepairReport,
  RawMelodyCandidate,
} from "./melody-contracts";

const MELODY_REGISTER_LO = 58;
const MELODY_REGISTER_HI = 84;
const COUNTER_REGISTER_LO = 46;
const COUNTER_REGISTER_HI = 76;

function scalePitchClasses(key: string, scale: import("@peitho/array").ScaleInput): Set<number> {
  const root = keyToPitchClass(key);
  const scaleName = normalizeScaleName(scale);
  return new Set(SCALE_INTERVALS[scaleName].map((i) => (root + i) % 12));
}

function chordTonePitchClasses(chord: EnrichedChordEvent): Set<number> {
  return new Set(chord.tones.map((t) => t % 12));
}

function chordToneDownbeatRatio(notes: NoteEvent[], chords: EnrichedChordEvent[], stepsPerBeat: number): number {
  const downbeats = notes.filter((n) => n.step % stepsPerBeat === 0);
  if (!downbeats.length) return 0;

  const hits = downbeats.filter((n) => {
    const chord = activeChordAt(n.step, chords);
    if (!chord) return false;
    return chordTonePitchClasses(chord).has(n.midi % 12);
  });

  return hits.length / downbeats.length;
}

function scaleOrChordToneRatio(
  notes: NoteEvent[],
  chords: EnrichedChordEvent[],
  key: string,
  scale: import("@peitho/array").ScaleInput,
): number {
  if (!notes.length) return 0;
  const scalePCs = scalePitchClasses(key, scale);

  const hits = notes.filter((n) => {
    if (scalePCs.has(n.midi % 12)) return true;
    const chord = activeChordAt(n.step, chords);
    return chord ? chordTonePitchClasses(chord).has(n.midi % 12) : false;
  });

  return hits.length / notes.length;
}

function registerFit(notes: NoteEvent[], lo: number, hi: number): number {
  if (!notes.length) return 0;
  const inRange = notes.filter((n) => n.midi >= lo && n.midi <= hi);
  return inRange.length / notes.length;
}

function densityFit(notes: NoteEvent[], totalSteps: number, targetDensity: number): number {
  const targetCount = totalSteps * targetDensity * 0.5;
  if (targetCount <= 0) return 0;
  const ratio = notes.length / targetCount;
  return Math.max(0, 1 - Math.abs(ratio - 1));
}

function syncFit(notes: NoteEvent[], stepsPerBeat: number, targetSync: number): number {
  if (!notes.length) return 1;
  const offBeat = notes.filter((n) => n.step % stepsPerBeat !== 0);
  const offBeatRatio = offBeat.length / notes.length;
  const targetOff = targetSync * 0.7;
  return Math.max(0, 1 - Math.abs(offBeatRatio - targetOff) * 2);
}

function rhythmFit(notes: NoteEvent[], targetRhythm: number): number {
  if (notes.length < 2) return 0.5;
  const durations = notes.map((n) => n.len);
  const unique = new Set(durations).size;
  const normalised = Math.min(1, unique / 5);
  return Math.max(0, 1 - Math.abs(normalised - targetRhythm));
}

function contourContinuity(notes: NoteEvent[]): number {
  if (notes.length < 2) return 1;
  const sorted = notes.slice().sort((a, b) => a.step - b.step);
  let bigLeaps = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i].midi - sorted[i - 1].midi) > 7) bigLeaps++;
  }
  return Math.max(0, 1 - bigLeaps / (sorted.length - 1));
}

function motifReuse(notes: NoteEvent[]): number {
  if (notes.length < 4) return 0;
  const sorted = notes.slice().sort((a, b) => a.step - b.step);
  const intervals = sorted.slice(1).map((n, i) => n.midi - sorted[i].midi);

  let matches = 0;
  const windowSize = 3;
  for (let i = 0; i <= intervals.length - windowSize * 2; i++) {
    const pattern = intervals.slice(i, i + windowSize).join(",");
    for (let j = i + windowSize; j <= intervals.length - windowSize; j++) {
      if (intervals.slice(j, j + windowSize).join(",") === pattern) {
        matches++;
        break;
      }
    }
  }

  return Math.min(1, matches / Math.max(1, intervals.length - windowSize));
}

function phraseResolution(notes: NoteEvent[], chords: EnrichedChordEvent[], stepsPerBeat: number, totalSteps: number): number {
  if (!notes.length) return 0;
  const sorted = notes.slice().sort((a, b) => a.step - b.step);
  const last = sorted.at(-1)!;

  const onStrongBeat = (last.step + last.len) % stepsPerBeat === 0 || last.step % stepsPerBeat === 0;
  const chord = activeChordAt(last.step, chords);
  const onChordTone = chord ? chordTonePitchClasses(chord).has(last.midi % 12) : false;
  const nearEnd = (last.step + last.len) >= totalSteps * 0.85;

  return (onStrongBeat ? 0.35 : 0) + (onChordTone ? 0.45 : 0) + (nearEnd ? 0.2 : 0);
}

function repairPenalty(repair: MelodyRepairReport): number {
  const total = repair.removedEvents + repair.pitchRepairs + repair.overlapRepairs + repair.densityRepairs;
  return Math.max(0, 1 - total * 0.03);
}

export function scoreMelodyCandidate(
  notes: NoteEvent[],
  request: InternalMelodyRequest,
  repair: MelodyRepairReport,
  source: RawMelodyCandidate["source"],
  existingMelody?: NoteEvent[],
): MelodyCandidateReport {
  const warnings: string[] = [];
  const totalSteps = request.bars * request.beatsPerBar * request.stepsPerBeat;
  const isCounter = request.target === "counter";

  const registerLo = isCounter ? COUNTER_REGISTER_LO : MELODY_REGISTER_LO;
  const registerHi = isCounter ? COUNTER_REGISTER_HI : MELODY_REGISTER_HI;

  const validStructure = notes.length > 0;
  if (!validStructure) warnings.push("empty candidate");

  const ctdr = chordToneDownbeatRatio(notes, request.chords, request.stepsPerBeat);
  const sctr = scaleOrChordToneRatio(notes, request.chords, request.key, request.scale);
  const regFit = registerFit(notes, registerLo, registerHi);
  const denFit = densityFit(notes, totalSteps, request.density);
  const syncF = syncFit(notes, request.stepsPerBeat, request.sync);
  const rhythmF = rhythmFit(notes, request.rhythm);
  const contour = contourContinuity(notes);
  const motif = motifReuse(notes);
  const resolution = phraseResolution(notes, request.chords, request.stepsPerBeat, totalSteps);

  let melCtrSep: number | undefined;
  if (isCounter && existingMelody && existingMelody.length) {
    const melPCs = new Set(existingMelody.map((n) => n.midi % 12));
    const separate = notes.filter((n) => !melPCs.has(n.midi % 12));
    melCtrSep = notes.length > 0 ? separate.length / notes.length : 1;
    if (melCtrSep < 0.3) warnings.push("low melody/counter separation");
  }

  if (ctdr < 0.3) warnings.push("weak chord-tone downbeat alignment");
  if (sctr < 0.7) warnings.push("many out-of-scale pitches");
  if (regFit < 0.6) warnings.push("notes outside expected register");

  const penalty = repairPenalty(repair);

  const score =
    (ctdr * 0.2 +
      sctr * 0.15 +
      regFit * 0.1 +
      denFit * 0.1 +
      syncF * 0.1 +
      rhythmF * 0.08 +
      contour * 0.12 +
      motif * 0.07 +
      resolution * 0.08 +
      (melCtrSep !== undefined ? melCtrSep * 0.1 : 0)) *
    penalty *
    (validStructure ? 1 : 0);

  return {
    notes,
    source,
    score,
    metrics: {
      validStructure,
      chordToneDownbeatRatio: ctdr,
      scaleOrChordToneRatio: sctr,
      registerFit: regFit,
      densityFit: denFit,
      syncFit: syncF,
      rhythmFit: rhythmF,
      contourContinuity: contour,
      motifReuse: motif,
      phraseResolution: resolution,
      ...(melCtrSep !== undefined ? { melodyCounterSeparation: melCtrSep } : {}),
    },
    repair,
    warnings,
  };
}
