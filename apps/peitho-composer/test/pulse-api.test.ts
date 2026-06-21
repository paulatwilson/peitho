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
