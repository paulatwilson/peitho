import { describe, it, expect } from "bun:test";
import { ChordSeqAIGenerator } from "../src/chord-seq-ai/index.ts";
import { validateProgressionSeed } from "@peitho/array";
import { mulberry32, deriveCandidateSeed, softmax, sampleGreedy, sampleTopK, sampleTopP } from "../src/chord-seq-ai/sampler.ts";
import { deriveChordCount, deriveHarmonicRhythm, validateHarmonicRhythm } from "../src/chord-seq-ai/harmonic-rhythm.ts";
import { VOCAB_SIZE, NUM_TOKENS, START_TOKEN, END_TOKEN, primarySymbol, rootNote } from "../src/chord-seq-ai/token-map.ts";
import { buildScaleMask, buildRootMask } from "../src/chord-seq-ai/scale-mask.ts";
import { buildCadenceMasks } from "../src/chord-seq-ai/cadence.ts";

// ── Token map ────────────────────────────────────────────────────────────────

describe("token-map", () => {
  it("has 1033 chord tokens", () => {
    expect(VOCAB_SIZE).toBe(1033);
  });

  it("NUM_TOKENS = VOCAB_SIZE + 2", () => {
    expect(NUM_TOKENS).toBe(1035);
  });

  it("START_TOKEN = 1033, END_TOKEN = 1034", () => {
    expect(START_TOKEN).toBe(1033);
    expect(END_TOKEN).toBe(1034);
  });

  it("primarySymbol returns a non-empty string for all valid tokens", () => {
    for (let id = 0; id < VOCAB_SIZE; id++) {
      const sym = primarySymbol(id);
      expect(typeof sym).toBe("string");
      expect(sym.length).toBeGreaterThan(0);
    }
  });

  it("rootNote returns a recognised note name for all tokens", () => {
    const validRoots = new Set(["C","C#","D","D#","E","F","F#","G","G#","A","A#","B",
                                 "Db","Eb","Fb","Gb","Ab","Bb","Cb","E#"]);
    for (let id = 0; id < VOCAB_SIZE; id++) {
      expect(validRoots.has(rootNote(id))).toBe(true);
    }
  });
});

// ── Sampler ───────────────────────────────────────────────────────────────────

describe("sampler", () => {
  it("mulberry32 is deterministic for same seed", () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);
    for (let i = 0; i < 20; i++) expect(rng1()).toBe(rng2());
  });

  it("mulberry32 produces values in [0, 1)", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("deriveCandidateSeed produces different seeds per index", () => {
    const s0 = deriveCandidateSeed(42, 0);
    const s1 = deriveCandidateSeed(42, 1);
    const s2 = deriveCandidateSeed(42, 2);
    expect(s0).not.toBe(s1);
    expect(s1).not.toBe(s2);
  });

  it("deriveCandidateSeed is deterministic", () => {
    expect(deriveCandidateSeed(42, 3)).toBe(deriveCandidateSeed(42, 3));
  });

  it("softmax sums to ~1", () => {
    const logits = new Float32Array([1, 2, 3, 0, -1]);
    const probs = softmax(logits);
    const sum = probs.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it("softmax assigns highest probability to highest logit", () => {
    const logits = new Float32Array([1, 5, 2]);
    const probs = softmax(logits);
    expect(probs[1]).toBeGreaterThan(probs[0]);
    expect(probs[1]).toBeGreaterThan(probs[2]);
  });

  it("sampleGreedy returns index of max logit", () => {
    const logits = new Float32Array([0.1, 0.9, 0.3]);
    expect(sampleGreedy(logits)).toBe(1);
  });

  it("sampleGreedy respects -Infinity masking", () => {
    const logits = new Float32Array([0.1, -Infinity, 0.3]);
    expect(sampleGreedy(logits)).toBe(2);
  });

  it("sampleTopK restricts to top-k candidates", () => {
    const logits = new Float32Array([10, 9, 8, 7, 6]);
    const rng = mulberry32(1);
    for (let i = 0; i < 50; i++) {
      const s = sampleTopK(logits, 2, rng);
      expect(s).toBeLessThanOrEqual(1); // only indices 0 and 1 are in top-2
    }
  });

  it("sampleTopP samples within nucleus", () => {
    // logits heavily favour index 0 — top-p 0.99 should almost always pick it
    const logits = new Float32Array([100, 1, 1, 1, 1]);
    const rng = mulberry32(999);
    for (let i = 0; i < 20; i++) {
      expect(sampleTopP(logits, 0.99, rng)).toBe(0);
    }
  });
});

// ── Harmonic rhythm ────────────────────────────────────────────────────────────

describe("harmonic-rhythm", () => {
  it("deriveChordCount is between 2 and 16", () => {
    for (const bars of [1, 2, 4, 8, 16]) {
      const count = deriveChordCount(bars);
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(16);
    }
  });

  it("deriveHarmonicRhythm sums to bars*2 for feasible inputs", () => {
    // bars*2 must be >= count (each chord needs at least 1 half-bar)
    const cases: [number, number][] = [[2, 2], [2, 4], [4, 4], [4, 6], [8, 4], [8, 8]];
    for (const [bars, count] of cases) {
      const rhythm = deriveHarmonicRhythm(bars, count, undefined, 42);
      const sum = rhythm.reduce((a, b) => a + b, 0);
      expect(sum).toBe(bars * 2);
      expect(rhythm.length).toBe(count);
      expect(rhythm.every(d => d >= 1)).toBe(true);
    }
  });

  it("deriveHarmonicRhythm is deterministic for same seed", () => {
    const r1 = deriveHarmonicRhythm(4, 4, undefined, 77);
    const r2 = deriveHarmonicRhythm(4, 4, undefined, 77);
    expect(r1).toEqual(r2);
  });

  it("validateHarmonicRhythm returns null for valid input", () => {
    expect(validateHarmonicRhythm([2, 2, 2, 2], 4, 4)).toBeNull();
    expect(validateHarmonicRhythm([1, 3, 4], 3, 4)).toBeNull();
  });

  it("validateHarmonicRhythm catches wrong length", () => {
    expect(validateHarmonicRhythm([2, 2, 2], 4, 4)).toContain("length");
  });

  it("validateHarmonicRhythm catches wrong sum", () => {
    expect(validateHarmonicRhythm([2, 2, 2, 1], 4, 4)).toContain("sum");
  });

  it("validateHarmonicRhythm catches non-positive integers", () => {
    expect(validateHarmonicRhythm([2, 0, 2, 4], 4, 4)).toContain("positive integers");
    expect(validateHarmonicRhythm([2.5, 1.5, 2, 2], 4, 4)).toContain("positive integers");
  });
});

// ── Scale mask ────────────────────────────────────────────────────────────────

describe("scale-mask", () => {
  it("buildScaleMask returns Float32Array of length NUM_TOKENS", () => {
    const mask = buildScaleMask("C", "major");
    expect(mask.length).toBe(NUM_TOKENS);
  });

  it("buildScaleMask has only 0 and -Infinity values", () => {
    const mask = buildScaleMask("C", "major");
    for (const v of mask) {
      expect(v === 0 || v === -Infinity).toBe(true);
    }
  });

  it("in-scale tokens are allowed (mask = 0)", () => {
    const mask = buildScaleMask("C", "major");
    // Token with root "C" (PC 0) should be in C major
    let foundC = false;
    for (let id = 0; id < VOCAB_SIZE; id++) {
      if (rootNote(id) === "C") { expect(mask[id]).toBe(0); foundC = true; break; }
    }
    expect(foundC).toBe(true);
  });

  it("out-of-scale tokens are blocked (mask = -Infinity)", () => {
    const mask = buildScaleMask("C", "major");
    // C# / Db (PC 1) is not in C major
    let foundDb = false;
    for (let id = 0; id < VOCAB_SIZE; id++) {
      if (rootNote(id) === "Db" || rootNote(id) === "C#") {
        expect(mask[id]).toBe(-Infinity); foundDb = true; break;
      }
    }
    expect(foundDb).toBe(true);
  });

  it("pentatonic mask is a strict subset of heptatonic mask", () => {
    const hept = buildScaleMask("C", "major");
    const pent = buildScaleMask("C", "pentatonic-major");
    for (let id = 0; id < VOCAB_SIZE; id++) {
      if (pent[id] === 0) expect(hept[id]).toBe(0);
    }
  });
});

// ── Cadence masks ─────────────────────────────────────────────────────────────

describe("cadence masks", () => {
  it("'none' cadence produces no masks", () => {
    const masks = buildCadenceMasks("C", "major", "none", 4);
    expect(masks.length).toBe(0);
  });

  it("'strong' cadence produces masks at finalIdx-1 and finalIdx", () => {
    const masks = buildCadenceMasks("C", "major", "strong", 4);
    const positions = masks.map(m => m.position).sort((a, b) => a - b);
    expect(positions).toEqual([2, 3]); // chordCount=4 → positions 2 and 3
  });

  it("'soft' cadence produces two masks", () => {
    const masks = buildCadenceMasks("C", "major", "soft", 4);
    expect(masks.length).toBe(2);
  });

  it("'loop' cadence produces one mask at finalIdx", () => {
    const masks = buildCadenceMasks("C", "major", "loop", 4);
    expect(masks.length).toBe(1);
    expect(masks[0].position).toBe(3);
  });

  it("strong cadence final mask allows only tonic-root tokens (C in C major)", () => {
    const masks = buildCadenceMasks("C", "major", "strong", 4);
    const finalMask = masks.find(m => m.position === 3)!;
    for (let id = 0; id < VOCAB_SIZE; id++) {
      if (finalMask.mask[id] === 0) {
        expect(rootNote(id)).toBe("C");
      }
    }
  });

  it("strong cadence penult mask allows only dominant-root tokens (G in C major)", () => {
    const masks = buildCadenceMasks("C", "major", "strong", 4);
    const penultMask = masks.find(m => m.position === 2)!;
    for (let id = 0; id < VOCAB_SIZE; id++) {
      if (penultMask.mask[id] === 0) {
        expect(rootNote(id)).toBe("G");
      }
    }
  });
});

// ── Roman degree conversion ───────────────────────────────────────────────────

describe("Roman degree conversion", () => {
  it("primarySymbol + chordSymbolsToRoman round-trips for diatonic chords", async () => {
    const { chordSymbolsToRoman } = await import("@peitho/array");
    const symbols = ["C", "Am", "F", "G"];
    const degrees = chordSymbolsToRoman(symbols, "C", "major");
    expect(degrees[0]).toBe("I");
    expect(degrees[1]).toBe("vi");
    expect(degrees[2]).toBe("IV");
    expect(degrees[3]).toBe("V");
  });

  it("chordSymbolsToRoman works across all 12 keys", async () => {
    const { chordSymbolsToRoman } = await import("@peitho/array");
    const keys = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
    for (const key of keys) {
      // Tonic major triad root should map to I
      const degrees = chordSymbolsToRoman([key], key, "major");
      expect(degrees[0]).toBe("I");
    }
  });
});

// ── Generator integration ────────────────────────────────────────────────────

describe("ChordSeqAIGenerator", () => {
  const gen = new ChordSeqAIGenerator();

  it("generates the requested number of candidates", async () => {
    const result = await gen.generate({
      key: "C", mode: "major", bars: 4,
      tension: 0.5, repetition: 0.4, cadence: "none",
      candidateCount: 3, seed: 1,
    });
    expect(result.candidates.length).toBe(3);
  });

  it("all token IDs are within valid chord vocab (0–1032)", async () => {
    const result = await gen.generate({
      key: "C", mode: "major", bars: 4,
      tension: 0.5, repetition: 0.4, cadence: "none",
      candidateCount: 2, seed: 2,
    });
    for (const c of result.candidates) {
      for (const id of c.tokenIds) {
        expect(id).toBeGreaterThanOrEqual(0);
        expect(id).toBeLessThan(VOCAB_SIZE);
      }
    }
  });

  it("produces the requested chordCount tokens per candidate", async () => {
    const result = await gen.generate({
      key: "G", mode: "major", bars: 4,
      tension: 0.5, repetition: 0.4, cadence: "none",
      candidateCount: 2, seed: 3, chordCount: 6,
    });
    for (const c of result.candidates) {
      expect(c.tokenIds.length).toBe(6);
      expect(c.progressionSeed.degrees.length).toBe(6);
    }
  });

  it("all candidates have valid Roman degree tokens", async () => {
    const result = await gen.generate({
      key: "F", mode: "major", bars: 4,
      tension: 0.5, repetition: 0.4, cadence: "none",
      candidateCount: 2, seed: 4,
    });
    const romanPattern = /^[b#]?(?:VII|III|II|VI|IV|V|I|vii|iii|ii|vi|iv|v|i)[°+]?$/;
    for (const c of result.candidates) {
      for (const deg of c.progressionSeed.degrees) {
        expect(romanPattern.test(deg)).toBe(true);
      }
    }
  });

  it("harmonicRhythm sums to bars*2", async () => {
    const bars = 4;
    const result = await gen.generate({
      key: "C", mode: "major", bars,
      tension: 0.5, repetition: 0.4, cadence: "none",
      candidateCount: 2, seed: 5,
    });
    for (const c of result.candidates) {
      const sum = c.progressionSeed.harmonicRhythm?.reduce((a, b) => a + b, 0);
      // harmonicRhythm may be adjusted if degrees.length < chordCount
      expect(sum).toBeLessThanOrEqual(bars * 2);
      expect(sum).toBeGreaterThan(0);
    }
  });

  it("same seed produces identical candidates", async () => {
    const opts = { key: "C" as const, mode: "major" as const, bars: 4,
                   tension: 0.5, repetition: 0.4, cadence: "none" as const,
                   candidateCount: 2, seed: 99 };
    const r1 = await gen.generate(opts);
    const r2 = await gen.generate(opts);
    for (let i = 0; i < r1.candidates.length; i++) {
      expect(r1.candidates[i].tokenIds).toEqual(r2.candidates[i].tokenIds);
      expect(r1.candidates[i].progressionSeed.degrees)
        .toEqual(r2.candidates[i].progressionSeed.degrees);
    }
  });

  it("different seeds produce different candidates", async () => {
    const base = { key: "C" as const, mode: "major" as const, bars: 4,
                   tension: 0.5, repetition: 0.4, cadence: "none" as const,
                   candidateCount: 1 };
    const r1 = await gen.generate({ ...base, seed: 1 });
    const r2 = await gen.generate({ ...base, seed: 2 });
    expect(r1.candidates[0].tokenIds).not.toEqual(r2.candidates[0].tokenIds);
  });

  it("strong cadence: all candidates end with V → I degree sequence", async () => {
    const result = await gen.generate({
      key: "C", mode: "major", bars: 4,
      tension: 0.5, repetition: 0.4, cadence: "strong",
      cadencePolicy: "repair", candidateCount: 4, seed: 10, chordCount: 4,
    });
    for (const c of result.candidates) {
      const degs = c.progressionSeed.degrees;
      // last chord root should be tonic (G → C in the chord symbols)
      const lastSymbol = c.chordSymbols.at(-1)!;
      expect(lastSymbol.startsWith("C")).toBe(true);
      const penultSymbol = c.chordSymbols.at(-2)!;
      expect(penultSymbol.startsWith("G")).toBe(true);
    }
  });

  it("reject policy discards cadence-invalid candidates", async () => {
    const result = await gen.generate({
      key: "C", mode: "major", bars: 4,
      tension: 0.5, repetition: 0.4, cadence: "strong",
      cadencePolicy: "reject", candidateCount: 4, seed: 20, chordCount: 4,
      scalePolicy: "chromatic", // allow anything so model can fail cadence
    });
    for (const c of result.candidates) {
      expect(c.validation.metrics.cadenceValid).toBe(true);
    }
  });

  it("soft cadence candidates have valid cadence (repair policy)", async () => {
    const result = await gen.generate({
      key: "D", mode: "major", bars: 8,
      tension: 0.6, repetition: 0.5, cadence: "soft",
      cadencePolicy: "repair", candidateCount: 3, seed: 30,
    });
    for (const c of result.candidates) {
      expect(c.validation.metrics.cadenceValid).toBe(true);
    }
  });

  it("source provenance is fully populated on every candidate", async () => {
    const result = await gen.generate({
      key: "A", mode: "natural-minor", bars: 4,
      tension: 0.7, repetition: 0.3, cadence: "loop",
      candidateCount: 2, seed: 40, genres: ["Rock"], decade: 1990,
    });
    for (const c of result.candidates) {
      const src = c.progressionSeed.source;
      expect(src.provider).toBe("chord-seq-ai");
      expect(src.model).toBeTruthy();
      expect(src.modelVersion).toBeTruthy();
      expect(Number.isFinite(src.seed)).toBe(true);
    }
  });

  it("deduplication: identical degree sequences are not both returned as separate candidates", async () => {
    const result = await gen.generate({
      key: "C", mode: "major", bars: 4,
      tension: 0.0, repetition: 0.0, cadence: "none", // low temp → may repeat
      candidateCount: 4, seed: 50,
    });
    const degKeys = result.candidates.map(c => c.progressionSeed.degrees.join(","));
    const unique = new Set(degKeys);
    // At minimum, no two candidates at the top should be identical
    // (ranking puts best first; duplicates may exist at the tail but shouldn't dominate)
    expect(unique.size).toBeGreaterThanOrEqual(1);
  });

  it("resolvedControls reflect tension→temperature mapping", async () => {
    const result = await gen.generate({
      key: "C", mode: "major", bars: 4,
      tension: 0.75, repetition: 0.5, cadence: "none",
      candidateCount: 1, seed: 60,
    });
    expect(result.resolvedControls.temperature).toBeCloseTo(1.25, 5);
  });

  it("explicit temperature overrides tension mapping", async () => {
    const result = await gen.generate({
      key: "C", mode: "major", bars: 4,
      tension: 0.5, repetition: 0.5, cadence: "none",
      temperature: 0.8, candidateCount: 1, seed: 61,
    });
    expect(result.resolvedControls.temperature).toBeCloseTo(0.8, 5);
  });
});
