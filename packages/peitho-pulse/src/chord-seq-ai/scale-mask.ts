import { SCALE_INTERVALS, normalizeScaleName } from "@peitho/array";
import type { ScaleName } from "@peitho/array";
import { rootNote, primarySymbol, VOCAB_SIZE, NUM_TOKENS } from "./token-map.ts";

const NOTE_TO_PC: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, "E#": 5, Fb: 4,
  F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10,
  B: 11, Cb: 11,
};

// Semitone intervals (mod 12) for every suffix in the vocabulary.
// Entries are ordered longest-first so startsWith matching is unambiguous.
const SUFFIX_PCS: [string, number[]][] = [
  ["mmaj7add11", [0, 3, 7, 11, 5]],
  ["mmaj13",     [0, 3, 7, 11, 2, 5, 9]],
  ["mmaj11",     [0, 3, 7, 11, 2, 5]],
  ["mmaj9",      [0, 3, 7, 11, 2]],
  ["mmaj7",      [0, 3, 7, 11]],
  ["madd9",      [0, 3, 7, 2]],
  ["maj7#11",    [0, 4, 7, 11, 6]],
  ["maj7(+9)",   [0, 4, 7, 11, 2]],
  ["maj7b13",    [0, 4, 7, 11, 8]],
  ["maj9b5",     [0, 4, 6, 11, 2]],
  ["maj11",      [0, 4, 7, 11, 2, 5]],
  ["maj9",       [0, 4, 7, 11, 2]],
  ["maj7",       [0, 4, 7, 11]],
  ["m(add11)",   [0, 3, 7, 5]],
  ["m7b5",       [0, 3, 6, 10]],
  ["m11",        [0, 3, 7, 10, 2, 5]],
  ["m9",         [0, 3, 7, 10, 2]],
  ["m7",         [0, 3, 7, 10]],
  ["m6",         [0, 3, 7, 9]],
  ["m",          [0, 3, 7]],
  ["add4add9",   [0, 4, 5, 7, 2]],
  ["add9#11",    [0, 4, 7, 2, 6]],
  ["add+11",     [0, 4, 7, 6]],
  ["add-13",     [0, 4, 7, 8]],
  ["add9",       [0, 4, 7, 2]],
  ["aug",        [0, 4, 8]],
  ["dim7",       [0, 3, 6, 9]],
  ["dim",        [0, 3, 6]],
  ["7#5#9",      [0, 4, 8, 10, 3]],
  ["7b5#9",      [0, 4, 6, 10, 3]],
  ["7b13",       [0, 4, 7, 10, 8]],
  ["7sus2",      [0, 2, 7, 10]],
  ["7sus4",      [0, 5, 7, 10]],
  ["7+11",       [0, 4, 7, 10, 6]],
  ["7+5",        [0, 4, 8, 10]],
  ["7-5",        [0, 4, 6, 10]],
  ["7#9",        [0, 4, 7, 10, 3]],
  ["7b9",        [0, 4, 7, 10, 1]],
  ["7",          [0, 4, 7, 10]],
  ["9#5",        [0, 4, 8, 10, 2]],
  ["9+11",       [0, 4, 7, 10, 2, 6]],
  ["9",          [0, 4, 7, 10, 2]],
  ["13-5",       [0, 4, 6, 10, 2, 5, 9]],
  ["13b9",       [0, 4, 7, 10, 1, 5, 9]],
  ["13",         [0, 4, 7, 10, 2, 5, 9]],
  ["11",         [0, 4, 7, 10, 2, 5]],
  ["M7",         [0, 4, 7, 11]],
  ["6#9",        [0, 4, 7, 9, 3]],
  ["6/9",        [0, 4, 7, 9, 2]],
  ["6",          [0, 4, 7, 9]],
  ["-5",         [0, 4, 6]],
  ["sus2",       [0, 2, 7]],
  ["sus4",       [0, 5, 7]],
  ["5",          [0, 7]],
  ["3",          [0, 4]],
  ["",           [0, 4, 7]],
];

// Returns all pitch classes (0–11) for a chord symbol, or null if unrecognised.
function chordPitchClasses(symbol: string): number[] | null {
  // Strip slash bass (e.g. "G7/F" → chord="G7", bass="F")
  const slashIdx = symbol.indexOf("/");
  const chordPart = slashIdx >= 0 ? symbol.slice(0, slashIdx) : symbol;
  const bassPart  = slashIdx >= 0 ? symbol.slice(slashIdx + 1) : null;

  const rootMatch = chordPart.match(/^([A-G][#b]?)/);
  if (!rootMatch) return null;
  const rootPc = NOTE_TO_PC[rootMatch[1]];
  if (rootPc == null) return null;

  const suffix = chordPart.slice(rootMatch[1].length);
  let intervals: number[] | null = null;
  for (const [pat, ivs] of SUFFIX_PCS) {
    if (suffix === pat || suffix.startsWith(pat)) { intervals = ivs; break; }
  }
  if (intervals === null) return null; // unknown suffix — be permissive

  const pcs = intervals.map(i => (rootPc + i) % 12);

  if (bassPart) {
    const bassMatch = bassPart.match(/^([A-G][#b]?)/);
    if (bassMatch) {
      const bpc = NOTE_TO_PC[bassMatch[1]];
      if (bpc != null && !pcs.includes(bpc)) pcs.push(bpc);
    }
  }

  return pcs;
}

export function notePitchClass(note: string): number {
  return NOTE_TO_PC[note] ?? 0;
}

// Float32Array of length NUM_TOKENS:
//   0        = token allowed
//   -Infinity = token blocked
// Special tokens (start/end) stay at 0 here; generator blocks them explicitly.
// When strict=true, all chord tones must be in the scale (not just the root).
export function buildScaleMask(key: string, scale: ScaleName, strict = false): Float32Array {
  const mask = new Float32Array(NUM_TOKENS).fill(-Infinity);
  const keyPc = notePitchClass(key);
  const intervals = SCALE_INTERVALS[normalizeScaleName(scale)];
  const inScale = new Set(intervals.map(n => (n + keyPc) % 12));

  for (let id = 0; id < VOCAB_SIZE; id++) {
    if (!inScale.has(notePitchClass(rootNote(id)))) continue;
    if (strict) {
      const pcs = chordPitchClasses(primarySymbol(id));
      // If we could parse the chord, require all tones in scale.
      // If unrecognised (pcs===null), fall through to allow (permissive).
      if (pcs !== null && pcs.some(pc => !inScale.has(pc))) continue;
    }
    mask[id] = 0;
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
