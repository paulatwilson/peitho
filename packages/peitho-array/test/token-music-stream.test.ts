import { expect, test } from "bun:test";
import { decodeTokenMusicStream, encodeTokenMusicStream } from "../src/token-music-stream";
import { chordPool, borrowedChordPool } from "../src/index";

test("round-trips chords, melody, counter and drums through TokenMusicStream v2", () => {
  const key = "E";
  const scale = "Pentatonic Major" as const;
  const inKeyChord = chordPool(key, scale)[0];
  const borrowed = borrowedChordPool(key, scale)[0];

  const input = {
    id: "test-clip",
    seed: 12345,
    bpm: 96,
    timeSignature: 44 as const,
    tuningA4: 440,
    key,
    scale,
    macros: { density: 0.5, split: 0.4, sync: 0.3, rhythm: 0.6 },
    chords: [
      { name: inKeyChord.name, start: 0, len: 8, tones: inKeyChord.tones },
      { name: borrowed.name, start: 8, len: 8, tones: borrowed.tones },
    ],
    melody: [
      { step: 0, len: 4, midi: 64, vel: 100 },
      { step: 8, len: 2, midi: 67, vel: 80 },
    ],
    counter: [{ step: 4, len: 4, midi: 52, vel: 70 }],
    drums: { kick: [0, 8], snare: [4, 12], hat: [0, 2, 4, 6], open: [14] },
  };

  const stream = encodeTokenMusicStream(input);
  expect(stream.v).toBe(2);
  expect(stream.mc).toEqual([0.5, 0.4, 0.3, 0.6]);

  const decoded = decodeTokenMusicStream(stream);

  expect(decoded.key).toBe(key);
  expect(decoded.scale).toBe(scale);
  expect(decoded.seed).toBe(input.seed);
  expect(decoded.bpm).toBe(input.bpm);
  expect(decoded.macros).toEqual(input.macros);
  expect(decoded.chords).toEqual(input.chords);
  expect(decoded.melody).toEqual(input.melody);
  expect(decoded.counter).toEqual(input.counter);
  expect(decoded.drums).toEqual(input.drums);
});

test("falls back to raw tones for a chord shape outside the named pools", () => {
  const input = {
    id: "custom-clip",
    seed: 1,
    bpm: 120,
    timeSignature: 44 as const,
    tuningA4: 440,
    key: "C",
    scale: "Pentatonic Major" as const,
    chords: [{ name: "Cmaj9#11", start: 0, len: 4, tones: [48, 52, 55, 59, 62, 66] }],
    melody: [],
    counter: [],
    drums: { kick: [], snare: [], hat: [], open: [] },
  };

  const stream = encodeTokenMusicStream(input);
  const decoded = decodeTokenMusicStream(stream);

  expect(decoded.chords[0].tones).toEqual(input.chords[0].tones);
  expect(decoded.chords[0].name).toBe("C(custom)");
});
