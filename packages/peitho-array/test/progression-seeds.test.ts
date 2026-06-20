import { expect, test } from "bun:test";
import progressionSeedBank from "../src/progression-seeds.json";
import {
  canonicalProgressionSeedKey,
  chordSymbolsToRoman,
  curateProgressionSeeds,
  dedupeProgressionSeeds,
  romanToChordSymbols,
  selectProgressionSeed,
  validateProgressionSeed,
  type ProgressionSeed,
} from "../src/index";

function seed(overrides: Partial<ProgressionSeed> = {}): ProgressionSeed {
  return {
    degrees: ["I", "IV", "ii", "V", "I"],
    mode: "major",
    cadence: "strong",
    tension: 0.55,
    repetition: 0.35,
    source: {
      provider: "chord-seq-ai",
      model: "conditional_medium",
      modelVersion: "1.0.0",
      seed: 42,
    },
    ...overrides,
  };
}

test("ships a versioned progression seed-bank target", () => {
  expect(progressionSeedBank).toEqual({ version: 1, seeds: [] });
});

test("normalises chord symbols to key-relative Roman degrees", () => {
  expect(chordSymbolsToRoman(["Am", "F", "C", "G", "E"], "A", "minor")).toEqual(["i", "VI", "III", "VII", "V"]);
  expect(chordSymbolsToRoman(["C", "Db", "F#dim", "G"], "C", "major")).toEqual(["I", "bII", "#iv°", "V"]);
  expect(chordSymbolsToRoman(["C", "F", "G"], "C", "major")).toEqual(
    chordSymbolsToRoman(["D", "G", "A"], "D", "major"),
  );
});

test("transposes Roman progressions into requested keys", () => {
  expect(romanToChordSymbols(["i", "VI", "III", "VII", "V"], "A", "minor")).toEqual(["Am", "F", "C", "G", "E"]);
  expect(romanToChordSymbols(["I", "bII", "#iv°", "V"], "D", "major")).toEqual(["D", "D#", "G#dim", "A"]);
});

test("round-trips progressions across every key and both harmonic modes", () => {
  const keys = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  for (const key of keys) {
    for (const [mode, degrees] of [
      ["major", ["I", "vi", "IV", "V", "I"]],
      ["minor", ["i", "VI", "iv", "V", "i"]],
    ] as const) {
      expect(chordSymbolsToRoman(romanToChordSymbols([...degrees], key, mode), key, mode)).toEqual([...degrees]);
    }
  }
});

test("accepts diverse functional progressions with the requested cadence", () => {
  const report = validateProgressionSeed(seed());

  expect(report.valid).toBe(true);
  expect(report.score).toBeGreaterThanOrEqual(90);
  expect(report.metrics).toMatchObject({
    eventCount: 5,
    distinctDegrees: 4,
    maxConsecutiveSame: 1,
    cadenceValid: true,
  });
});

test("rejects long progressions dominated by one repeated degree", () => {
  const report = validateProgressionSeed(
    seed({
      degrees: ["i", "i", "i", "i", "i", "i", "V", "i"],
      mode: "minor",
      repetition: 1,
    }),
  );

  expect(report.valid).toBe(false);
  expect(report.issues).toContain("progression has too little harmonic diversity");
  expect(report.issues).toContain("progression repeats one degree too many times consecutively");
  expect(report.issues).toContain("one degree dominates the progression");
});

test("rejects progressions whose ending contradicts their cadence label", () => {
  const report = validateProgressionSeed(seed({ degrees: ["I", "IV", "V", "vi"] }));

  expect(report.valid).toBe(false);
  expect(report.issues).toContain("progression does not satisfy its cadence");
});

test("deduplicates transposition-normalised progression candidates", () => {
  const first = seed({ id: "c-major", source: { ...seed().source, seed: 1 } });
  const transposedDuplicate = seed({ id: "d-major", source: { ...seed().source, seed: 2 } });

  expect(canonicalProgressionSeedKey(first)).toBe(canonicalProgressionSeedKey(transposedDuplicate));
  expect(dedupeProgressionSeeds([first, transposedDuplicate])).toHaveLength(1);
  expect(curateProgressionSeeds([first, transposedDuplicate]).accepted).toHaveLength(1);
});

test("selects progression seeds repeatably from a matching profile", () => {
  const candidates = [
    seed({ id: "balanced", tension: 0.45, repetition: 0.35 }),
    seed({ id: "tense", degrees: ["I", "vi", "IV", "V", "I"], tension: 0.8, repetition: 0.2 }),
  ];
  const query = { mode: "major" as const, cadence: "strong" as const, tension: 0.75, repetition: 0.2, seed: 909 };

  expect(selectProgressionSeed(candidates, query)).toEqual(selectProgressionSeed(candidates, query));
  expect(selectProgressionSeed(candidates, query)?.id).toBeDefined();
});
