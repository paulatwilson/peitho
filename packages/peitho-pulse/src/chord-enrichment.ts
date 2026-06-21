import { NOTE_NAMES, SCALE_INTERVALS, keyToPitchClass, normalizeScaleName } from "@peitho/array";
import type { ChordEvent, ScaleInput } from "@peitho/array";
import type { EnrichedChordEvent } from "./melody-contracts";

const HALF_BAR_STEPS = 8;
const HALF_BARS_PER_BAR = 2;

function parseChordRoot(name: string): string | undefined {
  if (name.length >= 2 && (name[1] === "#" || name[1] === "b")) return name.slice(0, 2);
  if (name.length >= 1 && NOTE_NAMES.includes(name[0] as (typeof NOTE_NAMES)[number])) return name[0];
  return undefined;
}

function chordDegree(chordName: string, key: string, scale: ScaleInput): number | undefined {
  const root = parseChordRoot(chordName);
  if (!root) return undefined;

  const rootPc = NOTE_NAMES.indexOf(root as (typeof NOTE_NAMES)[number]);
  if (rootPc === -1) return undefined;

  const keyPc = keyToPitchClass(key);
  const interval = (rootPc - keyPc + 12) % 12;

  const scaleName = normalizeScaleName(scale);
  const intervals = SCALE_INTERVALS[scaleName];
  const degree = intervals.indexOf(interval);
  return degree >= 0 ? degree : undefined;
}

function cadenceRole(
  index: number,
  totalChords: number,
  degree: number | undefined,
): "approach" | "arrival" | "passing" | null {
  const isLast = index === totalChords - 1;
  const isPenultimate = index === totalChords - 2;

  if (isLast && degree === 0) return "arrival";
  if (isPenultimate && (degree === 4 || degree === 5)) return "approach";
  return "passing";
}

function phrasePosition(barIndex: number, totalBars: number): "opening" | "middle" | "closing" {
  if (barIndex < totalBars * 0.25) return "opening";
  if (barIndex >= totalBars * 0.75) return "closing";
  return "middle";
}

export function enrichChords(
  chords: ChordEvent[],
  key: string,
  scale: ScaleInput,
  bars: number,
): EnrichedChordEvent[] {
  return chords.map((chord, index) => {
    const barIndex = Math.floor(chord.start / HALF_BARS_PER_BAR);
    const degree = chordDegree(chord.name, key, scale);

    return {
      ...chord,
      degree,
      cadenceRole: cadenceRole(index, chords.length, degree),
      phrasePosition: phrasePosition(barIndex, bars),
      barIndex,
    };
  });
}

export function activeChordAt(
  step: number,
  chords: EnrichedChordEvent[],
): EnrichedChordEvent | undefined {
  return chords.find(
    (c) => c.start * HALF_BAR_STEPS <= step && step < (c.start + c.len) * HALF_BAR_STEPS,
  );
}
