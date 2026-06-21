import { expect, test } from "bun:test";
import {
  ARRAY_CHORD_RUNTIME_PROFILE,
  chordPool,
  buildMidi,
  createEmptyPattern,
  SCALE_INTERVALS,
  generateDrums,
  generateChords,
  generateMono,
  NOTE_NAMES,
  quantizeToGrid,
  scaleMidi,
  snapToScale,
  thinDensity,
  type ScaleName,
  waveformBins,
} from "../src/index";

test("defines locked lightweight chord runtime policy", () => {
  expect(ARRAY_CHORD_RUNTIME_PROFILE).toEqual({
    model: "conditional_small",
    candidateCount: 2,
    cadencePolicy: "reject",
    scalePolicy: "strict",
    chordCounts: [8, 16],
    allowImmediateRepeat: false,
  });
});

function chordRootPitchClass(name: string): number {
  const root = name.match(/^[A-G]#?/)?.[0];
  const pitchClass = NOTE_NAMES.indexOf(root as (typeof NOTE_NAMES)[number]);
  if (pitchClass === -1) throw new Error(`Unknown chord root: ${name}`);
  return pitchClass;
}

function keyPitchClasses(key: string, scale: ScaleName): Set<number> {
  const root = NOTE_NAMES.indexOf(key as (typeof NOTE_NAMES)[number]);
  const harmonicScale = scale === "pentatonic-minor" ? "natural-minor" : scale === "pentatonic-major" ? "major" : scale;
  return new Set(SCALE_INTERVALS[harmonicScale].map((interval) => (root + interval) % 12));
}

test("creates configured 8-bar 4/4 pattern shell", () => {
  expect(createEmptyPattern({ bars: 8 })).toMatchObject({
    bars: 8,
    beatsPerBar: 4,
    stepsPerBeat: 4,
    stepsPerBar: 16,
    steps: 128,
  });
});

test("supports longer consumers such as adaptive game music", () => {
  expect(createEmptyPattern({ bars: 32, beatsPerBar: 3, stepsPerBeat: 8 })).toMatchObject({
    bars: 32,
    beatsPerBar: 3,
    stepsPerBeat: 8,
    stepsPerBar: 24,
    steps: 768,
  });
});

test("maps C major scale notes across midi range", () => {
  expect(scaleMidi("C", "major", 60, 72)).toEqual([60, 62, 64, 65, 67, 69, 71, 72]);
});

test("builds in-key chord pool for composer chord menus", () => {
  const chords = chordPool("C", "major");

  expect(chords.map((chord) => chord.name)).toContain("C");
  expect(chords.map((chord) => chord.name)).toContain("Cmaj7");
  expect(chords.map((chord) => chord.name)).toContain("Dm7");
  expect(chords.every((chord) => chord.tones.length >= 3)).toBe(true);
});

test("generates seeded chord progression that fills requested bars", () => {
  const chords = generateChords({
    key: "E",
    scale: "pentatonic-major",
    chordLengths: [2, 2, 3, 4, 4],
    extensionProbability: 0.6,
    bars: 8,
    seed: 1234,
  });

  expect(chords[0]?.start).toBe(0);
  expect(chords.reduce((sum, chord) => sum + chord.len, 0)).toBe(16);
  expect(chords.at(-1)!.start + chords.at(-1)!.len).toBe(16);
});

test("uses seed for repeatable chord generation", () => {
  const input = {
    key: "A",
    scale: "natural-minor" as const,
    chordLengths: [2, 2, 3, 4],
    extensionProbability: 0.52,
    bars: 16,
    seed: 99,
  };

  expect(generateChords(input)).toEqual(generateChords(input));
  expect(generateChords(input).reduce((sum, chord) => sum + chord.len, 0)).toBe(32);
});

test("preserves chord length, extension, seed, and event output contract", () => {
  const input = {
    key: "C",
    scale: "major" as const,
    chordLengths: [3],
    extensionProbability: 1,
    bars: 3,
    seed: 808,
  };
  const chords = generateChords(input);

  expect(chords).toEqual(generateChords(input));
  expect(chords).toEqual([
    expect.objectContaining({
      name: expect.any(String),
      start: 0,
      len: 3,
      tones: expect.any(Array),
    }),
    expect.objectContaining({
      name: expect.any(String),
      start: 3,
      len: 3,
      tones: expect.any(Array),
    }),
  ]);
  expect(chords.every((chord) => chord.len === 3)).toBe(true);
  expect(chords.every((chord) => chord.tones.length === 4)).toBe(true);
  expect(chords.at(-1)!.start + chords.at(-1)!.len).toBe(6);
});

test("accepts progression profile input for chord generation", () => {
  const chords = generateChords({
    key: "E",
    scale: "major",
    bars: 8,
    seed: 2026,
    chordLengths: [2],
    extensionProbability: 0,
    progressionProfile: {
      start: "tonic",
      cadence: "none",
      tension: 0.35,
      repetition: 0.7,
    },
  });

  expect(chords).toEqual(
    generateChords({
      key: "E",
      scale: "major",
      bars: 8,
      seed: 2026,
      chordLengths: [2],
      extensionProbability: 0,
      progressionProfile: {
        start: "tonic",
        cadence: "none",
        tension: 0.35,
        repetition: 0.7,
      },
    }),
  );
  expect(chords[0]?.name.startsWith("E")).toBe(true);
  expect(chords.reduce((sum, chord) => sum + chord.len, 0)).toBe(16);
});

test("generates exact lightweight chord counts", () => {
  for (const chordCount of ARRAY_CHORD_RUNTIME_PROFILE.chordCounts) {
    const options = { key: "C", scale: "major" as const, bars: 8, seed: 99, chordCount };
    const chords = generateChords(options);
    expect(chords).toHaveLength(chordCount);
    expect(chords.reduce((sum, chord) => sum + chord.len, 0)).toBe(16);
    expect(chords).toEqual(generateChords(options));
  }
});

test("uses seeded weighted movement between chord roles", () => {
  const chords = generateChords({
    key: "C",
    scale: "major",
    bars: 4,
    seed: 42,
    chordLengths: [1],
    extensionProbability: 0,
    progressionProfile: { start: "tonic" },
  });

  expect(chords.map((chord) => chord.name)).toEqual(["C", "Em", "Bdim", "Em", "C", "F", "G", "C"]);
});

test("applies cadence profiles to final chord movement", () => {
  const base = {
    key: "C",
    scale: "major" as const,
    bars: 4,
    seed: 42,
    chordLengths: [1],
    extensionProbability: 0,
  };
  const namesForCadence = (cadence: "strong" | "soft" | "loop") =>
    generateChords({ ...base, progressionProfile: { start: "tonic", cadence } }).map((chord) => chord.name);

  expect(namesForCadence("strong")).toEqual([
    "C",
    "Em",
    "Bdim",
    "Em",
    "C",
    "F",
    "G",
    "C",
  ]);
  expect(namesForCadence("soft")).toEqual([
    "C",
    "Em",
    "Bdim",
    "Em",
    "C",
    "F",
    "F",
    "C",
  ]);
  expect(namesForCadence("loop")).toEqual([
    "C",
    "Em",
    "Bdim",
    "Em",
    "C",
    "F",
    "G",
    "G",
  ]);
});

test("uses a major dominant for a strong cadence in minor", () => {
  const chords = generateChords({
    key: "A",
    scale: "natural-minor",
    bars: 2,
    seed: 7,
    chordLengths: [1],
    extensionProbability: 0,
    progressionProfile: { start: "tonic", cadence: "strong" },
  });

  expect(chords.at(-2)).toMatchObject({ name: "E", tones: [64, 68, 71] });
  expect(chords.at(-1)).toMatchObject({ name: "Am", tones: [57, 60, 64] });
  expect(chords.every((chord) => chord.tones.every((tone, index) => index === 0 || tone > chord.tones[index - 1]))).toBe(
    true,
  );
});

test("lets tension and repetition nudge chord role weights", () => {
  const base = {
    key: "C",
    scale: "major" as const,
    bars: 16,
    seed: 123,
    chordLengths: [1],
    extensionProbability: 0,
    progressionProfile: { start: "tonic" as const, cadence: "none" as const },
  };
  const tenseNames = new Set(["G", "Bdim", "Am"]);
  const rootName = (name: string) => name.replace(/m7b5|maj7|add9|dim|sus4|9sus4|m7|m|7/g, "");
  const namesForProfile = (tension: number, repetition: number) =>
    generateChords({ ...base, progressionProfile: { ...base.progressionProfile, tension, repetition } }).map(
      (chord) => chord.name,
    );
  const rolePressure = (names: string[]) => names.filter((name) => tenseNames.has(name)).length;
  const reuse = (names: string[]) =>
    names.filter((name, index) => index > 0 && rootName(name) === rootName(names[index - 1])).length +
    names.filter((name) => rootName(name) === "C").length;

  const lowTension = namesForProfile(0, 0);
  const highTension = namesForProfile(1, 0);
  const lowRepetition = namesForProfile(0, 0);
  const highRepetition = namesForProfile(0, 1);

  expect(rolePressure(highTension)).toBeGreaterThan(rolePressure(lowTension));
  expect(reuse(highRepetition)).toBeGreaterThan(reuse(lowRepetition));
});

test("covers progression repeatability, cadences, repetition, and key membership", () => {
  const base = {
    key: "E",
    scale: "major" as const,
    bars: 8,
    seed: 707,
    chordLengths: [1, 2, 3],
    extensionProbability: 0.4,
  };
  const progression = generateChords(base);
  const strong = generateChords({ ...base, progressionProfile: { start: "tonic", cadence: "strong" } });
  const loop = generateChords({ ...base, progressionProfile: { start: "tonic", cadence: "loop" } });
  const lowRepetition = generateChords({ ...base, progressionProfile: { start: "tonic", repetition: 0 } });
  const highRepetition = generateChords({ ...base, progressionProfile: { start: "tonic", repetition: 1 } });
  const rootName = (name: string) => name.replace(/m7b5|maj7|add9|dim|sus4|9sus4|m7|m|7/g, "");
  const repeatedRoots = (names: string[]) =>
    names.filter((name, index) => index > 0 && rootName(name) === rootName(names[index - 1])).length;

  expect(progression).toEqual(generateChords(base));
  expect(progression.at(-1)!.start + progression.at(-1)!.len).toBe(16);
  expect(rootName(strong.at(-1)!.name)).toBe("E");
  expect(rootName(strong.at(-2)!.name)).toBe("B");
  expect(["B", "D#"]).toContain(rootName(loop.at(-1)!.name));
  expect(repeatedRoots(highRepetition.map((chord) => chord.name))).toBeGreaterThan(
    repeatedRoots(lowRepetition.map((chord) => chord.name)),
  );

  for (const scale of ["major", "natural-minor", "pentatonic-major", "pentatonic-minor"] as const) {
    const scalePitchClasses = keyPitchClasses("E", scale);
    const chords = generateChords({
      key: "E",
      scale,
      bars: 8,
      seed: 909,
      chordLengths: [1],
      extensionProbability: 1,
      progressionProfile: { start: "tonic" },
    });

    expect(chords.every((chord) => scalePitchClasses.has(chordRootPitchClass(chord.name)))).toBe(true);
    expect(chords.every((chord) => chord.tones.every((tone) => scalePitchClasses.has(tone % 12)))).toBe(true);
  }
});

test("accepts composer display scale names in engine helpers", () => {
  expect(scaleMidi("E", "Pentatonic Major", 56, 64)).toEqual(scaleMidi("E", "pentatonic-major", 56, 64));
  expect(chordPool("E", "Heptatonic Natural Minor").length).toBeGreaterThan(0);
});

test("snaps model notes to nearest scale tone", () => {
  expect(
    snapToScale(
      [
        { step: 0, len: 1, midi: 61 },
        { step: 2, len: 1, midi: 66 },
      ],
      "C",
      "major",
    ),
  ).toEqual([
    { step: 0, len: 1, midi: 60 },
    { step: 2, len: 1, midi: 65 },
  ]);
});

test("quantizes note starts and lengths to requested grid", () => {
  expect(quantizeToGrid([{ step: 3, len: 5, midi: 60 }], 4)).toEqual([{ step: 4, len: 4, midi: 60 }]);
});

test("thins note density deterministically", () => {
  const notes = Array.from({ length: 16 }, (_, step) => ({ step, len: 1, midi: 60 + step }));

  expect(thinDensity(notes, 0.4, 123)).toEqual(thinDensity(notes, 0.4, 123));
  expect(thinDensity(notes, 0, 123)).toEqual([]);
  expect(thinDensity(notes, 1, 123)).toEqual(notes);
});

test("generates repeatable mono parts for composer lanes", () => {
  const input = {
    key: "E",
    scale: "Pentatonic Major" as const,
    density: 0.48,
    split: 0.55,
    sync: 0.27,
    rhythm: 0.4,
    segmentProfile: { density: 0.85, register: 0, length: 1.1, sync: 0 },
    optionProfile: { envelope: "rise" as const, length: 0.95 },
    register: [58, 84] as [number, number],
    sparse: 1.1,
    seed: 123,
  };

  const notes = generateMono(input);

  expect(notes).toEqual(generateMono(input));
  expect(notes.every((note) => note.step >= 0 && note.step < 128)).toBe(true);
  expect(notes.every((note) => note.vel == null || (note.vel >= 35 && note.vel <= 122))).toBe(true);
});

test("generates drum grids and waveform bins for composer", () => {
  const drums = generateDrums("Basic 8th-Note");

  expect(drums.kick).toContain(0);
  expect(drums.snare).toContain(4);
  expect(drums.hat).toContain(2);
  expect(waveformBins([{ step: 0, len: 16, midi: 60 }], 8)).toHaveLength(8);
});

test("builds midi bytes from engine note events", () => {
  const midi = buildMidi(120, [{ channel: 0, notes: [{ step: 0, len: 4, midi: 60, vel: 90 }] }]);

  expect(Array.from(midi.slice(0, 4))).toEqual([0x4d, 0x54, 0x68, 0x64]);
  expect(midi.length).toBeGreaterThan(30);
});
