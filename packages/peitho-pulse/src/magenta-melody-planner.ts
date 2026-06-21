import { type NoteEvent } from "@peitho/array";
import type {
  EnrichedChordEvent,
  InternalMelodyRequest,
  MelodyPlanner,
  RawMelodyCandidate,
} from "./melody-contracts";
import {
  loadMusicRnnConstructor,
  type MagentaModel,
  type MagentaNote,
  type MagentaNoteSequence,
} from "./magenta-runtime";

export type MagentaMelodyPlannerConfig = {
  improvRnnCheckpoint?: string;
};

const DEFAULT_IMPROV_RNN =
  "https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/chord_pitches_improv";

const STEPS_PER_QUARTER = 4;

function emptyPrimer(): MagentaNoteSequence {
  return {
    notes: [],
    totalQuantizedSteps: STEPS_PER_QUARTER,
    quantizationInfo: { stepsPerQuarter: STEPS_PER_QUARTER },
  };
}

function notesToPrimer(notes: NoteEvent[]): MagentaNoteSequence {
  if (!notes.length) return emptyPrimer();
  const magentaNotes: MagentaNote[] = notes.map((n) => ({
    pitch: n.midi,
    quantizedStartStep: n.step,
    quantizedEndStep: n.step + n.len,
    velocity: n.vel ?? 90,
  }));
  const totalSteps = Math.max(...magentaNotes.map((n) => n.quantizedEndStep));
  return {
    notes: magentaNotes,
    totalQuantizedSteps: totalSteps,
    quantizationInfo: { stepsPerQuarter: STEPS_PER_QUARTER },
  };
}

function toNoteEvents(sequence: MagentaNoteSequence): NoteEvent[] {
  return sequence.notes
    .filter((n) => !n.isDrum)
    .map((n) => ({
      step: n.quantizedStartStep,
      len: Math.max(1, n.quantizedEndStep - n.quantizedStartStep),
      midi: n.pitch,
      vel: n.velocity != null && n.velocity > 0 ? Math.max(n.velocity, 80) : 90,
    }));
}

function chordsToSymbols(chords: EnrichedChordEvent[], bars: number): string[] {
  const stepsPerHalfBar = 8;
  const symbols: string[] = [];

  for (let halfBar = 0; halfBar < bars * 2; halfBar += 1) {
    const step = halfBar * stepsPerHalfBar;
    const chord = chords.find(
      (c) => c.start * stepsPerHalfBar <= step && step < (c.start + c.len) * stepsPerHalfBar,
    );
    symbols.push(chord?.name ?? "N.C.");
  }

  return symbols;
}

function candidateTemperatures(count: number, density: number, sync: number): number[] {
  const base = 0.8 + density * 0.35 + sync * 0.15;
  const spread = 0.12;
  return Array.from({ length: count }, (_, i) => {
    const offset = count > 1 ? (i / (count - 1) - 0.5) * 2 * spread : 0;
    return Math.max(0.5, Math.min(1.6, base + offset));
  });
}

function deriveSeed(baseSeed: number, index: number): number {
  return ((baseSeed * 1000 + index * 137) & 0x7fffffff) >>> 0;
}

export class MagentaMelodyPlanner implements MelodyPlanner {
  private config: Required<MagentaMelodyPlannerConfig>;
  private improvRnn: MagentaModel | null = null;
  private ready = false;

  constructor(config: MagentaMelodyPlannerConfig = {}) {
    this.config = {
      improvRnnCheckpoint: config.improvRnnCheckpoint ?? DEFAULT_IMPROV_RNN,
    };
  }

  private async ensureReady(): Promise<void> {
    if (this.ready) return;
    const MusicRNN = await loadMusicRnnConstructor();
    this.improvRnn = new MusicRNN(this.config.improvRnnCheckpoint);
    await this.improvRnn.initialize();
    this.ready = true;
  }

  async generate(request: InternalMelodyRequest): Promise<RawMelodyCandidate[]> {
    await this.ensureReady();

    const totalSteps = request.bars * request.beatsPerBar * request.stepsPerBeat;
    const chordSymbols = chordsToSymbols(request.chords, request.bars);
    const temperatures = candidateTemperatures(request.candidateCount, request.density, request.sync);

    const candidates: RawMelodyCandidate[] = [];

    for (let i = 0; i < request.candidateCount; i++) {
      const seed = deriveSeed(request.seed, i);
      const temperature = temperatures[i];

      const primer =
        request.target === "counter" && request.melody?.length
          ? notesToPrimer(request.melody)
          : emptyPrimer();

      const sequence = await this.improvRnn!.continueSequence(
        primer,
        totalSteps,
        temperature,
        chordSymbols,
      );

      candidates.push({
        notes: toNoteEvents(sequence),
        source: {
          provider: "magenta",
          model: "ImprovRNN",
          modelVersion: "chord_pitches_improv",
          seed,
          conditions: {
            temperature,
            chordSymbols: chordSymbols.slice(0, 4),
            target: request.target,
            density: request.density,
            sync: request.sync,
          },
        },
      });
    }

    return candidates;
  }
}
