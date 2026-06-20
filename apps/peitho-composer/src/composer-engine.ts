import {
  DRUM_PATTERNS,
  KEYS,
  NOTE_NAMES,
  SCALE_LABELS,
  buildMidi,
  chordPool,
  generateChords,
  generateDrums,
  generateMono,
  scaleMidi,
  waveformBins,
  type DisplayScaleName,
  type DrumPattern,
  type MidiTrack,
  type NoteEvent,
  type MacroSettings,
  type OptionProfile,
  type ProgressionProfile,
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
  defaultDecade?: PulseDecade;
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

type ChordDirectionBase = Required<ProgressionProfile>;

type ChordDirectionModifier = {
  start?: ProgressionProfile["start"];
  cadence?: ProgressionProfile["cadence"];
  tensionShift?: number;
  repetitionShift?: number;
  chordLengthScale?: number;
  extensionShift?: number;
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
    ...(conditions.defaultDecade == null ? {} : { defaultDecade: conditions.defaultDecade }),
  };
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

  genChords(
    key: string,
    scale: DisplayScaleName,
    type: string,
    segment = DEFAULT_SEGMENT.name,
    option = DEFAULT_OPTION.name,
    seed?: number,
  ) {
    const direction = chordDirection(type, segment, option);
    return generateChords({
      key,
      scale,
      bars: 8,
      seed,
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
};

declare global {
  interface Window {
    PeithoComposerEngine: typeof ComposerEngine;
  }
}

window.PeithoComposerEngine = ComposerEngine;
