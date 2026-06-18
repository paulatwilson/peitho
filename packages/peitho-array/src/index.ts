export type ScaleName =
  | "pentatonic-major"
  | "pentatonic-minor"
  | "major"
  | "natural-minor";

export const DIRECTION_TYPES = [
  "Ballad",
  "Pop",
  "Cinematic",
  "Lo-Fi",
  "Ambient",
  "New Wave",
  "Electropop",
  "Classical",
  "Jazz",
  "Synth",
  "Rock",
  "Darkwave",
] as const;

export const SEGMENTS = [
  "Intro",
  "Verse",
  "Pre-Chorus",
  "Chorus",
  "Hook",
  "Bridge",
  "Middle-Eight",
  "Breakdown",
  "Outro",
] as const;

export const OPTIONS = [
  "Rousing Crescendo",
  "Moody Wind Down",
  "Gentle Swell",
  "Steady Groove",
  "Sparse Reflection",
  "Driving Pulse",
  "Tension Lift",
  "Release Drop",
  "Nocturne Drift",
  "Angular Push",
  "Anthem Rise",
  "Minimal Loop",
] as const;

export type DirectionType = (typeof DIRECTION_TYPES)[number];
export type SegmentName = (typeof SEGMENTS)[number];
export type OptionName = (typeof OPTIONS)[number];

export type MacroSettings = {
  density: number;
  split: number;
  sync: number;
  rhythm: number;
};

export type DirectionSelection = {
  type: DirectionType;
  segment: SegmentName;
  option: OptionName;
  scale?: ScaleName;
};

export type NoteEvent = {
  step: number;
  len: number;
  midi: number;
  vel?: number;
};

export type ChordEvent = {
  name: string;
  start: number;
  len: number;
  tones: number[];
};

export type PeithoPattern = {
  bars: number;
  beatsPerBar: number;
  stepsPerBeat: number;
  stepsPerBar: number;
  steps: number;
  chords: ChordEvent[];
  melody: NoteEvent[];
  counter: NoteEvent[];
  drums: Record<string, number[]>;
};

export type PatternConfig = {
  bars: number;
  beatsPerBar?: number;
  stepsPerBeat?: number;
};

export const DEFAULT_DIRECTION: DirectionSelection = {
  type: "Ballad",
  segment: "Verse",
  option: "Rousing Crescendo",
  scale: "pentatonic-major",
};

type MacroVector = {
  density: number;
  split: number;
  sync: number;
  rhythm: number;
};

const TYPE_MACROS: Record<DirectionType, MacroVector> = {
  Ballad: { density: 0.42, split: 0.55, sync: 0.22, rhythm: 0.4 },
  Pop: { density: 0.62, split: 0.45, sync: 0.4, rhythm: 0.5 },
  Cinematic: { density: 0.5, split: 0.6, sync: 0.25, rhythm: 0.55 },
  "Lo-Fi": { density: 0.55, split: 0.4, sync: 0.55, rhythm: 0.6 },
  Ambient: { density: 0.3, split: 0.7, sync: 0.18, rhythm: 0.35 },
  "New Wave": { density: 0.58, split: 0.42, sync: 0.48, rhythm: 0.62 },
  Electropop: { density: 0.66, split: 0.38, sync: 0.44, rhythm: 0.58 },
  Classical: { density: 0.46, split: 0.58, sync: 0.18, rhythm: 0.42 },
  Jazz: { density: 0.58, split: 0.5, sync: 0.66, rhythm: 0.72 },
  Synth: { density: 0.6, split: 0.46, sync: 0.36, rhythm: 0.56 },
  Rock: { density: 0.64, split: 0.4, sync: 0.28, rhythm: 0.54 },
  Darkwave: { density: 0.5, split: 0.55, sync: 0.34, rhythm: 0.58 },
};

const SEGMENT_MACROS: Record<SegmentName, Partial<MacroVector>> = {
  Intro: { density: -0.15, split: -0.05, sync: -0.05, rhythm: -0.05 },
  Verse: { density: 0, split: 0, sync: 0, rhythm: 0 },
  "Pre-Chorus": { density: 0.08, split: -0.05, sync: 0.05, rhythm: 0.05 },
  Chorus: { density: 0.18, split: -0.1, sync: 0.08, rhythm: 0.08 },
  Hook: { density: 0.16, split: -0.12, sync: 0.1, rhythm: 0.1 },
  Bridge: { density: 0, split: 0.05, sync: 0.05, rhythm: 0.1 },
  "Middle-Eight": { density: 0.03, split: 0.08, sync: 0.06, rhythm: 0.12 },
  Breakdown: { density: -0.22, split: 0.14, sync: 0.04, rhythm: -0.04 },
  Outro: { density: -0.18, split: 0.1, sync: -0.05, rhythm: -0.05 },
};

const OPTION_MACROS: Record<OptionName, Partial<MacroVector>> = {
  "Rousing Crescendo": { density: 0.06, sync: 0.05, rhythm: 0.05 },
  "Moody Wind Down": { density: -0.08, sync: -0.05, rhythm: 0 },
  "Gentle Swell": { density: -0.02, sync: 0, rhythm: 0 },
  "Steady Groove": { density: 0.05, sync: 0.08, rhythm: -0.05 },
  "Sparse Reflection": { density: -0.18, sync: -0.08, rhythm: -0.1 },
  "Driving Pulse": { density: 0.08, sync: 0.06, rhythm: 0.08 },
  "Tension Lift": { density: 0.04, sync: 0.04, rhythm: 0.12 },
  "Release Drop": { density: -0.1, sync: 0.02, rhythm: -0.02 },
  "Nocturne Drift": { density: -0.12, sync: -0.04, rhythm: -0.04 },
  "Angular Push": { density: 0.04, sync: 0.14, rhythm: 0.16 },
  "Anthem Rise": { density: 0.1, sync: 0.03, rhythm: 0.08 },
  "Minimal Loop": { density: -0.2, sync: -0.02, rhythm: -0.08 },
};

export const SCALE_INTERVALS: Record<ScaleName, number[]> = {
  "pentatonic-major": [0, 2, 4, 7, 9],
  "pentatonic-minor": [0, 3, 5, 7, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  "natural-minor": [0, 2, 3, 5, 7, 8, 10],
};

export const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function keyToPitchClass(key: string): number {
  const index = NOTE_NAMES.indexOf(key as (typeof NOTE_NAMES)[number]);
  if (index === -1) throw new Error(`Unknown key: ${key}`);
  return index;
}

export function scaleMidi(key: string, scale: ScaleName, lo: number, hi: number): number[] {
  const root = keyToPitchClass(key);
  const intervals = new Set(SCALE_INTERVALS[scale].map((n) => (n + root) % 12));
  const notes: number[] = [];

  for (let midi = lo; midi <= hi; midi += 1) {
    if (intervals.has(midi % 12)) notes.push(midi);
  }

  return notes;
}

export function recommendMacros(selection: DirectionSelection): MacroSettings {
  const base = TYPE_MACROS[selection.type];
  const segment = SEGMENT_MACROS[selection.segment];
  const option = OPTION_MACROS[selection.option];
  const scaleShift = selection.scale?.startsWith("pentatonic") ? -0.05 : 0.05;

  return {
    density: clamp(base.density + (segment.density ?? 0) + (option.density ?? 0), 0.05, 1),
    split: clamp(base.split + (segment.split ?? 0) + (option.split ?? 0), 0, 1),
    sync: clamp(base.sync + (segment.sync ?? 0) + (option.sync ?? 0), 0, 1),
    rhythm: clamp(
      base.rhythm + (segment.rhythm ?? 0) + (option.rhythm ?? 0) + scaleShift,
      0,
      1,
    ),
  };
}

export function createEmptyPattern(config: PatternConfig): PeithoPattern {
  const beatsPerBar = config.beatsPerBar ?? 4;
  const stepsPerBeat = config.stepsPerBeat ?? 4;
  const stepsPerBar = beatsPerBar * stepsPerBeat;

  return {
    bars: config.bars,
    beatsPerBar,
    stepsPerBeat,
    stepsPerBar,
    steps: config.bars * stepsPerBar,
    chords: [],
    melody: [],
    counter: [],
    drums: {},
  };
}
