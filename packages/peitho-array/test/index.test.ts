import { expect, test } from "bun:test";
import { createEmptyPattern, scaleMidi } from "../src/index";

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
