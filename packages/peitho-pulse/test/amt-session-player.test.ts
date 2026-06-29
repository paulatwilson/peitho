import { expect, test } from "bun:test";
import { buildAmtWorkerRequest } from "../src/amt-session-player";

test("maps Peitho chords and locked tracks into AMT controls", () => {
  const request = buildAmtWorkerRequest({
    role: "pad",
    bars: 2,
    beatsPerBar: 4,
    stepsPerBeat: 4,
    tempo: 120,
    seed: 12,
    topP: 0.9,
    chords: [{ name: "Cm", start: 0, len: 2, tones: [48, 51, 55] }],
    lockedTracks: [{ program: 40, notes: [{ step: 4, len: 2, midi: 67 }] }],
  });

  expect(request).toMatchObject({
    program: 88,
    durationSeconds: 4,
    topP: 0.9,
    seed: 12,
  });
  expect(request.controls).toHaveLength(4);
  expect(request.controls[0]).toEqual({
    startSeconds: 0,
    durationSeconds: 2,
    pitch: 48,
    program: 0,
  });
  expect(request.controls[3]).toEqual({
    startSeconds: 0.5,
    durationSeconds: 0.25,
    pitch: 67,
    program: 40,
  });
});

test("rejects an AMT request without locked chords", () => {
  expect(() => buildAmtWorkerRequest({
    role: "piano",
    bars: 8,
    beatsPerBar: 4,
    stepsPerBeat: 4,
    tempo: 120,
    chords: [],
  })).toThrow("requires locked chords");
});
