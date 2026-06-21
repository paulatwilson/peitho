import {
  ARRAY_CHORD_RUNTIME_PROFILE,
  DRUM_PATTERNS,
  KEYS,
  NOTE_NAMES,
  SCALE_INTERVALS,
  SCALE_LABELS,
  buildMidi,
  chordPool,
  generateChords,
  generateDrums,
  generateMono,
  normalizeScaleName,
  romanToChordSymbols,
  scaleMidi,
  waveformBins,
  type ChordEvent,
  type DisplayScaleName,
  type DrumPattern,
  type MidiTrack,
  type NoteEvent,
  type MacroSettings,
  type OptionProfile,
  type ProgressionProfile,
  type ProgressionSeed,
  type SegmentProfile,
} from "@peitho/array";
import directionPresets from "./direction-presets.json";

type MacroVector = MacroSettings;

const PULSE_GENRES = [
  "Rock",
  "Folk",
  "Pop",
  "Soundtrack",
  "R&B, Funk & Soul",
  "Country",
  "Jazz",
  "Experimental",
  "Religious Music",
  "Reggae & Ska",
  "Hip Hop",
  "Electronic",
  "Comedy",
  "Metal",
  "Blues",
  "World Music",
  "Disco",
  "Classical",
  "New Age",
  "Darkwave",
] as const;
const PULSE_DECADES = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020] as const;

type PulseGenre = (typeof PULSE_GENRES)[number];
type PulseDecade = (typeof PULSE_DECADES)[number];
type PulseConditions = {
  genres: PulseGenre[];
  defaultDecade: PulseDecade;
};

type DirectionTypePreset = {
  name: string;
  pulseConditions: PulseConditions;
  macro: MacroVector;
  chordLengths: number[];
  extensionProbability: number;
  drumRecommendations: DrumPattern[];
  pulseKeywords: string[];
};

type SegmentPreset = {
  name: string;
  macro: Partial<MacroVector>;
  profile: SegmentProfile;
  pulseKeywords: string[];
};

type OptionPreset = {
  name: string;
  macro: Partial<MacroVector>;
  envelope: OptionProfile["envelope"];
  length: number;
  pulseKeywords: string[];
};

type ScalePolicy = "strict" | "cadential" | "chromatic";

type ChordDirectionBase = Required<ProgressionProfile> & {
  scalePolicy: ScalePolicy;
  model: string;
  candidateCount: number;
  cadencePolicy: string;
};

type ChordDirectionModifier = {
  start?: ProgressionProfile["start"];
  cadence?: ProgressionProfile["cadence"];
  tensionShift?: number;
  repetitionShift?: number;
  chordLengthScale?: number;
  extensionShift?: number;
  cadencePolicyOverride?: string | null;
  candidateCountShift?: number;
};

type ChordDirectionLibrary = {
  typeDefaults: Record<string, ChordDirectionBase>;
  segmentModifiers: Record<string, ChordDirectionModifier>;
  optionModifiers: Record<string, ChordDirectionModifier>;
};

type ScaleProfile = {
  pulseKeywords: string[];
  replacements: Record<string, string>;
};

type DirectionPresetLibrary = {
  types: DirectionTypePreset[];
  segments: SegmentPreset[];
  options: OptionPreset[];
  scaleProfiles: Record<DisplayScaleName, ScaleProfile>;
  chordDirections: ChordDirectionLibrary;
};

type ComposerMonoOptions = MacroSettings & {
  key: string;
  scale: DisplayScaleName;
  segment: string;
  option: string;
  register: [number, number];
  sparse: number;
  counter?: boolean;
};

const PRESETS = directionPresets as DirectionPresetLibrary;
const TYPE_PRESETS = Object.fromEntries(PRESETS.types.map((preset) => [preset.name, preset]));
const SEGMENT_PRESETS = Object.fromEntries(PRESETS.segments.map((preset) => [preset.name, preset]));
const OPTION_PRESETS = Object.fromEntries(PRESETS.options.map((preset) => [preset.name, preset]));
const PULSE_KEYWORDS = [
  ...new Set(
    [
      ...[...PRESETS.types, ...PRESETS.segments, ...PRESETS.options].flatMap((preset) => preset.pulseKeywords),
      ...Object.values(PRESETS.scaleProfiles).flatMap((profile) => [
        ...profile.pulseKeywords,
        ...Object.values(profile.replacements),
      ]),
    ],
  ),
];
const DEFAULT_TYPE = TYPE_PRESETS.Ballad;
const DEFAULT_SEGMENT = SEGMENT_PRESETS.Verse;
const DEFAULT_OPTION = OPTION_PRESETS["Rousing Crescendo"];

function presetMacros(type: string, segment: string, option: string, scale: DisplayScaleName): MacroSettings {
  const base = (TYPE_PRESETS[type] ?? DEFAULT_TYPE).macro;
  const segmentMacro = (SEGMENT_PRESETS[segment] ?? DEFAULT_SEGMENT).macro;
  const optionMacro = (OPTION_PRESETS[option] ?? DEFAULT_OPTION).macro;
  const scaleShift = scale.startsWith("Pentatonic") ? -0.05 : 0.05;

  return {
    density: clamp(base.density + (segmentMacro.density ?? 0) + (optionMacro.density ?? 0), 0.05, 1),
    split: clamp(base.split + (segmentMacro.split ?? 0) + (optionMacro.split ?? 0), 0, 1),
    sync: clamp(base.sync + (segmentMacro.sync ?? 0) + (optionMacro.sync ?? 0), 0, 1),
    rhythm: clamp(base.rhythm + (segmentMacro.rhythm ?? 0) + (optionMacro.rhythm ?? 0) + scaleShift, 0, 1),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function chordUnit(value: number): number {
  return Math.round(clamp(value, 0, 1) * 1000) / 1000;
}

function pulseKeywords(type: string, segment: string, option: string, scale: DisplayScaleName): string[] {
  const presets = [
    TYPE_PRESETS[type] ?? DEFAULT_TYPE,
    SEGMENT_PRESETS[segment] ?? DEFAULT_SEGMENT,
    OPTION_PRESETS[option] ?? DEFAULT_OPTION,
  ];
  const scaleProfile = PRESETS.scaleProfiles[scale] ?? PRESETS.scaleProfiles["Pentatonic Major"];
  const contextual = presets
    .flatMap((preset) => preset.pulseKeywords)
    .map((keyword) => scaleProfile.replacements[keyword] ?? keyword);

  return [...new Set([...contextual, ...scaleProfile.pulseKeywords])];
}

function pulseConditions(type: string): PulseConditions {
  const conditions = (TYPE_PRESETS[type] ?? DEFAULT_TYPE).pulseConditions;
  return {
    genres: [...conditions.genres],
    defaultDecade: conditions.defaultDecade,
  };
}

function chordTones(symbol: string): number[] {
  const match = symbol.match(/^([A-G])(#|b)?(.*)$/);
  if (!match) throw new Error(`Unsupported chord symbol: ${symbol}`);
  const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
  const root = 48 + (NOTE_NAMES.indexOf(match[1] as (typeof NOTE_NAMES)[number]) + accidental + 12) % 12;
  const suffix = match[3];
  const intervals = suffix.startsWith("dim") ? [0, 3, 6] : suffix.startsWith("aug") ? [0, 4, 8] : suffix.startsWith("m") ? [0, 3, 7] : [0, 4, 7];
  return intervals.map((interval) => root + interval);
}

const NOTE_TO_PC: Record<string, number> = {
  C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11
};

function chordRagStatus(chordName: string, key: string, scale: DisplayScaleName): 'green'|'amber'|'red' {
  const scaleIntervals = SCALE_INTERVALS[normalizeScaleName(scale)];
  const keyPc = NOTE_NAMES.indexOf(key as typeof NOTE_NAMES[number]);
  if (keyPc === -1 || !scaleIntervals) return 'amber';
  const inScale = new Set(scaleIntervals.map(n => (n + keyPc) % 12));
  const rootMatch = chordName.match(/^([A-G][#b]?)/);
  if (!rootMatch) return 'amber';
  const rootPc = NOTE_TO_PC[rootMatch[1]];
  if (rootPc == null) return 'amber';
  if (!inScale.has(rootPc)) return 'red';
  // "maj" must come before "m" — "maj7".startsWith("m") is true
  const suffix = chordName.slice(rootMatch[1].length).split('/')[0];
  const intervals = suffix.startsWith("dim") ? [0,3,6]
    : suffix.startsWith("aug") ? [0,4,8]
    : suffix.startsWith("maj") ? [0,4,7]
    : suffix.startsWith("m7b5") || suffix.startsWith("m7#5") ? [0,3,6]
    : suffix.startsWith("m")   ? [0,3,7]
    : [0,4,7];
  return intervals.map(i => (rootPc + i) % 12).every(pc => inScale.has(pc)) ? 'green' : 'amber';
}

function chordsFromProgressionSeed(seed: ProgressionSeed, key: string): ChordEvent[] {
  const symbols = romanToChordSymbols(seed.degrees, key, seed.mode);
  const rhythm = seed.harmonicRhythm;
  if (!rhythm || rhythm.length !== symbols.length) {
    throw new Error("Pulse progression seed has no matching harmonic rhythm");
  }
  let start = 0;
  return symbols.map((name, index) => {
    const len = rhythm[index];
    const event = { name, start, len, tones: chordTones(name) };
    start += len;
    return event;
  });
}

function chordDirection(type: string, segment: string, option: string) {
  const typePreset = TYPE_PRESETS[type] ?? DEFAULT_TYPE;
  const base = PRESETS.chordDirections.typeDefaults[typePreset.name] ?? PRESETS.chordDirections.typeDefaults.Ballad;
  const segmentModifier = PRESETS.chordDirections.segmentModifiers[segment] ?? {};
  const optionModifier = PRESETS.chordDirections.optionModifiers[option] ?? {};
  const lengthScale = (segmentModifier.chordLengthScale ?? 1) * (optionModifier.chordLengthScale ?? 1);

  return {
    chordLengths: typePreset.chordLengths.map((length) => Math.max(1, Math.round(length * lengthScale))),
    extensionProbability: chordUnit(
      typePreset.extensionProbability +
        (segmentModifier.extensionShift ?? 0) +
        (optionModifier.extensionShift ?? 0),
    ),
    progressionProfile: {
      start: optionModifier.start ?? segmentModifier.start ?? base.start,
      cadence: optionModifier.cadence ?? segmentModifier.cadence ?? base.cadence,
      tension: chordUnit(base.tension + (segmentModifier.tensionShift ?? 0) + (optionModifier.tensionShift ?? 0)),
      repetition: chordUnit(
        base.repetition + (segmentModifier.repetitionShift ?? 0) + (optionModifier.repetitionShift ?? 0),
      ),
    } satisfies Required<ProgressionProfile>,
    scalePolicy: base.scalePolicy,
    model: base.model,
    candidateCount: Math.min(8, Math.max(1, base.candidateCount + (segmentModifier.candidateCountShift ?? 0) + (optionModifier.candidateCountShift ?? 0))),
    cadencePolicy: optionModifier.cadencePolicyOverride ?? segmentModifier.cadencePolicyOverride ?? base.cadencePolicy,
  };
}

export const ComposerEngine = {
  NOTE_NAMES: [...NOTE_NAMES],
  KEYS: [...KEYS],
  SCALE_LIST: [...SCALE_LABELS],
  TYPES: PRESETS.types.map((preset) => preset.name),
  SEGMENTS: PRESETS.segments.map((preset) => preset.name),
  OPTIONS: PRESETS.options.map((preset) => preset.name),
  PULSE_GENRES: [...PULSE_GENRES],
  PULSE_DECADES: [...PULSE_DECADES],
  PULSE_KEYWORDS: [...PULSE_KEYWORDS],
  ARRAY_CHORD_RUNTIME_PROFILE,
  DRUM_PATTERNS: [...DRUM_PATTERNS],
  DRUM_REC: Object.fromEntries(PRESETS.types.map((preset) => [preset.name, preset.drumRecommendations])),

  rand(): number {
    return (Math.random() * 4294967295) >>> 0;
  },

  clamp(value: number, min: number, max: number): number {
    return clamp(value, min, max);
  },

  genDrums(pattern: DrumPattern) {
    return generateDrums(pattern, 8, 16);
  },

  chordDirection(type: string, segment: string, option: string) {
    return chordDirection(type, segment, option);
  },

  chordTypeDefault(type: string) {
    const typePreset = TYPE_PRESETS[type] ?? DEFAULT_TYPE;
    return PRESETS.chordDirections.typeDefaults[typePreset.name] ?? PRESETS.chordDirections.typeDefaults.Ballad;
  },

  genChords(
    key: string,
    scale: DisplayScaleName,
    type: string,
    segment = DEFAULT_SEGMENT.name,
    option = DEFAULT_OPTION.name,
    seed?: number,
    chordCount?: number,
  ) {
    const direction = chordDirection(type, segment, option);
    return generateChords({
      key,
      scale,
      bars: 8,
      seed,
      chordCount,
      ...direction,
    });
  },

  chordPool(key: string, scale: DisplayScaleName) {
    return chordPool(key, scale);
  },

  scaleMidi(key: string, scale: DisplayScaleName, lo: number, hi: number) {
    return scaleMidi(key, scale, lo, hi);
  },

  recommendMacros(type: string, segment: string, option: string, scale: DisplayScaleName) {
    return presetMacros(type, segment, option, scale);
  },

  pulseKeywords(type: string, segment: string, option: string, scale: DisplayScaleName) {
    return pulseKeywords(type, segment, option, scale);
  },

  pulseConditions(type: string) {
    return pulseConditions(type);
  },

  pulseChordRequest(
    key: string,
    scale: DisplayScaleName,
    type: string,
    segment: string,
    option: string,
    decade: PulseDecade,
    seed: number,
    overrides?: {
      tension?: number;
      repetition?: number;
      cadence?: ProgressionProfile["cadence"];
      chordLengths?: number[];
      chordCount?: number;
      model?: string;
      candidateCount?: number;
      cadencePolicy?: string;
      scalePolicy?: ScalePolicy;
      allowImmediateRepeat?: boolean;
    },
  ) {
    const direction = chordDirection(type, segment, option);
    const conditions = pulseConditions(type);
    const explicitCount = overrides?.chordCount;
    // window=1 (generator default) runs zero soft-penalty iterations when
    // allowImmediateRepeat=false, so A→B→A→B loops freely. window=2 is the
    // minimum that actually suppresses alternation; scale higher for larger counts.
    const repetitionWindow = Math.min(
      Math.max(2, explicitCount ? Math.round(explicitCount / 2.5) : 2),
      7,
    );
    // Default penalty 3.0 is often too weak against the model's tonal priors.
    const repetitionPenalty = 5.0;
    const baseRepetition = overrides?.repetition ?? direction.progressionProfile.repetition;
    // For large explicit counts the user wants variety, not the most-repetitive
    // candidate winning the ranking round (motif bonus = repetition × 5).
    const repetition = explicitCount && explicitCount >= 8
      ? Math.min(baseRepetition, 0.35)
      : baseRepetition;
    return {
      key,
      mode: normalizeScaleName(scale),
      bars: 8,
      tension: overrides?.tension ?? direction.progressionProfile.tension,
      repetition,
      cadence: overrides?.cadence ?? direction.progressionProfile.cadence,
      chordLengths: overrides?.chordLengths ?? direction.chordLengths,
      ...(explicitCount ? { chordCount: explicitCount } : {}),
      scalePolicy: overrides?.scalePolicy ?? direction.scalePolicy,
      allowImmediateRepeat: overrides?.allowImmediateRepeat ?? false,
      repetitionWindow,
      repetitionPenalty,
      model: (overrides?.model ?? direction.model) as any,
      cadencePolicy: (overrides?.cadencePolicy ?? direction.cadencePolicy) as any,
      genres: conditions.genres,
      decade,
      seed,
      candidateCount: overrides?.candidateCount ?? direction.candidateCount,
    };
  },

  arrayChordRequest(
    key: string,
    scale: DisplayScaleName,
    type: string,
    segment: string,
    option: string,
    chordCount: 8 | 16,
    seed: number,
  ) {
    if (!ARRAY_CHORD_RUNTIME_PROFILE.chordCounts.includes(chordCount)) {
      throw new Error("Peitho-Array chord count must be 8 or 16");
    }
    const direction = chordDirection(type, segment, option);
    const conditions = pulseConditions(type);
    return {
      key,
      mode: normalizeScaleName(scale),
      bars: 8,
      tension: direction.progressionProfile.tension,
      repetition: direction.progressionProfile.repetition,
      cadence: direction.progressionProfile.cadence,
      chordLengths: direction.chordLengths,
      chordCount,
      genres: conditions.genres,
      decade: conditions.defaultDecade,
      seed,
      model: ARRAY_CHORD_RUNTIME_PROFILE.model,
      candidateCount: ARRAY_CHORD_RUNTIME_PROFILE.candidateCount,
      cadencePolicy: ARRAY_CHORD_RUNTIME_PROFILE.cadencePolicy,
      scalePolicy: ARRAY_CHORD_RUNTIME_PROFILE.scalePolicy,
      allowImmediateRepeat: ARRAY_CHORD_RUNTIME_PROFILE.allowImmediateRepeat,
    };
  },

  chordsFromProgressionSeed(seed: ProgressionSeed, key: string) {
    return chordsFromProgressionSeed(seed, key);
  },

  genMono(seed: number, options: ComposerMonoOptions) {
    const segment = SEGMENT_PRESETS[options.segment] ?? DEFAULT_SEGMENT;
    const option = OPTION_PRESETS[options.option] ?? DEFAULT_OPTION;

    return generateMono({
      ...options,
      seed,
      steps: 128,
      stepsPerBar: 16,
      segmentProfile: segment.profile,
      optionProfile: { envelope: option.envelope, length: option.length },
    });
  },

  wave(notes: NoteEvent[], bins: number) {
    return waveformBins(notes, bins, 128);
  },

  buildMidi(tempo: number, tracks: MidiTrack[]) {
    return buildMidi(tempo, tracks);
  },

  chordRagStatus(chordName: string, key: string, scale: DisplayScaleName): 'green'|'amber'|'red' {
    return chordRagStatus(chordName, key, scale);
  },
};

declare global {
  interface Window {
    PeithoComposerEngine: typeof ComposerEngine;
  }
}

window.PeithoComposerEngine = ComposerEngine;
