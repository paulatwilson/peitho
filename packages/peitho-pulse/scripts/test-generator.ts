import { ChordSeqAIGenerator } from "../src/chord-seq-ai/index.ts";

const gen = new ChordSeqAIGenerator();

console.log("Generating 4 candidates: C major, 4 bars, strong cadence...\n");

const result = await gen.generate({
  key: "C",
  mode: "major",
  bars: 4,
  tension: 0.5,
  repetition: 0.4,
  cadence: "strong",
  candidateCount: 4,
  seed: 42,
  genres: ["Jazz", "Classical"],
  decade: 1980,
  scalePolicy: "cadential",
  cadencePolicy: "repair",
});

console.log("Resolved controls:", result.resolvedControls);
console.log(`\nCandidates: ${result.candidates.length}`);

for (const [i, c] of result.candidates.entries()) {
  console.log(`\n[${i}] degrees: ${c.progressionSeed.degrees.join(" → ")}`);
  console.log(`    symbols: ${c.chordSymbols.join(", ")}`);
  console.log(`    rhythm:  ${c.progressionSeed.harmonicRhythm?.join(", ")}`);
  console.log(`    score:   ${c.validation.score} | valid: ${c.validation.valid}`);
  if (c.validation.issues.length) console.log(`    issues:  ${c.validation.issues.join("; ")}`);
}
