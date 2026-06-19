export type ScaleName =
  | "pentatonic-major"
  | "pentatonic-minor"
  | "major"
  | "natural-minor";

export type DisplayScaleName =
  | "Pentatonic Major"
  | "Pentatonic Minor"
  | "Heptatonic Major"
  | "Heptatonic Natural Minor";

export type ScaleInput = ScaleName | DisplayScaleName;

export type MacroSettings = {
  density: number;
  split: number;
  sync: number;
  rhythm: number;
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
  scale: ScaleInput;
  bars?: number;
  seed?: number;
  chordLengths?: number[];
  extensionProbability?: number;
};

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
  | "Driving 16th Open Hat";

export type DrumPatternEvents = {
  kick: number[];
  snare: number[];
  hat: number[];
  open: number[];
};

export type MidiTrack = {
  notes: NoteEvent[];
  channel: number;
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

export type SegmentProfile = {
  density: number;
  register: number;
  length: number;
  sync: number;
};

export type OptionEnvelope = "rise" | "fall" | "swell" | "flat" | "sparse" | "alternate";

export type OptionProfile = {
  envelope: OptionEnvelope;
  length: number;
};

const DEFAULT_CHORD_LENGTHS = [1, 1, 2, 2, 2, 3, 4];
const DEFAULT_EXTENSION_PROBABILITY = 0.35;
const DEFAULT_SEGMENT_PROFILE: SegmentProfile = { density: 1, register: 0, length: 1, sync: 0 };
const DEFAULT_OPTION_PROFILE: OptionProfile = { envelope: "sparse", length: 1.6 };

const HEPTATONIC_INTERVALS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
} as const;

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

export const KEYS = NOTE_NAMES;

export const SCALE_LABELS: DisplayScaleName[] = [
  "Pentatonic Major",
  "Pentatonic Minor",
  "Heptatonic Major",
  "Heptatonic Natural Minor",
];

export const SCALE_SLUGS_BY_LABEL: Record<DisplayScaleName, ScaleName> = {
  "Pentatonic Major": "pentatonic-major",
  "Pentatonic Minor": "pentatonic-minor",
  "Heptatonic Major": "major",
  "Heptatonic Natural Minor": "natural-minor",
};

export const SCALE_LABELS_BY_SLUG: Record<ScaleName, DisplayScaleName> = {
  "pentatonic-major": "Pentatonic Major",
  "pentatonic-minor": "Pentatonic Minor",
  major: "Heptatonic Major",
  "natural-minor": "Heptatonic Natural Minor",
};

export const DRUM_PATTERNS: DrumPattern[] = [
  "Basic 8th-Note",
  "Four-on-the-Floor",
  "Syncopated",
  "Slow-Burn & 6/8 Fills",
  "Gated-Reverb Drive",
  "Driving 16th Open Hat",
];

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

export function normalizeScaleName(scale: ScaleInput): ScaleName {
  return (SCALE_SLUGS_BY_LABEL as Partial<Record<string, ScaleName>>)[scale] ?? (scale as ScaleName);
}

export function scaleMidi(key: string, scale: ScaleInput, lo: number, hi: number): number[] {
  const root = keyToPitchClass(key);
  const scaleName = normalizeScaleName(scale);
  const intervals = new Set(SCALE_INTERVALS[scaleName].map((n) => (n + root) % 12));
  const notes: number[] = [];

  for (let midi = lo; midi <= hi; midi += 1) {
    if (intervals.has(midi % 12)) notes.push(midi);
  }

  return notes;
}

export function snapToScale(notes: NoteEvent[], key: string, scale: ScaleInput): NoteEvent[] {
  if (!notes.length) return [];

  const minMidi = Math.min(...notes.map((note) => note.midi));
  const maxMidi = Math.max(...notes.map((note) => note.midi));
  const scaleNotes = scaleMidi(key, scale, minMidi - 12, maxMidi + 12);

  if (!scaleNotes.length) return notes.map((note) => ({ ...note }));

  return notes.map((note) => ({
    ...note,
    midi: scaleNotes.reduce((closest, candidate) =>
      Math.abs(candidate - note.midi) < Math.abs(closest - note.midi) ? candidate : closest,
    ),
  }));
}

export function quantizeToGrid(notes: NoteEvent[], stepsPerBeat: number): NoteEvent[] {
  const quantum = Math.max(1, Math.round(stepsPerBeat));

  return notes.map((note) => {
    const step = Math.max(0, Math.round(note.step / quantum) * quantum);
    const len = Math.max(quantum, Math.round(note.len / quantum) * quantum);
    return { ...note, step, len };
  });
}

export function thinDensity(notes: NoteEvent[], density: number, seed: number): NoteEvent[] {
  const keepProbability = clamp(density, 0, 1);
  if (keepProbability >= 1) return notes.map((note) => ({ ...note }));
  if (keepProbability <= 0) return [];

  const rng = createRng(seed);
  return notes.filter(() => rng() < keepProbability).map((note) => ({ ...note }));
}

function harmonicScale(scale: ScaleInput): readonly number[] {
  const scaleName = normalizeScaleName(scale);
  return scaleName === "pentatonic-minor" || scaleName === "natural-minor"
    ? HEPTATONIC_INTERVALS.minor
    : HEPTATONIC_INTERVALS.major;
}

export function chordPool(key: string, scale: ScaleInput): ChordTemplate[] {
  const root = keyToPitchClass(key);
  const harmony = harmonicScale(scale);
  const roots = SCALE_INTERVALS[normalizeScaleName(scale)];
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
  const scaleName = normalizeScaleName(options.scale);
  const harmony = harmonicScale(scaleName);
  const rng = options.seed == null ? Math.random : createRng(options.seed);
  const lengths = options.chordLengths ?? DEFAULT_CHORD_LENGTHS;
  const extensionProbability = options.extensionProbability ?? DEFAULT_EXTENSION_PROBABILITY;
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
      scaleName === "pentatonic-minor" || scaleName === "natural-minor"
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

function resolveSegmentProfile(profile?: Partial<SegmentProfile>): SegmentProfile {
  return { ...DEFAULT_SEGMENT_PROFILE, ...profile };
}

function resolveOptionProfile(profile?: Partial<OptionProfile>): OptionProfile {
  return { ...DEFAULT_OPTION_PROFILE, ...profile };
}

function envelopeProfile(profile: OptionProfile) {
  const envelope = profile.envelope;

  if (envelope === "rise") {
    return { envelope: (bar: number, bars: number) => 0.45 + (bar / Math.max(1, bars - 1)) * 1, length: profile.length };
  }

  if (envelope === "fall") {
    return { envelope: (bar: number, bars: number) => 1.25 - (bar / Math.max(1, bars - 1)) * 0.9, length: profile.length };
  }

  if (envelope === "swell") {
    return {
      envelope: (bar: number, bars: number) => 0.5 + Math.sin((bar / Math.max(1, bars - 1)) * Math.PI) * 0.7,
      length: profile.length,
    };
  }

  if (envelope === "alternate") {
    return { envelope: (bar: number) => 0.85 + (bar % 2) * 0.25, length: profile.length };
  }

  if (envelope === "flat") {
    return { envelope: () => 1, length: profile.length };
  }

  return { envelope: () => 0.62, length: profile.length };
}

export function generateMono(options: GenerateMonoOptions): NoteEvent[] {
  const segment = resolveSegmentProfile(options.segmentProfile);
  const option = envelopeProfile(resolveOptionProfile(options.optionProfile));
  const steps = options.steps ?? 128;
  const stepsPerBar = options.stepsPerBar ?? 16;
  const bars = Math.max(1, Math.ceil(steps / stepsPerBar));
  const lo = options.register[0] + segment.register;
  const hi = options.register[1] + segment.register;
  const rng = createRng(options.seed);
  const notes = scaleMidi(options.key, options.scale, lo, hi);

  if (!notes.length) return [];

  const baseDensity = Math.max(0.05, options.density * options.sparse);
  const syncEffect = clamp(options.sync + segment.sync, 0, 1.2);
  const out: NoteEvent[] = [];
  let noteIndex = Math.floor(rng() * notes.length);
  let step = 0;

  while (step < steps) {
    const bar = Math.floor(step / stepsPerBar);
    const envelope = option.envelope(bar, bars);
    const isDown = step % 4 === 0;
    const isBeat = step % 2 === 0;
    let probability = baseDensity * envelope * segment.density;

    if (isDown) probability *= 1.15;
    else if (isBeat) probability *= 0.75 * (0.6 + syncEffect);
    else probability *= 0.5 * (0.3 + syncEffect) * (0.5 + options.rhythm);
    if (options.counter) probability *= 0.7;

    if (rng() < probability) {
      noteIndex += Math.round(rng() * 4 - 2);
      noteIndex = clamp(noteIndex, 0, notes.length - 1);

      let length = [1, 1, 2, 2, 3, 4][Math.floor(rng() * 6)];
      length = Math.max(1, Math.round(length * (1.2 - options.density * 0.4) * segment.length * option.length));
      const velocity = Math.round(
        clamp((isDown ? 104 : isBeat ? 88 : 72) * (0.7 + 0.3 * envelope) + (rng() * 16 - 8), 35, 122),
      );

      out.push({ step, len: length, midi: notes[noteIndex], vel: velocity });
      step += length;
    } else {
      step += 1;
    }
  }

  return out;
}

export function generateDrums(pattern: DrumPattern, bars = 8, stepsPerBar = 16): DrumPatternEvents {
  const kick: number[] = [];
  const snare: number[] = [];
  const hat: number[] = [];
  const open: number[] = [];

  for (let bar = 0; bar < bars; bar += 1) {
    const offset = bar * stepsPerBar;
    const fill = bar % 4 === 3;

    if (pattern === "Basic 8th-Note") {
      kick.push(offset, offset + 8);
      snare.push(offset + 4, offset + 12);
      for (let i = 0; i < stepsPerBar; i += 2) hat.push(offset + i);
    } else if (pattern === "Four-on-the-Floor") {
      kick.push(offset, offset + 4, offset + 8, offset + 12);
      snare.push(offset + 4, offset + 12);
      for (let i = 0; i < stepsPerBar; i += 2) hat.push(offset + i);
      for (let i = 2; i < stepsPerBar; i += 4) open.push(offset + i);
    } else if (pattern === "Syncopated") {
      kick.push(offset, offset + 6, offset + 10);
      snare.push(offset + 4, offset + 12);
      if (bar % 2) snare.push(offset + 14);
      for (let i = 0; i < stepsPerBar; i += 2) hat.push(offset + i);
      hat.push(offset + 7, offset + 15);
    } else if (pattern === "Slow-Burn & 6/8 Fills") {
      kick.push(offset, offset + 9);
      snare.push(offset + 6);
      [0, 3, 6, 9, 12, 15].forEach((i) => hat.push(offset + i));
      if (fill) snare.push(offset + 10, offset + 12, offset + 14);
    } else if (pattern === "Gated-Reverb Drive") {
      kick.push(offset, offset + 8, offset + 11);
      snare.push(offset + 4, offset + 12);
      for (let i = 0; i < stepsPerBar; i += 2) hat.push(offset + i);
    } else if (pattern === "Driving 16th Open Hat") {
      kick.push(offset, offset + 8);
      snare.push(offset + 4, offset + 12);
      for (let i = 0; i < stepsPerBar; i += 1) hat.push(offset + i);
      for (let i = 2; i < stepsPerBar; i += 4) open.push(offset + i);
    }
  }

  return { kick, snare, hat, open };
}

export function waveformBins(notes: NoteEvent[], bins: number, steps = 128): number[] {
  const values = new Array<number>(bins).fill(0);

  for (const note of notes) {
    const firstBin = Math.floor((note.step / steps) * bins);
    const lastBin = Math.floor(((note.step + note.len) / steps) * bins);
    for (let bin = firstBin; bin <= Math.min(bins - 1, lastBin); bin += 1) {
      values[bin] += 1;
    }
  }

  const max = Math.max(1, ...values);
  return values.map((value, index) => {
    const base = value / max;
    const jitter = base > 0 ? 0.16 * Math.abs(Math.sin(index * 1.7)) : 0;
    return Math.min(1, base * 0.88 + jitter);
  });
}

function variableLengthQuantity(value: number): number[] {
  const bytes = [value & 0x7f];
  let next = value >> 7;

  while (next > 0) {
    bytes.unshift((next & 0x7f) | 0x80);
    next >>= 7;
  }

  return bytes;
}

export function buildMidi(tempo: number, tracks: MidiTrack[]): Uint8Array {
  const ticksPerStep = 120;
  const u16 = (value: number) => [(value >> 8) & 0xff, value & 0xff];
  const u32 = (value: number) => [(value >>> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
  const chunks: number[][] = [];
  const microsecondsPerBeat = Math.round(60000000 / tempo);
  let tempoTrack: number[] = [];

  tempoTrack = tempoTrack.concat(
    variableLengthQuantity(0),
    [0xff, 0x51, 0x03, (microsecondsPerBeat >> 16) & 0xff, (microsecondsPerBeat >> 8) & 0xff, microsecondsPerBeat & 0xff],
    variableLengthQuantity(0),
    [0xff, 0x2f, 0x00],
  );
  chunks.push(tempoTrack);

  for (const track of tracks) {
    const events: Array<{ time: number; status: number; note: number; velocity: number }> = [];

    for (const note of track.notes) {
      events.push({ time: note.step * ticksPerStep, status: 0x90, note: note.midi, velocity: note.vel ?? 90 });
      events.push({
        time: (note.step + Math.max(1, note.len)) * ticksPerStep,
        status: 0x80,
        note: note.midi,
        velocity: 0,
      });
    }

    events.sort((left, right) => left.time - right.time || left.status - right.status);

    let bytes: number[] = [];
    let lastTime = 0;

    for (const event of events) {
      bytes = bytes.concat(variableLengthQuantity(event.time - lastTime), [
        event.status | track.channel,
        event.note,
        event.velocity,
      ]);
      lastTime = event.time;
    }

    bytes = bytes.concat(variableLengthQuantity(0), [0xff, 0x2f, 0x00]);
    chunks.push(bytes);
  }

  let midi = [0x4d, 0x54, 0x68, 0x64].concat(u32(6), u16(1), u16(chunks.length), u16(480));
  for (const chunk of chunks) {
    midi = midi.concat([0x4d, 0x54, 0x72, 0x6b], u32(chunk.length), chunk);
  }

  return new Uint8Array(midi);
}
