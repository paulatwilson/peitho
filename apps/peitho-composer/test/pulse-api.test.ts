import { expect, test } from "bun:test";
import { createEmptyPattern } from "@peitho/array";
import { createPulseApi } from "../src/pulse-api";

const chordResult = {
  candidates: [],
  resolvedControls: {
    temperature: 1,
    repetitionPenalty: 3,
    repetitionWindow: 1,
    chordCount: 4,
    scalePolicy: "strict" as const,
    cadencePolicy: "repair" as const,
  },
};

const api = createPulseApi({
  chordGenerator: { generate: async () => chordResult },
  planner: { generate: async (request) => createEmptyPattern({ bars: request.bars }) },
  melodyPlanner: { generate: async () => [] },
  amtSessionPlayer: {
    generate: async (request) => ({
      role: request.role,
      program: request.role === "pad" ? 88 : 0,
      notes: [{ step: 0, len: 4, midi: 60 }],
      source: {
        provider: "amt",
        model: "test",
        seed: request.seed ?? 0,
        conditions: { topP: request.topP ?? 0.95, controlEventCount: 3, experimental: true },
      },
      warnings: [],
    }),
  },
});

test("pulse API ignores unrelated routes", async () => {
  const request = new Request("http://localhost/other", { method: "POST" });
  expect(await api(request, "/other")).toBeNull();
});

test("pulse API rejects invalid JSON", async () => {
  const request = new Request("http://localhost/pulse/chords", { method: "POST", body: "{" });
  const response = await api(request, "/pulse/chords");
  expect(response?.status).toBe(400);
  expect(await response?.text()).toBe("Invalid JSON");
});

test("pulse API delegates chord generation", async () => {
  const request = new Request("http://localhost/pulse/chords", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key: "C" }),
  });
  const response = await api(request, "/pulse/chords");
  expect(response?.status).toBe(200);
  expect(await response?.json()).toEqual(chordResult);
});

test("pulse API delegates experimental AMT Session Player generation", async () => {
  const request = new Request("http://localhost/pulse/session-player/amt", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      role: "pad",
      bars: 1,
      beatsPerBar: 4,
      stepsPerBeat: 4,
      tempo: 120,
      seed: 7,
      chords: [{ name: "Cm", start: 0, len: 2, tones: [48, 51, 55] }],
    }),
  });

  const response = await api(request, "/pulse/session-player/amt");
  expect(response?.status).toBe(200);
  expect(await response?.json()).toMatchObject({
    role: "pad",
    program: 88,
    notes: [{ step: 0, len: 4, midi: 60 }],
  });
});
