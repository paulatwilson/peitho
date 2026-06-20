export type ProgressionSeedMode = "major" | "minor";
export type ProgressionSeedCadence = "none" | "soft" | "strong" | "loop";

export type ProgressionSeedSource = {
  provider: string;
  model: string;
  modelVersion: string;
  seed: number;
  conditions?: Record<string, unknown>;
};

export type ProgressionSeed = {
  id?: string;
  degrees: string[];
  mode: ProgressionSeedMode;
  cadence: ProgressionSeedCadence;
  tension: number;
  repetition: number;
  harmonicRhythm?: number[];
  tags?: string[];
  source: ProgressionSeedSource;
};

export type ProgressionSeedLibrary = {
  version: 1;
  seeds: ProgressionSeed[];
};

export type ProgressionSeedConstraints = {
  minEvents?: number;
  maxEvents?: number;
  minDistinctDegrees?: number;
  maxConsecutiveSame?: number;
  maxDegreeShare?: number;
  minFunctionalTransitionRatio?: number;
};

export type ProgressionSeedMetrics = {
  eventCount: number;
  distinctDegrees: number;
  maxConsecutiveSame: number;
  largestDegreeShare: number;
  functionalTransitionRatio: number;
  cadenceValid: boolean;
};

export type ProgressionSeedReport = {
  valid: boolean;
  score: number;
  issues: string[];
  metrics: ProgressionSeedMetrics;
};

export type ProgressionSeedQuery = {
  mode: ProgressionSeedMode;
  cadence?: ProgressionSeedCadence;
  tension: number;
  repetition: number;
  tags?: string[];
  seed: number;
};

type DegreeRole = "tonic" | "predominant" | "dominant" | "colour";

type ParsedRomanDegree = {
  accidental: -1 | 0 | 1;
  degree: number;
  quality: "major" | "minor" | "diminished" | "augmented";
};

const ROMAN_DEGREES = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;
const ROMAN_PATTERN = /^([b#]?)(VII|III|II|VI|IV|V|I|vii|iii|ii|vi|iv|v|i)([°+]?)$/;
const NOTE_TO_PITCH_CLASS: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  "E#": 5,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
  Cb: 11,
};
const PITCH_CLASS_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
const DEGREE_INTERVALS: Record<ProgressionSeedMode, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};
const CHROMATIC_DEGREES: Record<ProgressionSeedMode, Array<{ degree: number; accidental: -1 | 0 | 1 }>> = {
  major: [
    { degree: 1, accidental: 0 },
    { degree: 2, accidental: -1 },
    { degree: 2, accidental: 0 },
    { degree: 3, accidental: -1 },
    { degree: 3, accidental: 0 },
    { degree: 4, accidental: 0 },
    { degree: 4, accidental: 1 },
    { degree: 5, accidental: 0 },
    { degree: 6, accidental: -1 },
    { degree: 6, accidental: 0 },
    { degree: 7, accidental: -1 },
    { degree: 7, accidental: 0 },
  ],
  minor: [
    { degree: 1, accidental: 0 },
    { degree: 2, accidental: -1 },
    { degree: 2, accidental: 0 },
    { degree: 3, accidental: 0 },
    { degree: 3, accidental: 1 },
    { degree: 4, accidental: 0 },
    { degree: 4, accidental: 1 },
    { degree: 5, accidental: 0 },
    { degree: 6, accidental: 0 },
    { degree: 6, accidental: 1 },
    { degree: 7, accidental: 0 },
    { degree: 7, accidental: 1 },
  ],
};
const DEGREE_ROLES: Record<ProgressionSeedMode, DegreeRole[]> = {
  major: ["tonic", "predominant", "colour", "predominant", "dominant", "tonic", "dominant"],
  minor: ["tonic", "predominant", "colour", "predominant", "dominant", "tonic", "dominant"],
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pitchClass(note: string): number {
  const value = NOTE_TO_PITCH_CLASS[note];
  if (value == null) throw new Error(`Unknown note name: ${note}`);
  return value;
}

function parseRomanDegree(token: string): ParsedRomanDegree | null {
  const match = token.trim().match(ROMAN_PATTERN);
  if (!match) return null;
  const numeral = match[2];
  const degree = ROMAN_DEGREES.indexOf(numeral.toUpperCase() as (typeof ROMAN_DEGREES)[number]) + 1;
  if (degree === 0) return null;

  return {
    accidental: match[1] === "b" ? -1 : match[1] === "#" ? 1 : 0,
    degree,
    quality: match[3] === "°" ? "diminished" : match[3] === "+" ? "augmented" : numeral === numeral.toLowerCase() ? "minor" : "major",
  };
}

function formatRomanDegree(parsed: ParsedRomanDegree): string {
  const accidental = parsed.accidental === -1 ? "b" : parsed.accidental === 1 ? "#" : "";
  const numeral =
    parsed.quality === "minor" || parsed.quality === "diminished"
      ? ROMAN_DEGREES[parsed.degree - 1].toLowerCase()
      : ROMAN_DEGREES[parsed.degree - 1];
  const quality = parsed.quality === "diminished" ? "°" : parsed.quality === "augmented" ? "+" : "";
  return `${accidental}${numeral}${quality}`;
}

function chordQuality(symbol: string): ParsedRomanDegree["quality"] {
  const suffix = symbol.replace(/^[A-G](?:#|b)?/, "").split("/")[0];
  if (/dim|°|m7b5|m-5|mb5/i.test(suffix)) return "diminished";
  if (/aug|\+5|#5/i.test(suffix)) return "augmented";
  if (/^(m|min|-)(?!aj)/i.test(suffix)) return "minor";
  return "major";
}

function degreeIdentity(token: string): string {
  const parsed = parseRomanDegree(token);
  return parsed ? `${parsed.accidental}:${parsed.degree}` : token;
}

function degreeRole(token: string, mode: ProgressionSeedMode): DegreeRole | null {
  const parsed = parseRomanDegree(token);
  return parsed ? DEGREE_ROLES[mode][parsed.degree - 1] : null;
}

function functionalTransition(from: DegreeRole | null, to: DegreeRole | null): boolean {
  if (!from || !to) return false;
  if (from === "tonic") return to === "predominant" || to === "dominant" || to === "colour";
  if (from === "predominant") return to === "dominant" || to === "colour";
  if (from === "dominant") return to === "tonic" || to === "colour";
  return to !== "colour";
}

function cadenceValid(seed: ProgressionSeed): boolean {
  if (seed.cadence === "none") return true;
  if (seed.degrees.length < 2) return false;
  const first = parseRomanDegree(seed.degrees[0]);
  const previous = parseRomanDegree(seed.degrees.at(-2)!);
  const last = parseRomanDegree(seed.degrees.at(-1)!);
  if (!first || !previous || !last) return false;

  if (seed.cadence === "strong") return previous.degree === 5 && last.degree === 1;
  if (seed.cadence === "soft") {
    const role = DEGREE_ROLES[seed.mode][previous.degree - 1];
    return last.degree === 1 && (role === "predominant" || role === "colour");
  }

  return degreeIdentity(seed.degrees[0]) !== degreeIdentity(seed.degrees.at(-1)!) && functionalTransition(
    degreeRole(seed.degrees.at(-1)!, seed.mode),
    degreeRole(seed.degrees[0], seed.mode),
  );
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function chordSymbolsToRoman(
  chords: string[],
  key: string,
  mode: ProgressionSeedMode,
): string[] {
  const tonic = pitchClass(key);

  return chords.map((symbol) => {
    const root = symbol.trim().match(/^([A-G](?:#|b)?)/)?.[1];
    if (!root) throw new Error(`Cannot read chord root: ${symbol}`);
    const relativePitch = (pitchClass(root) - tonic + 12) % 12;
    const chromaticDegree = CHROMATIC_DEGREES[mode][relativePitch];
    return formatRomanDegree({ ...chromaticDegree, quality: chordQuality(symbol) });
  });
}

export function romanToChordSymbols(
  degrees: string[],
  key: string,
  mode: ProgressionSeedMode,
): string[] {
  const tonic = pitchClass(key);

  return degrees.map((token) => {
    const parsed = parseRomanDegree(token);
    if (!parsed) throw new Error(`Invalid Roman degree: ${token}`);
    const root = tonic + DEGREE_INTERVALS[mode][parsed.degree - 1] + parsed.accidental;
    const name = PITCH_CLASS_NAMES[(root + 12) % 12];
    const suffix = parsed.quality === "minor" ? "m" : parsed.quality === "diminished" ? "dim" : parsed.quality === "augmented" ? "aug" : "";
    return `${name}${suffix}`;
  });
}

export function canonicalProgressionSeedKey(seed: Pick<ProgressionSeed, "degrees" | "mode">): string {
  const degrees = seed.degrees.map((degree) => {
    const parsed = parseRomanDegree(degree);
    return parsed ? formatRomanDegree(parsed) : degree.trim();
  });
  return `${seed.mode}:${degrees.join(",")}`;
}

export function validateProgressionSeed(
  seed: ProgressionSeed,
  constraints: ProgressionSeedConstraints = {},
): ProgressionSeedReport {
  const issues: string[] = [];
  const eventCount = Array.isArray(seed.degrees) ? seed.degrees.length : 0;
  const identities = Array.isArray(seed.degrees) ? seed.degrees.map(degreeIdentity) : [];
  const counts = new Map<string, number>();
  let maxConsecutiveSame = 0;
  let currentRun = 0;
  let previous = "";

  for (const identity of identities) {
    counts.set(identity, (counts.get(identity) ?? 0) + 1);
    currentRun = identity === previous ? currentRun + 1 : 1;
    maxConsecutiveSame = Math.max(maxConsecutiveSame, currentRun);
    previous = identity;
  }

  const transitions = Math.max(0, eventCount - 1);
  let functionalTransitions = 0;
  for (let index = 1; index < eventCount; index += 1) {
    if (functionalTransition(degreeRole(seed.degrees[index - 1], seed.mode), degreeRole(seed.degrees[index], seed.mode))) {
      functionalTransitions += 1;
    }
  }

  const metrics: ProgressionSeedMetrics = {
    eventCount,
    distinctDegrees: counts.size,
    maxConsecutiveSame,
    largestDegreeShare: eventCount === 0 ? 0 : Math.max(0, ...counts.values()) / eventCount,
    functionalTransitionRatio: transitions === 0 ? 0 : functionalTransitions / transitions,
    cadenceValid: cadenceValid(seed),
  };
  const isMinimal = seed.tags?.some((tag) => tag === "minimal" || tag === "pedal") ?? false;
  const resolved = {
    minEvents: constraints.minEvents ?? 3,
    maxEvents: constraints.maxEvents ?? 16,
    minDistinctDegrees: constraints.minDistinctDegrees ?? (eventCount >= 8 ? 4 : eventCount >= 4 ? 3 : 2),
    maxConsecutiveSame: constraints.maxConsecutiveSame ?? (isMinimal ? 4 : 2),
    maxDegreeShare: constraints.maxDegreeShare ?? (isMinimal ? 0.8 : 0.55),
    minFunctionalTransitionRatio: constraints.minFunctionalTransitionRatio ?? 0.6,
  };

  if (!Array.isArray(seed.degrees)) issues.push("degrees must be an array");
  else if (seed.degrees.some((degree) => !parseRomanDegree(degree))) issues.push("degrees contain invalid Roman tokens");
  if (seed.mode !== "major" && seed.mode !== "minor") issues.push("mode must be major or minor");
  if (!["none", "soft", "strong", "loop"].includes(seed.cadence)) issues.push("cadence is invalid");
  if (!Number.isFinite(seed.tension) || seed.tension < 0 || seed.tension > 1) issues.push("tension must be between 0 and 1");
  if (!Number.isFinite(seed.repetition) || seed.repetition < 0 || seed.repetition > 1) issues.push("repetition must be between 0 and 1");
  if (!seed.source || !seed.source.provider || !seed.source.model || !seed.source.modelVersion || !Number.isFinite(seed.source.seed)) {
    issues.push("source provenance is incomplete");
  }
  if (
    seed.harmonicRhythm &&
    (seed.harmonicRhythm.length !== eventCount || seed.harmonicRhythm.some((duration) => !Number.isInteger(duration) || duration < 1))
  ) {
    issues.push("harmonic rhythm must provide one positive integer duration per degree");
  }
  if (eventCount < resolved.minEvents || eventCount > resolved.maxEvents) issues.push("event count is outside limits");
  if (metrics.distinctDegrees < resolved.minDistinctDegrees) issues.push("progression has too little harmonic diversity");
  if (metrics.maxConsecutiveSame > resolved.maxConsecutiveSame) issues.push("progression repeats one degree too many times consecutively");
  if (metrics.largestDegreeShare > resolved.maxDegreeShare) issues.push("one degree dominates the progression");
  if (metrics.functionalTransitionRatio < resolved.minFunctionalTransitionRatio) issues.push("too few functional transitions");
  if (!metrics.cadenceValid) issues.push("progression does not satisfy its cadence");

  let score = 100;
  score -= Math.max(0, resolved.minDistinctDegrees - metrics.distinctDegrees) * 15;
  score -= Math.max(0, metrics.maxConsecutiveSame - resolved.maxConsecutiveSame) * 10;
  score -= Math.max(0, metrics.largestDegreeShare - resolved.maxDegreeShare) * 80;
  score -= Math.max(0, resolved.minFunctionalTransitionRatio - metrics.functionalTransitionRatio) * 50;
  if (!metrics.cadenceValid) score -= 25;
  score -= issues.filter((issue) => issue.includes("invalid") || issue.includes("must be") || issue.includes("incomplete")).length * 20;

  return { valid: issues.length === 0, score: Math.round(clamp(score, 0, 100)), issues, metrics };
}

export function dedupeProgressionSeeds(seeds: ProgressionSeed[]): ProgressionSeed[] {
  const best = new Map<string, { seed: ProgressionSeed; score: number }>();

  for (const seed of seeds) {
    const key = canonicalProgressionSeedKey(seed);
    const score = validateProgressionSeed(seed).score;
    const current = best.get(key);
    if (!current || score > current.score) best.set(key, { seed, score });
  }

  return [...best.values()].map((entry) => entry.seed);
}

export function curateProgressionSeeds(
  seeds: ProgressionSeed[],
  constraints: ProgressionSeedConstraints = {},
): { accepted: ProgressionSeed[]; rejected: Array<{ seed: ProgressionSeed; report: ProgressionSeedReport }> } {
  const best = new Map<string, { seed: ProgressionSeed; report: ProgressionSeedReport }>();
  const rejected: Array<{ seed: ProgressionSeed; report: ProgressionSeedReport }> = [];

  for (const seed of seeds) {
    const report = validateProgressionSeed(seed, constraints);
    if (!report.valid) {
      rejected.push({ seed, report });
      continue;
    }

    const key = canonicalProgressionSeedKey(seed);
    const current = best.get(key);
    if (!current || report.score > current.report.score) best.set(key, { seed, report });
  }

  const accepted = [...best.values()]
    .sort((left, right) => right.report.score - left.report.score)
    .map((entry) => entry.seed);
  return { accepted, rejected };
}

export function selectProgressionSeed(seeds: ProgressionSeed[], query: ProgressionSeedQuery): ProgressionSeed | null {
  const valid = curateProgressionSeeds(seeds).accepted.filter((seed) => seed.mode === query.mode);
  if (valid.length === 0) return null;
  const cadenceMatches = query.cadence ? valid.filter((seed) => seed.cadence === query.cadence) : valid;
  const candidates = cadenceMatches.length > 0 ? cadenceMatches : valid;
  const requestedTags = new Set(query.tags ?? []);
  const ranked = candidates
    .map((seed) => {
      const quality = validateProgressionSeed(seed).score;
      const profileFit = (1 - Math.abs(seed.tension - query.tension)) * 20 + (1 - Math.abs(seed.repetition - query.repetition)) * 20;
      const tagFit = (seed.tags ?? []).filter((tag) => requestedTags.has(tag)).length * 5;
      return { seed, weight: Math.max(1, quality + profileFit + tagFit) };
    })
    .sort((left, right) => right.weight - left.weight || canonicalProgressionSeedKey(left.seed).localeCompare(canonicalProgressionSeedKey(right.seed)));
  const pool = ranked.slice(0, Math.min(8, ranked.length));
  const total = pool.reduce((sum, candidate) => sum + candidate.weight, 0);
  let pick = seededRandom(query.seed)() * total;

  for (const candidate of pool) {
    pick -= candidate.weight;
    if (pick <= 0) return candidate.seed;
  }

  return pool.at(-1)!.seed;
}
