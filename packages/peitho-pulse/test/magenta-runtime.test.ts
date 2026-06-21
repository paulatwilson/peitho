import { expect, test } from "bun:test";
import { loadMusicRnnConstructor } from "../src/magenta-runtime";

test("loads MusicRNN without browser audio globals", async () => {
  const MusicRNN = await loadMusicRnnConstructor();
  expect(typeof MusicRNN).toBe("function");
});
