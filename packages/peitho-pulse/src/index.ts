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
