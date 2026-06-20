import { SCALE_INTERVALS, normalizeScaleName } from "@peitho/array";
import type { ScaleName } from "@peitho/array";
import { rootNote, VOCAB_SIZE, NUM_TOKENS } from "./token-map.ts";

const NOTE_TO_PC: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, "E#": 5, Fb: 4,
  F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10,
  B: 11, Cb: 11,
};

export function notePitchClass(note: string): number {
  return NOTE_TO_PC[note] ?? 0;
}

// Float32Array of length NUM_TOKENS:
//   0        = token allowed
//   -Infinity = token blocked
// Special tokens (start/end) stay at 0 here; generator blocks them explicitly.
export function buildScaleMask(key: string, scale: ScaleName): Float32Array {
  const mask = new Float32Array(NUM_TOKENS).fill(-Infinity);
  const keyPc = notePitchClass(key);
  const intervals = SCALE_INTERVALS[normalizeScaleName(scale)];
  const inScale = new Set(intervals.map(n => (n + keyPc) % 12));

  for (let id = 0; id < VOCAB_SIZE; id++) {
    if (inScale.has(notePitchClass(rootNote(id)))) mask[id] = 0;
  }

  return mask;
}

// Mask that allows only tokens whose root pitch class matches allowedPCs
export function buildRootMask(allowedPCs: Set<number>): Float32Array {
  const mask = new Float32Array(NUM_TOKENS).fill(-Infinity);
  for (let id = 0; id < VOCAB_SIZE; id++) {
    if (allowedPCs.has(notePitchClass(rootNote(id)))) mask[id] = 0;
  }
  return mask;
}

// Add mask into logits in-place: masked positions → -Infinity, rest unchanged
export function addMask(logits: Float32Array, mask: Float32Array): void {
  for (let i = 0; i < logits.length; i++) {
    if (mask[i] === -Infinity) logits[i] = -Infinity;
  }
}
