import type {
  ChordEvent,
  NoteEvent,
  OptionProfile,
  PeithoPattern,
  ScaleInput,
  SegmentProfile,
} from "@peitho/array";

export type PulseTarget = "chords" | "drums" | "melody" | "counter";

export type PulseRequest = {
  target: PulseTarget;
  key: string;
  scale: ScaleInput;
  bars: number;
  seed?: number;
  density: number;
  split: number;
  sync: number;
  rhythm: number;
  chordLengths?: number[];
  extensionProbability?: number;
  segmentProfile?: Partial<SegmentProfile>;
  optionProfile?: Partial<OptionProfile>;
  chords?: ChordEvent[];
  melody?: NoteEvent[];
  prompt?: string;
  drumStyle?: string;
};

export type PulsePlanner = {
  generate(request: PulseRequest): Promise<PeithoPattern>;
};

export type MlxRuntimeConfig = {
  modelPath: string;
  quantization: "int4" | "int8" | "fp16";
};
