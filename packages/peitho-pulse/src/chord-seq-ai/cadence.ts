import { SCALE_INTERVALS, normalizeScaleName } from "@peitho/array";
import type { ScaleName, ProgressionSeedCadence } from "@peitho/array";
import { buildRootMask } from "./scale-mask.ts";
import { notePitchClass } from "./scale-mask.ts";

export type CadentialMask = {
  position: number;    // 0-indexed generation step that this mask applies at
  mask: Float32Array;  // logit mask: 0 = allowed, -Infinity = blocked
};

// Build per-position logit masks to enforce cadence during generation.
// Only used when cadencePolicy === "repair".
export function buildCadenceMasks(
  key: string,
  scale: ScaleName,
  cadence: ProgressionSeedCadence,
  chordCount: number,
): CadentialMask[] {
  if (cadence === "none" || chordCount < 2) return [];

  const keyPc = notePitchClass(key);
  const intervals = SCALE_INTERVALS[normalizeScaleName(scale)];

  const tonicPc       = (keyPc + intervals[0]) % 12;  // degree I
  const suprTonicPc   = (keyPc + intervals[1]) % 12;  // degree II
  const mediantPc     = (keyPc + intervals[2]) % 12;  // degree III
  const subdomPc      = (keyPc + intervals[3]) % 12;  // degree IV
  const dominantPc    = (keyPc + intervals[4]) % 12;  // degree V
  const submediPc     = (keyPc + intervals[5]) % 12;  // degree VI

  const finalIdx   = chordCount - 1;
  const penultIdx  = chordCount - 2;

  if (cadence === "strong") {
    return [
      { position: penultIdx, mask: buildRootMask(new Set([dominantPc])) },
      { position: finalIdx,  mask: buildRootMask(new Set([tonicPc])) },
    ];
  }

  if (cadence === "soft") {
    // predominant: II, IV; colour: III — VI is tonic in both modes, must exclude it
    const predominantColour = new Set([suprTonicPc, mediantPc, subdomPc]);
    return [
      { position: penultIdx, mask: buildRootMask(predominantColour) },
      { position: finalIdx,  mask: buildRootMask(new Set([tonicPc])) },
    ];
  }

  if (cadence === "loop") {
    // Final chord must not be tonic — it should pull back toward the opening.
    // Allow all diatonic non-tonic roots.
    const nonTonic = new Set(intervals.map(n => (n + keyPc) % 12).filter(pc => pc !== tonicPc));
    return [
      { position: finalIdx, mask: buildRootMask(nonTonic) },
    ];
  }

  return [];
}
