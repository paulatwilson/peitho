import { createEmptyPattern, type ChordEvent, type NoteEvent, type PeithoPattern } from "@peitho/array";
import type { PulsePlanner, PulseRequest } from "./contracts";
import { repairNotes } from "./repair";

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

export type MagentaPlannerConfig = {
  improvRnnCheckpoint?: string;
  drumsRnnCheckpoint?: string;
};

const DEFAULT_IMPROV_RNN =
  "https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/chord_pitches_improv";
const DEFAULT_DRUMS_RNN =
  "https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/drum_kit_rnn";

function chordsToSymbols(chords: ChordEvent[], bars: number): string[] {
  const stepsPerHalfBar = 8;
  const symbols: string[] = [];

  for (let halfBar = 0; halfBar < bars * 2; halfBar += 1) {
    const step = halfBar * stepsPerHalfBar;
    const chord = chords.find(
      (candidate) =>
        candidate.start * stepsPerHalfBar <= step &&
        step < (candidate.start + candidate.len) * stepsPerHalfBar,
    );
    symbols.push(chord?.name ?? "N.C.");
  }

  return symbols;
}

function toNoteEvents(sequence: MagentaNoteSequence): NoteEvent[] {
  return sequence.notes.filter((note) => !note.isDrum).map((note) => ({
    step: note.quantizedStartStep,
    len: Math.max(1, note.quantizedEndStep - note.quantizedStartStep),
    midi: note.pitch,
    vel: note.velocity,
  }));
}

function toDrumSteps(sequence: MagentaNoteSequence): Record<string, number[]> {
  const drums = { kick: [] as number[], snare: [] as number[], hat: [] as number[], open: [] as number[] };

  for (const note of sequence.notes) {
    if (!note.isDrum) continue;
    if ([35, 36].includes(note.pitch)) drums.kick.push(note.quantizedStartStep);
    else if ([38, 40].includes(note.pitch)) drums.snare.push(note.quantizedStartStep);
    else if ([42, 44].includes(note.pitch)) drums.hat.push(note.quantizedStartStep);
    else if (note.pitch === 46) drums.open.push(note.quantizedStartStep);
  }

  return drums;
}

function emptyPrimer(stepsPerQuarter: number): MagentaNoteSequence {
  return { notes: [], totalQuantizedSteps: stepsPerQuarter, quantizationInfo: { stepsPerQuarter } };
}

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
    const magenta = await import("@magenta/music");
    this.improvRnn = new magenta.MusicRNN(this.config.improvRnnCheckpoint) as unknown as MagentaModel;
    this.drumsRnn = new magenta.MusicRNN(this.config.drumsRnnCheckpoint) as unknown as MagentaModel;
    await Promise.all([this.improvRnn.initialize(), this.drumsRnn.initialize()]);
    this.ready = true;
  }

  async generate(request: PulseRequest): Promise<PeithoPattern> {
    const pattern = createEmptyPattern({ bars: request.bars });
    const seed = request.seed ?? 0;
    const stepsPerQuarter = 4;
    const totalSteps = request.bars * 16;
    const temperature = 0.8 + request.density * 0.8 + request.sync * 0.4;

    if (request.target === "chords") return pattern;
    await this.ensureReady();

    if (request.target === "drums") {
      const sequence = await this.drumsRnn!.continueSequence(
        emptyPrimer(stepsPerQuarter),
        totalSteps,
        temperature,
      );
      pattern.drums = toDrumSteps(sequence);
      return pattern;
    }

    const chordSymbols = request.chords ? chordsToSymbols(request.chords, request.bars) : [];
    if (request.target === "melody") {
      const sequence = await this.improvRnn!.continueSequence(
        emptyPrimer(stepsPerQuarter),
        totalSteps,
        temperature,
        chordSymbols,
      );
      pattern.melody = repairNotes(toNoteEvents(sequence), request, seed);
      return pattern;
    }

    const primerNotes: MagentaNote[] = (request.melody ?? []).map((note) => ({
      pitch: note.midi,
      quantizedStartStep: note.step,
      quantizedEndStep: note.step + note.len,
      velocity: note.vel ?? 90,
    }));
    const primer = primerNotes.length > 0
      ? {
          notes: primerNotes,
          totalQuantizedSteps: primerNotes.at(-1)!.quantizedEndStep,
          quantizationInfo: { stepsPerQuarter },
        }
      : emptyPrimer(stepsPerQuarter);
    const sequence = await this.improvRnn!.continueSequence(
      primer,
      totalSteps,
      temperature * 0.85,
      chordSymbols,
    );
    pattern.counter = repairNotes(toNoteEvents(sequence), request, seed + 1);
    return pattern;
  }
}
