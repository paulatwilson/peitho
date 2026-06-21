export type MagentaNote = {
  pitch: number;
  quantizedStartStep: number;
  quantizedEndStep: number;
  velocity?: number;
  isDrum?: boolean;
};

export type MagentaNoteSequence = {
  notes: MagentaNote[];
  totalQuantizedSteps: number;
  quantizationInfo: { stepsPerQuarter: number };
};

export type MagentaModel = {
  initialize(): Promise<void>;
  continueSequence(
    primer: MagentaNoteSequence,
    steps: number,
    temperature: number,
    chordProgression?: string[],
  ): Promise<MagentaNoteSequence>;
};

type MusicRnnConstructor = new (checkpointUrl: string) => MagentaModel;

export async function loadMusicRnnConstructor(): Promise<MusicRnnConstructor> {
  // The package root is its browser build. Importing it under Bun loads Tone.js,
  // which constructs an OfflineAudioContext that does not exist server-side.
  const { MusicRNN } = await import("@magenta/music/node/music_rnn.js");
  return MusicRNN as unknown as MusicRnnConstructor;
}
