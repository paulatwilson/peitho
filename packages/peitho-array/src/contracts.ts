export type ScaleName = "pentatonic-major" | "pentatonic-minor" | "major" | "natural-minor";
export type DisplayScaleName =
  | "Pentatonic Major"
  | "Pentatonic Minor"
  | "Heptatonic Major"
  | "Heptatonic Natural Minor";
export type ScaleInput = ScaleName | DisplayScaleName;

export type MacroSettings = { density: number; split: number; sync: number; rhythm: number };
export type NoteEvent = { step: number; len: number; midi: number; vel?: number };
export type ChordEvent = { name: string; start: number; len: number; tones: number[] };
export type ChordTemplate = { name: string; tones: number[] };
export type ProgressionProfile = {
  start?: "tonic" | "any";
  cadence?: "none" | "soft" | "strong" | "loop";
  tension?: number;
  repetition?: number;
};
export type ArrayChordCount = 8 | 16;

export type GenerateChordsOptions = {
  key: string;
  scale: ScaleInput;
  bars?: number;
  seed?: number;
  chordLengths?: number[];
  chordCount?: number;
  extensionProbability?: number;
  progressionProfile?: ProgressionProfile;
};

export type SegmentProfile = { density: number; register: number; length: number; sync: number };
export type OptionEnvelope = "rise" | "fall" | "swell" | "flat" | "sparse" | "alternate";
export type OptionProfile = { envelope: OptionEnvelope; length: number };
export type GenerateMonoOptions = MacroSettings & {
  key: string;
  scale: ScaleInput;
  register: [number, number];
  sparse: number;
  counter?: boolean;
  steps?: number;
  stepsPerBar?: number;
  seed: number;
  segmentProfile?: Partial<SegmentProfile>;
  optionProfile?: Partial<OptionProfile>;
};

export type DrumPattern =
  | "Basic 8th-Note"
  | "Four-on-the-Floor"
  | "Syncopated"
  | "Slow-Burn & 6/8 Fills"
  | "Gated-Reverb Drive"
  | "Driving 16th Open Hat"
  | "Jazz Swing"
  | "Funk Pocket"
  | "Half-Time Soul"
  | "Lo-Fi Shuffle"
  | "Punk Blast";
export type DrumPatternEvents = { kick: number[]; snare: number[]; hat: number[]; open: number[] };
export type MidiTrack = { notes: NoteEvent[]; channel: number };
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
export type PatternConfig = { bars: number; beatsPerBar?: number; stepsPerBeat?: number };
