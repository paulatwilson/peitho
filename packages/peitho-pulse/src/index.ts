export type { MlxRuntimeConfig, PulsePlanner, PulseRequest, PulseTarget } from "./contracts";
export { MagentaPulsePlanner } from "./magenta-planner";
export type { MagentaPlannerConfig } from "./magenta-planner";
export { repairNotes } from "./repair";
export { StubPulsePlanner } from "./stub-planner";

export { ChordSeqAIGenerator } from "./chord-seq-ai/generator.ts";
export type {
  CadencePolicy,
  ChordGenRequest,
  ChordGenResult,
  Decade,
  Genre,
  ModelVariant,
  ResolvedControls,
  SamplingStrategy,
  ScalePolicy,
} from "./chord-seq-ai/types.ts";

export type {
  EnrichedChordEvent,
  InternalMelodyRequest,
  MelodyCandidateReport,
  MelodyGenerationRequest,
  MelodyPlanner,
  MelodyRepairReport,
  RawMelodyCandidate,
} from "./melody-contracts";
export { enrichChords, activeChordAt } from "./chord-enrichment";
export { repairMelodyCandidate } from "./melody-repair";
export { scoreMelodyCandidate } from "./melody-scoring";
export { MagentaMelodyPlanner } from "./magenta-melody-planner";
export type { MagentaMelodyPlannerConfig } from "./magenta-melody-planner";
export { generateMelodyCandidates } from "./melody-pipeline";
export { AmtSessionPlayerSpike, buildAmtWorkerRequest } from "./amt-session-player";
export type {
  AmtLockedTrack,
  AmtSessionPlayerConfig,
  AmtSessionPlayerRequest,
  AmtSessionPlayerResult,
  AmtSessionPlayerRole,
} from "./amt-session-player";
