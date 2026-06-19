import { expect, test } from "bun:test";
import {
  chordPool,
  buildMidi,
  createEmptyPattern,
  generateDrums,
  generateChords,
  generateMono,
  quantizeToGrid,
  scaleMidi,
  snapToScale,
  thinDensity,
  waveformBins,
} from "../src/index";

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
