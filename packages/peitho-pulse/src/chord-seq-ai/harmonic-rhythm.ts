import { mulberry32 } from "./sampler.ts";

const DEFAULT_CHORD_LENGTHS = [1, 1, 2, 2, 2, 3, 4];

// Derive a chord count from bars when chordCount is not supplied.
// Uses the average of chordLengths to estimate how many chords fill bars*2 half-bars.
export function deriveChordCount(bars: number, chordLengths?: number[]): number {
  const halfBars = bars * 2;
  const lengths = chordLengths ?? DEFAULT_CHORD_LENGTHS;
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  return Math.max(2, Math.min(16, Math.round(halfBars / avg)));
}

// Assign durations to chordCount chords summing to bars*2 half-bars.
// Uses a seeded draw from chordLengths so durations are reproducible.
export function deriveHarmonicRhythm(
  bars: number,
  chordCount: number,
  chordLengths?: number[],
  seed = 0,
): number[] {
  const halfBars = bars * 2;
  const lengths = chordLengths ?? DEFAULT_CHORD_LENGTHS;
  const rng = mulberry32(seed);
  const rhythm: number[] = [];
  let remaining = halfBars;

  for (let i = 0; i < chordCount; i++) {
    const last = i === chordCount - 1;
    if (last) {
      rhythm.push(remaining);
      break;
    }
    // Ensure at least 1 half-bar per remaining chord after this one
    const maxLen = remaining - (chordCount - i - 1);
    const picked = lengths[Math.floor(rng() * lengths.length)];
    rhythm.push(Math.max(1, Math.min(picked, maxLen)));
    remaining -= rhythm[rhythm.length - 1];
  }

  return rhythm;
}

// Returns an error string if invalid, null if valid.
export function validateHarmonicRhythm(
  rhythm: number[],
  chordCount: number,
  bars: number,
): string | null {
  const halfBars = bars * 2;
  if (rhythm.length !== chordCount)
    return `harmonicRhythm length ${rhythm.length} must equal chordCount ${chordCount}`;
  if (rhythm.some(d => !Number.isInteger(d) || d < 1))
    return "harmonicRhythm values must be positive integers";
  const sum = rhythm.reduce((a, b) => a + b, 0);
  if (sum !== halfBars)
    return `harmonicRhythm sum ${sum} must equal bars×2 (${halfBars})`;
  return null;
}
