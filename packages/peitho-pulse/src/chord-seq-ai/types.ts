import type { ScaleName, ProgressionSeed, ProgressionSeedReport, ProgressionSeedCadence } from "@peitho/array";

export type ModelVariant =
  | "recurrent"
  | "transformer_small"
  | "transformer_medium"
  | "transformer_large"
  | "conditional_small"
  | "conditional_medium"
  | "conditional_large";

export const MODEL_FILES: Record<ModelVariant, string> = {
  recurrent: "recurrent_net.onnx",
  transformer_small: "transformer_small.onnx",
  transformer_medium: "transformer_medium.onnx",
  transformer_large: "transformer_large.onnx",
  conditional_small: "conditional_small.onnx",
  conditional_medium: "conditional_medium.onnx",
  conditional_large: "conditional_large.onnx",
};

export const CONDITIONAL_MODELS = new Set<ModelVariant>([
  "conditional_small",
  "conditional_medium",
  "conditional_large",
]);

// Exact genre strings from chord-seq-ai conditions.ts — order is index-significant
export type Genre =
  | "Rock" | "Folk" | "Pop" | "Soundtrack" | "R&B, Funk & Soul"
  | "Country" | "Jazz" | "Experimental" | "Religious Music" | "Reggae & Ska"
  | "Hip Hop" | "Electronic" | "Comedy" | "Metal" | "Blues" | "World Music"
  | "Disco" | "Classical" | "New Age" | "Darkwave";

export type Decade = 1950 | 1960 | 1970 | 1980 | 1990 | 2000 | 2010 | 2020;

export type ScalePolicy = "strict" | "cadential" | "chromatic";
export type CadencePolicy = "reject" | "repair";
export type SamplingStrategy = "multinomial" | "greedy" | "top-k" | "top-p";

export type ChordGenRequest = {
  // ── Required Peitho macros ─────────────────────────────────────────────────
  key: string;
  mode: ScaleName;
  bars: number;
  tension: number;            // 0–1; maps to temperature internally
  repetition: number;         // 0–1; drives motif-reuse weighting during ranking
  cadence: ProgressionSeedCadence;

  // ── Harmonic structure ─────────────────────────────────────────────────────
  chordLengths?: number[];    // weight distribution for deriving chord count
  chordCount?: number;        // explicit override; derived from bars+chordLengths if absent
  harmonicRhythm?: number[];  // explicit durations; length===chordCount, sum===bars*2

  // ── Policies ──────────────────────────────────────────────────────────────
  cadencePolicy?: CadencePolicy;  // default "repair"
  scalePolicy?: ScalePolicy;      // default "cadential"

  // ── Immediate-repeat control (independent of repetition macro) ─────────────
  allowImmediateRepeat?: boolean; // default false
  repetitionPenalty?: number;     // logit-subtraction penalty for window tokens (default 3.0)
  repetitionWindow?: number;      // how many recent tokens to penalise (default 1)

  // ── Model & style ──────────────────────────────────────────────────────────
  model?: ModelVariant;           // default "conditional_medium"
  genres?: Genre[];               // multi-hot genre conditioning
  decade?: Decade;                // one-hot decade conditioning
  primerChords?: number[];        // ChordSeqAI token IDs to seed continuation

  // ── Sampling ───────────────────────────────────────────────────────────────
  temperature?: number;           // expert override; bypasses tension mapping
  seed?: number;                  // default 0; each candidate gets a derived sub-seed
  samplingStrategy?: SamplingStrategy; // default "multinomial"
  topK?: number;                  // used when samplingStrategy === "top-k"
  topP?: number;                  // used when samplingStrategy === "top-p"
  candidateCount?: number;        // default 4
};

export type ResolvedControls = {
  temperature: number;
  repetitionPenalty: number;
  repetitionWindow: number;
  chordCount: number;
  scalePolicy: ScalePolicy;
  cadencePolicy: CadencePolicy;
};

export type ChordGenResult = {
  candidates: {
    tokenIds: number[];
    chordSymbols: string[];
    progressionSeed: ProgressionSeed;
    validation: ProgressionSeedReport;
  }[];
  resolvedControls: ResolvedControls;
};
