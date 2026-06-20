import {
  type ChordEvent,
  type NoteEvent,
  type OptionProfile,
  type PatternConfig,
  type PeithoPattern,
  type ScaleInput,
  type SegmentProfile,
  createEmptyPattern,
  quantizeToGrid,
  snapToScale,
  thinDensity,
} from "@peitho/array";

// ─── Request / Response types ─────────────────────────────────────────────────

export type PulseTarget = "chords" | "drums" | "melody" | "counter";

export type PulseRequest = {
  target: PulseTarget;

  key: string;
  scale: ScaleInput;
  bars: number;
  seed?: number;

  // macros — already summed: type base + segment delta + option delta
  density: number;
  split: number;
  sync: number;
  rhythm: number;

  // chord generation params resolved from type preset
  chordLengths?: number[];
  extensionProbability?: number;

  // profiles resolved from segment + option presets
  segmentProfile?: Partial<SegmentProfile>;
  optionProfile?: Partial<OptionProfile>;

  // locked musical context — primes the next generation step
  chords?: ChordEvent[];
  melody?: NoteEvent[];

  // LM text prompt — assembled by Composer from direction-presets keywords
  // used by text-conditioned models; ignored by sequence models (Magenta)
  prompt?: string;
};

export type PulsePlanner = {
  generate(request: PulseRequest): Promise<PeithoPattern>;
};

// ─── Repair pass ─────────────────────────────────────────────────────────────

function repairNotes(notes: NoteEvent[], request: PulseRequest, seed: number): NoteEvent[] {
  let out = quantizeToGrid(notes, 4);
  out = snapToScale(out, request.key, request.scale);
  out = thinDensity(out, request.density, seed);
  return out;
}

// ─── Stub planner ─────────────────────────────────────────────────────────────

export class StubPulsePlanner implements PulsePlanner {
  async generate(request: PulseRequest): Promise<PeithoPattern> {
    const config: PatternConfig = { bars: request.bars };
    return createEmptyPattern(config);
  }
}

// ─── Magenta internal types ───────────────────────────────────────────────────

type MagentaModel = {
  initialize(): Promise<void>;
  continueSequence(
    primer: MagentaNoteSequence,
    steps: number,
    temperature: number,
    chordProgression?: string[],
  ): Promise<MagentaNoteSequence>;
};

type MagentaNote = {
  pitch: number;
  quantizedStartStep: number;
  quantizedEndStep: number;
  velocity?: number;
  isDrum?: boolean;
};

type MagentaNoteSequence = {
  notes: MagentaNote[];
  totalQuantizedSteps: number;
  quantizationInfo: { stepsPerQuarter: number };
};

// ─── Magenta helpers ─────────────────────────────────────────────────────────

function chordsToSymbols(chords: ChordEvent[], bars: number): string[] {
  const stepsPerHalfBar = 8;
  const totalHalfBars = bars * 2;
  const symbols: string[] = [];

  for (let hb = 0; hb < totalHalfBars; hb++) {
    const step = hb * stepsPerHalfBar;
    const chord = chords.find(
      (c) => c.start * stepsPerHalfBar <= step && step < (c.start + c.len) * stepsPerHalfBar,
    );
    symbols.push(chord?.name ?? "N.C.");
  }

  return symbols;
}

function magentaToNoteEvents(seq: MagentaNoteSequence): NoteEvent[] {
  return seq.notes
    .filter((n) => !n.isDrum)
    .map((n) => ({
      step: n.quantizedStartStep,
      len: Math.max(1, n.quantizedEndStep - n.quantizedStartStep),
      midi: n.pitch,
      vel: n.velocity,
    }));
}

function magentaToDrumSteps(seq: MagentaNoteSequence): Record<string, number[]> {
  const kick: number[] = [];
  const snare: number[] = [];
  const hat: number[] = [];
  const open: number[] = [];

  for (const n of seq.notes) {
    if (!n.isDrum) continue;
    if ([35, 36].includes(n.pitch)) kick.push(n.quantizedStartStep);
    else if ([38, 40].includes(n.pitch)) snare.push(n.quantizedStartStep);
    else if ([42, 44].includes(n.pitch)) hat.push(n.quantizedStartStep);
    else if (n.pitch === 46) open.push(n.quantizedStartStep);
  }

  return { kick, snare, hat, open };
}

function densityToTemperature(density: number, sync: number): number {
  return 0.8 + density * 0.8 + sync * 0.4;
}

function emptyPrimer(stepsPerQuarter: number): MagentaNoteSequence {
  return {
    notes: [],
    totalQuantizedSteps: stepsPerQuarter,
    quantizationInfo: { stepsPerQuarter },
  };
}

// ─── Magenta planner ─────────────────────────────────────────────────────────

export type MagentaPlannerConfig = {
  improvRnnCheckpoint?: string;
  drumsRnnCheckpoint?: string;
};

const DEFAULT_IMPROV_RNN =
  "https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/chord_pitches_improv";
const DEFAULT_DRUMS_RNN =
  "https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/drum_kit_rnn";

export class MagentaPulsePlanner implements PulsePlanner {
  private config: Required<MagentaPlannerConfig>;
  private improvRnn: MagentaModel | null = null;
  private drumsRnn: MagentaModel | null = null;
  private ready = false;

  constructor(config: MagentaPlannerConfig = {}) {
    this.config = {
      improvRnnCheckpoint: config.improvRnnCheckpoint ?? DEFAULT_IMPROV_RNN,
      drumsRnnCheckpoint: config.drumsRnnCheckpoint ?? DEFAULT_DRUMS_RNN,
    };
  }

  private async ensureReady(): Promise<void> {
    if (this.ready) return;
    const mm = await import("@magenta/music");
    this.improvRnn = new mm.MusicRNN(this.config.improvRnnCheckpoint) as unknown as MagentaModel;
    this.drumsRnn = new mm.MusicRNN(this.config.drumsRnnCheckpoint) as unknown as MagentaModel;
    await Promise.all([this.improvRnn.initialize(), this.drumsRnn.initialize()]);
    this.ready = true;
  }

  async generate(request: PulseRequest): Promise<PeithoPattern> {
    const pattern = createEmptyPattern({ bars: request.bars });
    const seed = request.seed ?? 0;
    const stepsPerQuarter = 4;
    const totalSteps = request.bars * 16;
    const temperature = densityToTemperature(request.density, request.sync);

    switch (request.target) {
      case "chords":
        // chord generation stays with peitho-array for now
        break;

      case "drums": {
        await this.ensureReady();
        const primer = emptyPrimer(stepsPerQuarter);
        const seq = await this.drumsRnn!.continueSequence(primer, totalSteps, temperature);
        pattern.drums = magentaToDrumSteps(seq);
        break;
      }

      case "melody": {
        await this.ensureReady();
        const chordSymbols = request.chords ? chordsToSymbols(request.chords, request.bars) : [];
        const primer = emptyPrimer(stepsPerQuarter);
        const seq = await this.improvRnn!.continueSequence(primer, totalSteps, temperature, chordSymbols);
        pattern.melody = repairNotes(magentaToNoteEvents(seq), request, seed);
        break;
      }

      case "counter": {
        await this.ensureReady();
        const chordSymbols = request.chords ? chordsToSymbols(request.chords, request.bars) : [];
        const primerNotes: MagentaNote[] = (request.melody ?? []).map((n) => ({
          pitch: n.midi,
          quantizedStartStep: n.step,
          quantizedEndStep: n.step + n.len,
          velocity: n.vel ?? 90,
        }));
        const lastStep = primerNotes.length > 0 ? primerNotes[primerNotes.length - 1].quantizedEndStep : 0;
        const primer: MagentaNoteSequence =
          primerNotes.length > 0
            ? { notes: primerNotes, totalQuantizedSteps: lastStep, quantizationInfo: { stepsPerQuarter } }
            : emptyPrimer(stepsPerQuarter);
        const seq = await this.improvRnn!.continueSequence(
          primer,
          totalSteps,
          temperature * 0.85,
          chordSymbols,
        );
        pattern.counter = repairNotes(magentaToNoteEvents(seq), request, seed + 1);
        break;
      }
    }

    return pattern;
  }
}

// ─── MLX planner config (future native runtime) ──────────────────────────────

export type MlxRuntimeConfig = {
  modelPath: string;
  quantization: "int4" | "int8" | "fp16";
};

// ─── Chord progression generator (ChordSeqAI ONNX backend) ───────────────────

export { ChordSeqAIGenerator } from "./chord-seq-ai/generator.ts";
export type {
  ChordGenRequest,
  ChordGenResult,
  ResolvedControls,
  ModelVariant,
  Genre,
  Decade,
  ScalePolicy,
  CadencePolicy,
  SamplingStrategy,
} from "./chord-seq-ai/types.ts";
