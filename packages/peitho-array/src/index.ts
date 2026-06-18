export type ScaleName =
  | "pentatonic-major"
  | "pentatonic-minor"
  | "major"
  | "natural-minor";

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
