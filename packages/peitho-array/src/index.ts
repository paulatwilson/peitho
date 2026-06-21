export * from "./progression-seeds";
export * from "./contracts";
import type {
  ChordEvent,
  ChordTemplate,
  DisplayScaleName,
  DrumPattern,
  DrumPatternEvents,
  GenerateChordsOptions,
  GenerateMonoOptions,
  MidiTrack,
  NoteEvent,
  OptionEnvelope,
  OptionProfile,
  PatternConfig,
  PeithoPattern,
  ProgressionProfile,
  ScaleInput,
  ScaleName,
  SegmentProfile,
} from "./contracts";

export const ARRAY_CHORD_RUNTIME_PROFILE = {
  model: "conditional_small",
  candidateCount: 2,
  cadencePolicy: "reject",
  scalePolicy: "strict",
  chordCounts: [8, 16],
  allowImmediateRepeat: false,
} as const;

type ChordDegreeRole = "tonic" | "predominant" | "dominant" | "colour";

type HarmonicPhraseRole = "statement" | "preparation" | "extension" | "antecedent" | "consequent";

type ChordDegreeMetadata = {
  degree: number;
  semitone: number;
  role: ChordDegreeRole;
  suffix: string;
};

const DEFAULT_CHORD_LENGTHS = [1, 1, 2, 2, 2, 3, 4];
const DEFAULT_EXTENSION_PROBABILITY = 0.35;
const DEFAULT_PROGRESSION_PROFILE: Required<ProgressionProfile> = {
  start: "any",
  cadence: "none",
  tension: 0.5,
  repetition: 0.5,
};
const DEFAULT_SEGMENT_PROFILE: SegmentProfile = { density: 1, register: 0, length: 1, sync: 0 };
const DEFAULT_OPTION_PROFILE: OptionProfile = { envelope: "sparse", length: 1.6 };

const HEPTATONIC_INTERVALS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
} as const;

const MAJOR_DEGREE_ROLES: ChordDegreeRole[] = [
  "tonic",
  "predominant",
  "colour",
  "predominant",
  "dominant",
  "tonic",
  "dominant",
];

const MINOR_DEGREE_ROLES: ChordDegreeRole[] = [
  "tonic",
  "predominant",
  "colour",
  "predominant",
  "dominant",
  "tonic",
  "dominant",
];

const MAJOR_DEGREE_SUFFIXES = ["", "m", "m", "", "", "m", "dim"] as const;
const MINOR_DEGREE_SUFFIXES = ["m", "dim", "", "m", "m", "", ""] as const;

const ROLE_TRANSITION_WEIGHTS: Record<ChordDegreeRole, Record<ChordDegreeRole, number>> = {
  tonic: {
    tonic: 0.7,
    predominant: 1.25,
    dominant: 1,
    colour: 0.8,
  },
  predominant: {
    tonic: 0.55,
    predominant: 0.45,
    dominant: 1.55,
    colour: 0.85,
  },
  dominant: {
    tonic: 1.55,
    predominant: 0.45,
    dominant: 0.35,
    colour: 0.75,
  },
  colour: {
    tonic: 1.15,
    predominant: 1,
    dominant: 0.95,
    colour: 0.45,
  },
};

// SPEAC phrase roles supply a larger tension arc around Scribbletune's T-P-D functional flow.
const PHRASE_ROLE_WEIGHTS: Record<HarmonicPhraseRole, Record<ChordDegreeRole, number>> = {
  statement: { tonic: 1.7, predominant: 0.65, dominant: 0.55, colour: 0.9 },
  preparation: { tonic: 0.6, predominant: 1.7, dominant: 0.8, colour: 1 },
  extension: { tonic: 0.8, predominant: 1, dominant: 1.15, colour: 1.35 },
  antecedent: { tonic: 0.45, predominant: 0.8, dominant: 1.8, colour: 1 },
  consequent: { tonic: 1.8, predominant: 0.6, dominant: 0.5, colour: 0.8 },
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

function chordDegreeMetadata(scale: ScaleInput): ChordDegreeMetadata[] {
  const scaleName = normalizeScaleName(scale);
  const isMinor = scaleName === "pentatonic-minor" || scaleName === "natural-minor";
  const harmony = harmonicScale(scaleName);
  const roles = isMinor ? MINOR_DEGREE_ROLES : MAJOR_DEGREE_ROLES;
  const suffixes = isMinor ? MINOR_DEGREE_SUFFIXES : MAJOR_DEGREE_SUFFIXES;

  return harmony.map((semitone, degree) => ({
    degree,
    semitone,
    role: roles[degree],
    suffix: suffixes[degree],
  }));
}

function pickWeightedDegree(candidates: ChordDegreeMetadata[], weights: number[], rng: () => number): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let pick = rng() * total;

  for (let index = 0; index < weights.length; index += 1) {
    pick -= weights[index];
    if (pick <= 0) return candidates[index].degree;
  }

  return candidates.at(-1)!.degree;
}

function harmonicPhraseRole(
  index: number,
  finalIndex: number,
  cadence: Required<ProgressionProfile>["cadence"],
): HarmonicPhraseRole {
  if (index === 0) return "statement";
  if ((cadence === "strong" || cadence === "soft") && index === finalIndex) return "consequent";
  if (cadence === "strong" && index === finalIndex - 1) return "antecedent";
  if (cadence === "soft" && index === finalIndex - 1) return "preparation";
  return (["statement", "preparation", "extension", "antecedent"] as const)[index % 4];
}

function weightedDegree(
  degrees: ChordDegreeMetadata[],
  previous: ChordDegreeMetadata | null,
  rng: () => number,
  profile: Required<ProgressionProfile>,
  phraseRole: HarmonicPhraseRole,
  motifReference: ChordDegreeMetadata | null,
  allowedRoles?: ChordDegreeRole[],
): number {
  const candidates = allowedRoles ? degrees.filter((degree) => allowedRoles.includes(degree.role)) : degrees;
  if (!previous) return candidates[Math.floor(rng() * candidates.length)].degree;
  const tension = clamp(profile.tension, 0, 1);
  const repetition = clamp(profile.repetition, 0, 1);

  const weights = candidates.map((degree) => {
    const roleWeight = ROLE_TRANSITION_WEIGHTS[previous.role][degree.role];
    const phraseWeight = PHRASE_ROLE_WEIGHTS[phraseRole][degree.role];
    const tensionWeight =
      degree.role === "dominant" || degree.role === "colour" ? 0.75 + tension : 1.25 - tension * 0.5;
    const repeatWeight = degree.degree === previous.degree ? 0.35 + repetition * 5.65 : 1;
    const motifWeight = degree.degree === motifReference?.degree ? 0.5 + repetition * 4.5 : 1;
    const rootWeight = degree.degree === 0 ? 0.7 + repetition * 1.3 : 1;
    return roleWeight * phraseWeight * tensionWeight * repeatWeight * motifWeight * rootWeight;
  });

  return pickWeightedDegree(candidates, weights, rng);
}

function loopCadenceDegree(
  degrees: ChordDegreeMetadata[],
  previous: ChordDegreeMetadata | null,
  opening: ChordDegreeMetadata,
  rng: () => number,
  profile: Required<ProgressionProfile>,
): number {
  const tension = clamp(profile.tension, 0, 1);
  const repetition = clamp(profile.repetition, 0, 1);
  const returningDegrees = degrees.filter((degree) => {
    if (degree.degree === opening.degree) return false;
    if (opening.role === "tonic") return degree.role === "dominant";
    return ROLE_TRANSITION_WEIGHTS[degree.role][opening.role] >= 1;
  });
  const candidates = returningDegrees.length > 0 ? returningDegrees : degrees.filter((degree) => degree !== opening);

  const weights = candidates.map((degree) => {
    const fromPrevious = previous ? ROLE_TRANSITION_WEIGHTS[previous.role][degree.role] : 1;
    const toOpening = ROLE_TRANSITION_WEIGHTS[degree.role][opening.role];
    const tensionWeight =
      degree.role === "dominant" || degree.role === "colour" ? 0.75 + tension : 1.25 - tension * 0.5;
    const repeatWeight = degree.degree === previous?.degree ? 0.65 + repetition * 1.35 : 1;
    const openingWeight = degree.degree === opening.degree ? 0.15 + repetition * 0.5 : 1;
    return fromPrevious * toOpening * toOpening * tensionWeight * repeatWeight * openingWeight;
  });

  return pickWeightedDegree(candidates, weights, rng);
}

function cadenceDegree(
  index: number,
  finalIndex: number,
  degrees: ChordDegreeMetadata[],
  previous: ChordDegreeMetadata | null,
  opening: ChordDegreeMetadata | null,
  profile: Required<ProgressionProfile>,
  phraseRole: HarmonicPhraseRole,
  motifReference: ChordDegreeMetadata | null,
  rng: () => number,
): number | null {
  if (profile.cadence === "none") return null;

  if (profile.cadence === "strong") {
    if (index === finalIndex) return 0;
    if (index === finalIndex - 1) return 4;
  }

  if (profile.cadence === "soft") {
    if (index === finalIndex) return 0;
    if (index === finalIndex - 1) {
      return weightedDegree(
        degrees,
        previous,
        rng,
        profile,
        phraseRole,
        motifReference,
        ["predominant", "colour"],
      );
    }
  }

  if (profile.cadence === "loop" && index === finalIndex && opening) {
    return loopCadenceDegree(degrees, previous, opening, rng, profile);
  }

  return null;
}

function stackedScaleTone(tonic: number, harmony: readonly number[], degree: number, stackOffset: number): number {
  const scaleIndex = degree + stackOffset;
  return tonic + harmony[scaleIndex % harmony.length] + Math.floor(scaleIndex / harmony.length) * 12;
}

function seventhSuffix(triadSuffix: string, root: number, seventh: number): string {
  if (triadSuffix === "dim") return "m7b5";
  const interval = seventh - root;
  if (triadSuffix === "m") return interval === 11 ? "m(maj7)" : "m7";
  return interval === 11 ? "maj7" : "7";
}

export function chordPool(key: string, scale: ScaleInput): ChordTemplate[] {
  const root = keyToPitchClass(key);
  const harmony = harmonicScale(scale);
  const roots = SCALE_INTERVALS[normalizeScaleName(scale)];
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
    const rootMidi = 48 + ((root + rootStep) % 12);
    const base = thirdInterval === 4 ? "" : thirdInterval === 3 ? "m" : thirdInterval <= 2 ? "sus2" : "sus4";
    const fifthQuality = fifthInterval === 6 ? "b5" : fifthInterval === 8 ? "#5" : "";
    const triad = [rootMidi, rootMidi + thirdInterval, rootMidi + fifthInterval];

    out.push({ name: `${rootName}${base}${fifthQuality}`, tones: triad });

    if ((base === "" || base === "m") && fifthQuality === "") {
      let seventhSuffix: string | null = null;
      if (seventhInterval === 11) seventhSuffix = base === "" ? "maj7" : "m(maj7)";
      else if (seventhInterval === 10) seventhSuffix = base === "" ? "7" : "m7";

      if (seventhSuffix) {
        out.push({
          name: `${rootName}${seventhSuffix}`,
          tones: [...triad, rootMidi + seventhInterval],
        });
      }

      out.push({
        name: `${rootName}${base}add9`,
        tones: [...triad, rootMidi + secondInterval + 12],
      });
    } else if (fifthQuality === "b5") {
      out.push({
        name: `${rootName}m7b5`,
        tones: [...triad, rootMidi + seventhInterval],
      });
    }
  }

  return out;
}

export function borrowedChordPool(key: string, scale: ScaleInput): ChordTemplate[] {
  const scaleName = normalizeScaleName(scale);
  const parallelScale: ScaleName =
    scaleName === "pentatonic-minor" || scaleName === "natural-minor" ? "major" : "natural-minor";
  const inKeyNames = new Set(chordPool(key, scaleName).map((chord) => chord.name));

  return chordPool(key, parallelScale).filter((chord) => !inKeyNames.has(chord.name));
}

export function voiceChordNear(chord: ChordTemplate, referenceRoot: number): ChordTemplate {
  if (!chord.tones.length || !Number.isFinite(referenceRoot)) {
    return { name: chord.name, tones: [...chord.tones] };
  }

  const octaveShift = Math.round((referenceRoot - chord.tones[0]) / 12) * 12;
  return {
    name: chord.name,
    tones: chord.tones.map((tone) => tone + octaveShift),
  };
}

export function generateChords(options: GenerateChordsOptions): ChordEvent[] {
  const root = keyToPitchClass(options.key);
  const scaleName = normalizeScaleName(options.scale);
  const harmony = harmonicScale(scaleName);
  const degrees = chordDegreeMetadata(scaleName);
  const rng = options.seed == null ? Math.random : createRng(options.seed);
  const lengths = options.chordLengths ?? DEFAULT_CHORD_LENGTHS;
  const extensionProbability = options.extensionProbability ?? DEFAULT_EXTENSION_PROBABILITY;
  const progressionProfile = {
    ...DEFAULT_PROGRESSION_PROFILE,
    ...options.progressionProfile,
  };
  const totalHalfBars = (options.bars ?? 8) * 2;
  const segments: number[] = [];
  const chordCount = options.chordCount;

  if (chordCount != null) {
    if (!Number.isInteger(chordCount) || chordCount < 1 || chordCount > totalHalfBars) {
      throw new Error(`chordCount must be an integer from 1 to ${totalHalfBars}`);
    }
    segments.push(...Array.from({ length: chordCount }, () => 1));
    for (let remaining = totalHalfBars - chordCount; remaining > 0; remaining -= 1) {
      segments[Math.floor(rng() * segments.length)] += 1;
    }
  } else {
    let remaining = totalHalfBars;
    while (remaining > 0) {
      let length = lengths[Math.floor(rng() * lengths.length)];
      if (length > remaining) length = remaining;
      segments.push(length);
      remaining -= length;
    }
  }

  let start = 0;
  let previousDegree: ChordDegreeMetadata | null = null;
  let openingDegree: ChordDegreeMetadata | null = null;
  const degreeHistory: ChordDegreeMetadata[] = [];
  const finalSegmentIndex = segments.length - 1;

  return segments.map((len, index) => {
    const phraseRole = harmonicPhraseRole(index, finalSegmentIndex, progressionProfile.cadence);
    const motifReference = degreeHistory.at(-4) ?? degreeHistory.at(-2) ?? null;
    const cadence = cadenceDegree(
      index,
      finalSegmentIndex,
      degrees,
      previousDegree,
      openingDegree,
      progressionProfile,
      phraseRole,
      motifReference,
      rng,
    );
    const degree =
      cadence ??
      (index === 0 && progressionProfile.start === "tonic"
        ? 0
        : weightedDegree(degrees, previousDegree, rng, progressionProfile, phraseRole, motifReference));
    const degreeMeta = degrees[degree];
    if (index === 0) openingDegree = degreeMeta;
    previousDegree = degreeMeta;
    degreeHistory.push(degreeMeta);
    const semitone = degreeMeta.semitone;
    const noteName = NOTE_NAMES[(root + semitone) % 12];
    let suffix = degreeMeta.suffix;
    const tonic = 48 + root;
    const tones = [
      stackedScaleTone(tonic, harmony, degree, 0),
      stackedScaleTone(tonic, harmony, degree, 2),
      stackedScaleTone(tonic, harmony, degree, 4),
    ];
    const isMinorStrongDominant =
      (scaleName === "natural-minor" || scaleName === "pentatonic-minor") &&
      progressionProfile.cadence === "strong" &&
      index === finalSegmentIndex - 1 &&
      degree === 4;

    if (isMinorStrongDominant) {
      tones[1] += 1;
      suffix = "";
    }

    if (rng() < extensionProbability) {
      const seventh = stackedScaleTone(tonic, harmony, degree, 6);
      tones.push(seventh);
      suffix = seventhSuffix(suffix, tones[0], seventh);
    }

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
