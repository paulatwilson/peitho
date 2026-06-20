import { expect, test } from "bun:test";
import directionPresets from "../src/direction-presets.json";

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

test("every direction preset has chord translation rules", () => {
  expect(Object.keys(directionPresets.chordDirections.typeDefaults).sort()).toEqual(
    directionPresets.types.map((preset) => preset.name).sort(),
  );
  expect(Object.keys(directionPresets.chordDirections.segmentModifiers).sort()).toEqual(
    directionPresets.segments.map((preset) => preset.name).sort(),
  );
  expect(Object.keys(directionPresets.chordDirections.optionModifiers).sort()).toEqual(
    directionPresets.options.map((preset) => preset.name).sort(),
  );
});

test("every Type maps to supported Pulse model conditions", () => {
  const supportedGenres = new Set<string>(ComposerEngine.PULSE_GENRES);
  const supportedDecades = new Set<number>(ComposerEngine.PULSE_DECADES);

  for (const preset of directionPresets.types) {
    expect(preset.pulseConditions.genres.length).toBeGreaterThan(0);
    expect(preset.pulseConditions.genres.every((genre) => supportedGenres.has(genre))).toBe(true);
    if ("defaultDecade" in preset.pulseConditions && preset.pulseConditions.defaultDecade != null) {
      expect(supportedDecades.has(preset.pulseConditions.defaultDecade)).toBe(true);
    }
  }

  expect(ComposerEngine.pulseConditions("Cinematic")).toEqual({ genres: ["Soundtrack"] });
  expect(ComposerEngine.pulseConditions("Darkwave")).toEqual({
    genres: ["Darkwave", "Electronic"],
    defaultDecade: 1980,
  });
  expect(ComposerEngine.pulseConditions("Unknown Type")).toEqual({ genres: ["Pop", "Folk"] });
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
  expect(ComposerEngine.pulseKeywords("Darkwave", "Build", "Chromatic Tension", "Heptatonic Natural Minor")).toEqual([
    "cold",
    "minor",
    "shadowy",
    "rising",
    "tension",
    "chromatic",
    "uneasy",
    "melancholic",
  ]);
});

test("Pulse keyword defaults respond to scale and option together", () => {
  const major = ComposerEngine.pulseKeywords("Ballad", "Verse", "Rousing Crescendo", "Heptatonic Major");
  const minor = ComposerEngine.pulseKeywords(
    "Ballad",
    "Verse",
    "Rousing Crescendo",
    "Heptatonic Natural Minor",
  );

  expect(major).toContain("uplifting");
  expect(major).toContain("major");
  expect(minor).toContain("yearning");
  expect(minor).toContain("melancholic");
  expect(minor).not.toContain("uplifting");
  expect(minor).not.toContain("bright");
});

test("every Type, Segment, Option, and Scale resolves without conflicting default chips", () => {
  for (const type of ComposerEngine.TYPES) {
    for (const segment of ComposerEngine.SEGMENTS) {
      for (const option of ComposerEngine.OPTIONS) {
        for (const scale of ComposerEngine.SCALE_LIST) {
          const keywords = ComposerEngine.pulseKeywords(type, segment, option, scale);
          const blocked = Object.keys(directionPresets.scaleProfiles[scale].replacements);
          expect(keywords.some((keyword) => blocked.includes(keyword))).toBe(false);
          expect(new Set(keywords).size).toBe(keywords.length);
        }
      }
    }
  }
});

test("composer exposes the complete unique Pulse keyword catalogue", () => {
  const presetKeywords = [
    ...directionPresets.types,
    ...directionPresets.segments,
    ...directionPresets.options,
  ].flatMap((preset) => preset.pulseKeywords);
  const scaleKeywords = Object.values(directionPresets.scaleProfiles).flatMap((profile) => [
    ...profile.pulseKeywords,
    ...Object.values(profile.replacements),
  ]);

  expect(ComposerEngine.PULSE_KEYWORDS).toEqual([...new Set([...presetKeywords, ...scaleKeywords])]);
  expect(new Set(ComposerEngine.PULSE_KEYWORDS).size).toBe(ComposerEngine.PULSE_KEYWORDS.length);
  expect(ComposerEngine.PULSE_KEYWORDS).toContain("emotional");
  expect(ComposerEngine.PULSE_KEYWORDS).toContain("descending");
});

test("composer feeds preset output into peitho-array", () => {
  const macros = ComposerEngine.recommendMacros("Ballad", "Verse", "Rousing Crescendo", "Pentatonic Major");
  const chords = ComposerEngine.genChords("E", "Pentatonic Major", "Ballad", "Verse", "Rousing Crescendo", 123);
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

test("type, segment, and option resolve into audibly different chord directions", () => {
  const crescendo = ComposerEngine.chordDirection("Ballad", "Verse", "Rousing Crescendo");
  const driving = ComposerEngine.chordDirection("Ballad", "Verse", "Driving Pulse");
  const crescendoChords = ComposerEngine.genChords(
    "E",
    "Heptatonic Natural Minor",
    "Ballad",
    "Verse",
    "Rousing Crescendo",
    1234,
  );
  const drivingChords = ComposerEngine.genChords(
    "E",
    "Heptatonic Natural Minor",
    "Ballad",
    "Verse",
    "Driving Pulse",
    1234,
  );

  expect(crescendo).toMatchObject({
    chordLengths: [2, 2, 2, 3, 3],
    extensionProbability: 0.75,
    progressionProfile: { cadence: "strong", tension: 0.55, repetition: 0.45 },
  });
  expect(driving).toMatchObject({
    chordLengths: [1, 1, 2, 3, 3],
    extensionProbability: 0.5,
    progressionProfile: { cadence: "loop", tension: 0.45, repetition: 0.85 },
  });
  expect(crescendoChords.map((chord) => chord.name)).not.toEqual(drivingChords.map((chord) => chord.name));
  expect(crescendoChords.at(-1)!.name.startsWith("E")).toBe(true);
  expect(drivingChords.at(-1)!.name.startsWith("E")).toBe(false);
});
