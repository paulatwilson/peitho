import * as ort from "onnxruntime-node";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { ScaleName, ProgressionSeedMode, ProgressionSeed } from "@peitho/array";
import {
  chordSymbolsToRoman,
  validateProgressionSeed,
  curateProgressionSeeds,
} from "@peitho/array";
import type { ChordGenRequest, ChordGenResult, ResolvedControls, ModelVariant, Genre, Decade } from "./types.ts";
import { MODEL_FILES, CONDITIONAL_MODELS } from "./types.ts";
import { VOCAB_SIZE, NUM_TOKENS, START_TOKEN, END_TOKEN, primarySymbol } from "./token-map.ts";
import { buildScaleMask, addMask } from "./scale-mask.ts";
import { buildCadenceMasks } from "./cadence.ts";
import {
  mulberry32,
  deriveCandidateSeed,
  softmax,
  sampleMultinomial,
  sampleGreedy,
  sampleTopK,
  sampleTopP,
} from "./sampler.ts";
import {
  deriveChordCount,
  deriveHarmonicRhythm,
  validateHarmonicRhythm,
} from "./harmonic-rhythm.ts";

const MODEL_VERSION = "1.0.0";

const GENRES: Genre[] = [
  "Rock", "Folk", "Pop", "Soundtrack", "R&B, Funk & Soul",
  "Country", "Jazz", "Experimental", "Religious Music", "Reggae & Ska",
  "Hip Hop", "Electronic", "Comedy", "Metal", "Blues", "World Music",
  "Disco", "Classical", "New Age", "Darkwave",
];

const DECADES: Decade[] = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

function scaleModeToSeedMode(scale: ScaleName): ProgressionSeedMode {
  return scale === "major" || scale === "pentatonic-major" ? "major" : "minor";
}

function tensionToTemperature(tension: number): number {
  // tension 0.0 → temperature 0.5 (conservative)
  // tension 1.0 → temperature 1.5 (adventurous)
  return 0.5 + tension;
}

function buildStyleVector(genres?: Genre[], decade?: Decade): Float32Array {
  const style = new Float32Array(28);
  if (genres && genres.length > 0) {
    for (const genre of genres) {
      const idx = GENRES.indexOf(genre);
      if (idx >= 0) style[idx] = 1;
    }
    const total = genres.filter(g => GENRES.includes(g)).length;
    if (total > 0) for (let i = 0; i < 20; i++) style[i] /= total;
  }
  if (decade != null) {
    const idx = DECADES.indexOf(decade);
    if (idx >= 0) style[20 + idx] = 1;
  }
  return style;
}

function applyTemperature(logits: Float32Array, temperature: number): Float32Array {
  if (temperature === 1) return new Float32Array(logits);
  const out = new Float32Array(logits.length);
  const inv = 1 / temperature;
  for (let i = 0; i < logits.length; i++) out[i] = logits[i] * inv;
  return out;
}

// Zero out start/end special tokens — always blocked from output
function blockSpecials(logits: Float32Array): void {
  logits[START_TOKEN] = -Infinity;
  logits[END_TOKEN] = -Infinity;
}

// Suppress recent tokens: hard-block immediate previous (unless allowed),
// subtract logit penalty for tokens within the repeat window.
function applyRepeatSuppression(
  logits: Float32Array,
  history: number[],
  window: number,
  penalty: number,
  allowImmediate: boolean,
): void {
  if (history.length === 0) return;

  // Hard-block the immediately previous token
  if (!allowImmediate) {
    const prev = history[history.length - 1];
    if (prev < VOCAB_SIZE) logits[prev] = -Infinity;
  }

  // Soft penalty for the rest of the window
  const winStart = Math.max(0, history.length - window);
  const winEnd = allowImmediate ? history.length : history.length - 1;
  for (let i = winStart; i < winEnd; i++) {
    const tok = history[i];
    if (tok < VOCAB_SIZE && logits[tok] > -Infinity) {
      logits[tok] -= penalty;
    }
  }
}

// Score how much 2–4 chord motifs repeat within a progression.
// Used to weight candidates by the repetition parameter during ranking.
function motifReuseScore(degrees: string[]): number {
  let score = 0;
  for (const n of [2, 3, 4]) {
    const seen = new Map<string, number>();
    for (let i = 0; i <= degrees.length - n; i++) {
      const key = degrees.slice(i, i + n).join(",");
      const count = (seen.get(key) ?? 0) + 1;
      seen.set(key, count);
      if (count > 1) score += n; // reward each recurrence weighted by motif length
    }
  }
  return score;
}

// Safety: if all logits ended up at -Infinity (over-constrained), fall back
// to blocking only special tokens and the immediate previous chord.
function ensureValidLogits(logits: Float32Array, lastToken: number | undefined): void {
  if (logits.some(v => v > -Infinity)) return;
  logits.fill(0);
  logits[START_TOKEN] = -Infinity;
  logits[END_TOKEN] = -Infinity;
  if (lastToken != null && lastToken < VOCAB_SIZE) logits[lastToken] = -Infinity;
}

type SessionCache = { session: ort.InferenceSession; variant: ModelVariant };

export class ChordSeqAIGenerator {
  private sessionCache: SessionCache | null = null;
  private modelsDir: string;

  constructor(modelsDir?: string) {
    const dir = dirname(fileURLToPath(import.meta.url));
    this.modelsDir = modelsDir ?? join(
      dir,
      "../../../../.contrib/chord-progression-ai/chord-seq-ai-app/public/models",
    );
  }

  private async session(model: ModelVariant): Promise<ort.InferenceSession> {
    if (this.sessionCache?.variant === model) return this.sessionCache.session;
    const path = join(this.modelsDir, MODEL_FILES[model]);
    const session = await ort.InferenceSession.create(path, { executionProviders: ["cpu"] });
    this.sessionCache = { session, variant: model };
    return session;
  }

  async generate(request: ChordGenRequest): Promise<ChordGenResult> {
    // ── Resolve controls ────────────────────────────────────────────────────
    const {
      key,
      mode,
      bars,
      tension,
      repetition,
      cadence,
      seed = 0,
      candidateCount = 4,
      model = "conditional_medium",
      genres,
      decade,
      primerChords = [],
      samplingStrategy = "multinomial",
      topK,
      topP,
      scalePolicy = "cadential",
      cadencePolicy = "repair",
      allowImmediateRepeat = false,
      repetitionWindow = 1,
    } = request;

    const temperature = request.temperature ?? tensionToTemperature(tension);
    const repetitionPenalty = request.repetitionPenalty ?? 3.0;
    const seedMode = scaleModeToSeedMode(mode);
    const chordCount = request.chordCount ?? deriveChordCount(bars, request.chordLengths);

    if (request.harmonicRhythm) {
      const err = validateHarmonicRhythm(request.harmonicRhythm, chordCount, bars);
      if (err) throw new Error(`ChordSeqAIGenerator: ${err}`);
    }

    const resolvedControls: ResolvedControls = {
      temperature,
      repetitionPenalty,
      repetitionWindow,
      chordCount,
      scalePolicy,
      cadencePolicy,
    };

    // ── Build static masks ──────────────────────────────────────────────────
    const scaleMask = scalePolicy !== "chromatic" ? buildScaleMask(key, mode) : null;
    const cadenceMasks = cadencePolicy === "repair"
      ? buildCadenceMasks(key, mode, cadence, chordCount)
      : [];
    const cadenceMaskAtPos = new Map(cadenceMasks.map(cm => [cm.position, cm.mask]));

    // ── Load model ─────────────────────────────────────────────────────────
    const sess = await this.session(model);
    const isConditional = CONDITIONAL_MODELS.has(model);
    const styleVector = isConditional ? buildStyleVector(genres, decade) : undefined;

    // ── Generate candidates ─────────────────────────────────────────────────
    const rawCandidates: ChordGenResult["candidates"] = [];

    for (let ci = 0; ci < candidateCount; ci++) {
      const cSeed = deriveCandidateSeed(seed, ci);
      const rng = mulberry32(cSeed);

      // Start from any primer tokens; we'll generate until we reach chordCount
      const tokens: number[] = [...primerChords];

      while (tokens.length < chordCount) {
        const pos = tokens.length; // 0-indexed position of the token we're about to predict

        // Build the 256-length input sequence
        const inputSeq = new BigInt64Array(256).fill(0n);
        inputSeq[0] = BigInt(START_TOKEN);
        for (let i = 0; i < tokens.length && i < 255; i++) {
          inputSeq[i + 1] = BigInt(tokens[i]);
        }

        // Run inference
        const feeds: Record<string, ort.Tensor> = {
          "input.1": new ort.Tensor("int64", inputSeq, [1, 256]),
        };
        if (isConditional && styleVector) {
          feeds["onnx::Gemm_1"] = new ort.Tensor("float32", styleVector, [1, 28]);
        }

        const outputs = await sess.run(feeds);
        const outData = Object.values(outputs)[0].data as Float32Array;

        // Output shape: [1, 256, NUM_TOKENS] — extract the column for `pos`
        const logits = applyTemperature(
          outData.slice(pos * NUM_TOKENS, (pos + 1) * NUM_TOKENS),
          temperature,
        );

        // Block special tokens
        blockSpecials(logits);

        // Suppress repeats
        applyRepeatSuppression(logits, tokens, repetitionWindow, repetitionPenalty, allowImmediateRepeat);

        // Scale masking
        if (scaleMask) {
          const isCadentialPos = cadenceMaskAtPos.has(pos);
          // strict: always mask; cadential: only mask non-cadential positions
          if (scalePolicy === "strict" || !isCadentialPos) {
            addMask(logits, scaleMask);
          }
        }

        // Cadence enforcement (repair policy)
        const cMask = cadenceMaskAtPos.get(pos);
        if (cMask) addMask(logits, cMask);

        // Safety: if over-constrained, relax to minimum valid state
        ensureValidLogits(logits, tokens.at(-1));

        // Sample
        let next: number;
        switch (samplingStrategy) {
          case "greedy":  next = sampleGreedy(logits); break;
          case "top-k":   next = sampleTopK(logits, topK ?? 50, rng); break;
          case "top-p":   next = sampleTopP(logits, topP ?? 0.9, rng); break;
          default:        next = sampleMultinomial(softmax(logits), rng);
        }

        if (next === END_TOKEN) break;
        tokens.push(next);
      }

      if (tokens.length < 2) continue; // too short to be useful

      // ── Post-process ───────────────────────────────────────────────────
      const chordSymbols = tokens.map(id => primarySymbol(id));

      let degrees: string[];
      try {
        degrees = chordSymbolsToRoman(chordSymbols, key, seedMode);
      } catch {
        continue; // conversion failed — symbol outside the mapping
      }

      const harmonicRhythm = request.harmonicRhythm && request.harmonicRhythm.length === degrees.length
        ? request.harmonicRhythm
        : deriveHarmonicRhythm(bars, degrees.length, request.chordLengths, cSeed);

      const progressionSeed: ProgressionSeed = {
        degrees,
        mode: seedMode,
        cadence,
        tension,
        repetition,
        harmonicRhythm,
        source: {
          provider: "chord-seq-ai",
          model: MODEL_FILES[model].replace(".onnx", ""),
          modelVersion: MODEL_VERSION,
          seed: cSeed,
          conditions: {
            genres: genres ?? [],
            decade: decade ?? null,
            temperature,
            scalePolicy,
          },
        },
      };

      const validation = validateProgressionSeed(progressionSeed);

      // Reject policy: discard candidates where cadence validation fails
      if (cadencePolicy === "reject" && !validation.metrics.cadenceValid) continue;

      rawCandidates.push({ tokenIds: tokens, chordSymbols, progressionSeed, validation });
    }

    // ── Rank candidates ─────────────────────────────────────────────────────
    // Primary: validation score (harmonic quality)
    // Secondary: motif reuse weighted by the repetition parameter
    rawCandidates.sort((a, b) => {
      const motifA = motifReuseScore(a.progressionSeed.degrees) * repetition * 5;
      const motifB = motifReuseScore(b.progressionSeed.degrees) * repetition * 5;
      return (b.validation.score + motifB) - (a.validation.score + motifA);
    });

    return { candidates: rawCandidates, resolvedControls };
  }
}
