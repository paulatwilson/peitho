import type { ChordEvent, NoteEvent, OptionProfile, ScaleInput, SegmentProfile } from "@peitho/array";

export type EnrichedChordEvent = ChordEvent & {
  degree?: number;
  cadenceRole?: "approach" | "arrival" | "passing" | null;
  phrasePosition: "opening" | "middle" | "closing";
  barIndex: number;
};

export type MelodyGenerationRequest = {
  target: "melody" | "counter";
  bars: number;
  beatsPerBar: number;
  stepsPerBeat: number;
  tempo: number;
  key: string;
  scale: ScaleInput;
  seed: number;
  candidateCount: number;
  density: number;
  sync: number;
  rhythm: number;
  melodyShare: number;
  segmentProfile?: Partial<SegmentProfile>;
  optionProfile?: Partial<OptionProfile>;
  prompt?: string;
  keywords?: string[];
  chords: ChordEvent[];
  melody?: NoteEvent[];
  existingNotes?: NoteEvent[];
  planner?: "magenta" | "midigenai" | "amt";
};

export type InternalMelodyRequest = Omit<MelodyGenerationRequest, "chords"> & {
  chords: EnrichedChordEvent[];
};

export type RawMelodyCandidate = {
  notes: NoteEvent[];
  source: {
    provider: string;
    model: string;
    modelVersion?: string;
    seed: number;
    conditions: Record<string, unknown>;
  };
};

export type MelodyRepairReport = {
  removedEvents: number;
  quantisedEvents: number;
  pitchRepairs: number;
  overlapRepairs: number;
  densityRepairs: number;
  envelopeRepairs: number;
};

export type MelodyCandidateReport = {
  notes: NoteEvent[];
  source: RawMelodyCandidate["source"];
  score: number;
  metrics: {
    validStructure: boolean;
    chordToneDownbeatRatio: number;
    scaleOrChordToneRatio: number;
    registerFit: number;
    densityFit: number;
    syncFit: number;
    rhythmFit: number;
    contourContinuity: number;
    motifReuse: number;
    phraseResolution: number;
    melodyCounterSeparation?: number;
  };
  repair: MelodyRepairReport;
  warnings: string[];
};

export type MelodyPlanner = {
  generate(request: InternalMelodyRequest): Promise<RawMelodyCandidate[]>;
};
