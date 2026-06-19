import { expect, test } from "bun:test";
import { StubPulsePlanner, type PulseRequest } from "../src/index";

const baseRequest: PulseRequest = {
  target: "melody",
  key: "C",
  scale: "pentatonic-major",
  bars: 8,
  density: 0.5,
  split: 0.5,
  sync: 0.3,
  rhythm: 0.4,
};

test("stub planner returns correct Peitho pattern shape", async () => {
  const planner = new StubPulsePlanner();
  const pattern = await planner.generate(baseRequest);

  expect(pattern.steps).toBe(128);
  expect(pattern.bars).toBe(8);
  expect(pattern.chords).toEqual([]);
  expect(pattern.melody).toEqual([]);
  expect(pattern.counter).toEqual([]);
});

test("stub planner respects bars param", async () => {
  const planner = new StubPulsePlanner();
  const pattern = await planner.generate({ ...baseRequest, bars: 4 });

  expect(pattern.steps).toBe(64);
  expect(pattern.bars).toBe(4);
});

test("stub planner accepts all targets without throwing", async () => {
  const planner = new StubPulsePlanner();
  const targets = ["chords", "drums", "melody", "counter"] as const;

  for (const target of targets) {
    const pattern = await planner.generate({ ...baseRequest, target });
    expect(pattern.steps).toBe(128);
  }
});
