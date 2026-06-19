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
  type SegmentProfile,
} from "@peitho/array";
import directionPresets from "./direction-presets.json";

type MacroVector = MacroSettings;

type DirectionTypePreset = {
  name: string;
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

type DirectionPresetLibrary = {
  types: DirectionTypePreset[];
  segments: SegmentPreset[];
  options: OptionPreset[];
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

function pulseKeywords(type: string, segment: string, option: string): string[] {
  const presets = [
    TYPE_PRESETS[type] ?? DEFAULT_TYPE,
    SEGMENT_PRESETS[segment] ?? DEFAULT_SEGMENT,
    OPTION_PRESETS[option] ?? DEFAULT_OPTION,
  ];

  return [...new Set(presets.flatMap((preset) => preset.pulseKeywords))];
}

export const ComposerEngine = {
  NOTE_NAMES: [...NOTE_NAMES],
  KEYS: [...KEYS],
  SCALE_LIST: [...SCALE_LABELS],
  TYPES: PRESETS.types.map((preset) => preset.name),
  SEGMENTS: PRESETS.segments.map((preset) => preset.name),
  OPTIONS: PRESETS.options.map((preset) => preset.name),
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

  genChords(key: string, scale: DisplayScaleName, type: string) {
    const preset = TYPE_PRESETS[type] ?? DEFAULT_TYPE;
    return generateChords({
      key,
      scale,
      bars: 8,
      chordLengths: preset.chordLengths,
      extensionProbability: preset.extensionProbability,
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

  pulseKeywords(type: string, segment: string, option: string) {
    return pulseKeywords(type, segment, option);
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
