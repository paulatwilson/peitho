import { expect, test } from "bun:test";

const originalWindow = globalThis.window;
globalThis.window = {} as Window & typeof globalThis;

const { ComposerEngine } = await import("../src/composer-engine");

globalThis.window = originalWindow;

test("composer owns direction preset catalogue", () => {
  expect(ComposerEngine.TYPES).toContain("New Wave");
  expect(ComposerEngine.TYPES).toContain("Electropop");
  expect(ComposerEngine.TYPES).toContain("Classical");
  expect(ComposerEngine.TYPES).toContain("Jazz");
  expect(ComposerEngine.TYPES).toContain("Synth");
  expect(ComposerEngine.TYPES).toContain("Rock");
  expect(ComposerEngine.TYPES).toContain("Darkwave");
  expect(ComposerEngine.TYPES).toContain("Funk");
  expect(ComposerEngine.TYPES).toContain("R&B");
  expect(ComposerEngine.TYPES).toContain("House");
  expect(ComposerEngine.TYPES).toContain("Folk");
  expect(ComposerEngine.TYPES).toContain("Punk");
  expect(ComposerEngine.TYPES).toContain("Post-Rock");
  expect(ComposerEngine.SEGMENTS).toContain("Breakdown");
  expect(ComposerEngine.SEGMENTS).toContain("Hook");
  expect(ComposerEngine.SEGMENTS).toContain("Middle-Eight");
  expect(ComposerEngine.SEGMENTS).toContain("Build");
  expect(ComposerEngine.SEGMENTS).toContain("Drop");
  expect(ComposerEngine.SEGMENTS).toContain("Solo");
  expect(ComposerEngine.SEGMENTS).toContain("Interlude");
  expect(ComposerEngine.OPTIONS).toContain("Motorik Drive");
  expect(ComposerEngine.OPTIONS).toContain("Chromatic Tension");
  expect(ComposerEngine.OPTIONS).toContain("Staccato Push");
  expect(ComposerEngine.OPTIONS).toContain("Legato Float");
  expect(ComposerEngine.OPTIONS).toContain("Syncopated Lift");
  expect(ComposerEngine.OPTIONS).toContain("Suspended Colour");
  expect(ComposerEngine.OPTIONS).toContain("Pedal Point");
  expect(ComposerEngine.OPTIONS).toContain("Descending Line");
});

test("composer converts preset choices into bounded engine macros", () => {
  const macros = ComposerEngine.recommendMacros("Darkwave", "Breakdown", "Moody Wind Down", "Heptatonic Natural Minor");

  expect(macros.density).toBeGreaterThanOrEqual(0.05);
  expect(macros.density).toBeLessThanOrEqual(1);
  expect(macros.split).toBeGreaterThanOrEqual(0);
  expect(macros.split).toBeLessThanOrEqual(1);
  expect(macros.sync).toBeGreaterThanOrEqual(0);
  expect(macros.sync).toBeLessThanOrEqual(1);
  expect(macros.rhythm).toBeGreaterThanOrEqual(0);
  expect(macros.rhythm).toBeLessThanOrEqual(1);
});

test("composer merges pulse keyword defaults from selected presets", () => {
  expect(ComposerEngine.pulseKeywords("Darkwave", "Build", "Chromatic Tension")).toEqual([
    "cold",
    "minor",
    "shadowy",
    "rising",
    "tension",
    "chromatic",
    "uneasy",
  ]);
});

test("composer feeds preset output into peitho-array", () => {
  const macros = ComposerEngine.recommendMacros("Ballad", "Verse", "Rousing Crescendo", "Pentatonic Major");
  const chords = ComposerEngine.genChords("E", "Pentatonic Major", "Ballad");
  const notes = ComposerEngine.genMono(123, {
    ...macros,
    key: "E",
    scale: "Pentatonic Major",
    segment: "Verse",
    option: "Rousing Crescendo",
    register: [58, 84],
    sparse: 1.1,
  });

  expect(chords.reduce((sum, chord) => sum + chord.len, 0)).toBe(16);
  expect(notes.length).toBeGreaterThan(0);
});
