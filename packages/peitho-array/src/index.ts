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

export type ChordTemplate = {
  name: string;
  tones: number[];
};

export type GenerateChordsOptions = {
  key: string;
  scale: ScaleName;
  type: DirectionType;
  bars?: number;
  seed?: number;
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

const HEPTATONIC_INTERVALS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
} as const;

const CHORD_LENGTHS_BY_TYPE: Record<DirectionType, number[]> = {
  Ballad: [2, 2, 3, 4, 4],
  Pop: [1, 1, 2, 2, 2],
  Cinematic: [2, 3, 4, 4, 2],
  "Lo-Fi": [1, 2, 2, 2, 3],
  Ambient: [4, 4, 3, 2],
  "New Wave": [1, 1, 2, 2, 4],
  Electropop: [1, 1, 1, 2, 2],
  Classical: [2, 2, 4, 4],
  Jazz: [1, 2, 2, 3],
  Synth: [1, 2, 2, 4],
  Rock: [1, 1, 2, 4],
  Darkwave: [2, 2, 3, 4],
};

const CHORD_EXTENSION_BY_TYPE: Record<DirectionType, number> = {
  Ballad: 0.6,
  Pop: 0.18,
  Cinematic: 0.65,
  "Lo-Fi": 0.5,
  Ambient: 0.5,
  "New Wave": 0.35,
  Electropop: 0.28,
  Classical: 0.42,
  Jazz: 0.8,
  Synth: 0.36,
  Rock: 0.22,
  Darkwave: 0.52,
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

export function createRng(seed: number): () => number {
  let value = seed >>> 0;

  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let next = Math.imul(value ^ (value >>> 15), 1 | value);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
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

function harmonicScale(scale: ScaleName): readonly number[] {
  return scale === "pentatonic-minor" || scale === "natural-minor"
    ? HEPTATONIC_INTERVALS.minor
    : HEPTATONIC_INTERVALS.major;
}

export function chordPool(key: string, scale: ScaleName): ChordTemplate[] {
  const root = keyToPitchClass(key);
  const harmony = harmonicScale(scale);
  const roots = SCALE_INTERVALS[scale];
  const tonic = 48 + root;
  const out: ChordTemplate[] = [];

  for (const rootStep of roots) {
    const degreeIndex = harmony.indexOf(rootStep);
    if (degreeIndex === -1) continue;

    const third = harmony[(degreeIndex + 2) % harmony.length] + (degreeIndex + 2 >= harmony.length ? 12 : 0);
    const fifth = harmony[(degreeIndex + 4) % harmony.length] + (degreeIndex + 4 >= harmony.length ? 12 : 0);
    const seventh = harmony[(degreeIndex + 6) % harmony.length] + (degreeIndex + 6 >= harmony.length ? 12 : 0);
    const second = harmony[(degreeIndex + 1) % harmony.length] + (degreeIndex + 1 >= harmony.length ? 12 : 0);
    const thirdInterval = third - rootStep;
    const fifthInterval = fifth - rootStep;
    const seventhInterval = seventh - rootStep;
    const secondInterval = second - rootStep;
    const rootName = NOTE_NAMES[(root + rootStep) % 12];
    const base = thirdInterval === 4 ? "" : thirdInterval === 3 ? "m" : thirdInterval <= 2 ? "sus2" : "sus4";
    const fifthQuality = fifthInterval === 6 ? "b5" : fifthInterval === 8 ? "#5" : "";
    const triad = [tonic + rootStep, tonic + third, tonic + fifth];

    out.push({ name: `${rootName}${base}${fifthQuality}`, tones: triad });

    if ((base === "" || base === "m") && fifthQuality === "") {
      let seventhSuffix: string | null = null;
      if (seventhInterval === 11) seventhSuffix = base === "" ? "maj7" : "m(maj7)";
      else if (seventhInterval === 10) seventhSuffix = base === "" ? "7" : "m7";

      if (seventhSuffix) {
        out.push({
          name: `${rootName}${seventhSuffix}`,
          tones: [tonic + rootStep, tonic + third, tonic + fifth, tonic + seventh],
        });
      }

      out.push({
        name: `${rootName}${base}add9`,
        tones: [tonic + rootStep, tonic + third, tonic + fifth, tonic + rootStep + secondInterval + 12],
      });
    } else if (fifthQuality === "b5") {
      out.push({
        name: `${rootName}m7b5`,
        tones: [tonic + rootStep, tonic + third, tonic + fifth, tonic + seventh],
      });
    }
  }

  return out;
}

export function generateChords(options: GenerateChordsOptions): ChordEvent[] {
  const root = keyToPitchClass(options.key);
  const harmony = harmonicScale(options.scale);
  const rng = options.seed == null ? Math.random : createRng(options.seed);
  const lengths = CHORD_LENGTHS_BY_TYPE[options.type];
  const extensionProbability = CHORD_EXTENSION_BY_TYPE[options.type];
  const totalHalfBars = (options.bars ?? 8) * 2;
  const segments: number[] = [];
  let remaining = totalHalfBars;

  while (remaining > 0) {
    let length = lengths[Math.floor(rng() * lengths.length)];
    if (length > remaining) length = remaining;
    segments.push(length);
    remaining -= length;
  }

  let start = 0;

  return segments.map((len) => {
    const degree = Math.floor(rng() * harmony.length);
    const semitone = harmony[degree];
    const noteName = NOTE_NAMES[(root + semitone) % 12];
    let suffix =
      options.scale === "pentatonic-minor" || options.scale === "natural-minor"
        ? ["m", "m7b5", "", "m7", "m7", "maj7", "7"][degree % 7]
        : ["", "m7", "m7", "add9", "7", "m7", "m7b5"][degree % 7];

    if (rng() < extensionProbability * 0.4) {
      suffix = ["sus4", "add9", "9sus4", "7"][Math.floor(rng() * 4)];
    }

    if (rng() > extensionProbability) {
      if (suffix === "maj7" || suffix === "add9" || suffix === "7" || suffix === "9sus4") suffix = "";
      else if (suffix === "m7") suffix = "m";
      else if (suffix === "m7b5") suffix = "dim";
    }

    const tones = [
      48 + semitone,
      48 + harmony[(degree + 2) % harmony.length],
      48 + harmony[(degree + 4) % harmony.length],
    ];

    if (rng() < extensionProbability) tones.push(60 + semitone);

    const chord = { name: `${noteName}${suffix}`, len, start, tones };
    start += len;
    return chord;
  });
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
