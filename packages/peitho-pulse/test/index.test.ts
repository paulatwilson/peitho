import { expect, test } from "bun:test";
import { StubPulsePlanner } from "../src/index";

test("pulse planner returns shared Peitho pattern shape", async () => {
  const planner = new StubPulsePlanner();
  const pattern = await planner.generate({ prompt: "8-bar ballad verse" });

  expect(pattern.steps).toBe(128);
  expect(pattern.chords).toEqual([]);
});
