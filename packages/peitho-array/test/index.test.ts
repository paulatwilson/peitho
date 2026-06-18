import { expect, test } from "bun:test";
import {
  DEFAULT_DIRECTION,
  DIRECTION_TYPES,
  OPTIONS,
  SEGMENTS,
  chordPool,
  createEmptyPattern,
  generateChords,
  recommendMacros,
  scaleMidi,
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

test("includes expanded composer direction taxonomy", () => {
  expect(DIRECTION_TYPES).toContain("New Wave");
  expect(DIRECTION_TYPES).toContain("Electropop");
  expect(DIRECTION_TYPES).toContain("Classical");
  expect(DIRECTION_TYPES).toContain("Jazz");
  expect(DIRECTION_TYPES).toContain("Synth");
  expect(DIRECTION_TYPES).toContain("Rock");
  expect(DIRECTION_TYPES).toContain("Darkwave");
  expect(SEGMENTS).toContain("Breakdown");
  expect(SEGMENTS).toContain("Hook");
  expect(SEGMENTS).toContain("Middle-Eight");
  expect(OPTIONS).toContain("Driving Pulse");
  expect(OPTIONS).toContain("Anthem Rise");
});

test("recommends bounded macros from direction selection", () => {
  const macros = recommendMacros({
    type: "Darkwave",
    segment: "Breakdown",
    option: "Moody Wind Down",
    scale: "natural-minor",
  });

  expect(macros.density).toBeGreaterThanOrEqual(0.05);
  expect(macros.density).toBeLessThanOrEqual(1);
  expect(macros.split).toBeGreaterThanOrEqual(0);
  expect(macros.split).toBeLessThanOrEqual(1);
  expect(macros.sync).toBeGreaterThanOrEqual(0);
  expect(macros.sync).toBeLessThanOrEqual(1);
  expect(macros.rhythm).toBeGreaterThanOrEqual(0);
  expect(macros.rhythm).toBeLessThanOrEqual(1);
});

test("keeps default direction compatible with composer prototype", () => {
  expect(recommendMacros(DEFAULT_DIRECTION)).toMatchObject({
    density: 0.48,
    split: 0.55,
    sync: 0.27,
    rhythm: 0.4,
  });
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
    type: "Ballad",
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
    type: "Darkwave" as const,
    bars: 16,
    seed: 99,
  };

  expect(generateChords(input)).toEqual(generateChords(input));
  expect(generateChords(input).reduce((sum, chord) => sum + chord.len, 0)).toBe(32);
});
