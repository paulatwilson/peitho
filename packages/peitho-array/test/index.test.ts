import { expect, test } from "bun:test";
import {
  DEFAULT_DIRECTION,
  DIRECTION_TYPES,
  OPTIONS,
  SEGMENTS,
  createEmptyPattern,
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
