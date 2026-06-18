import type { PeithoPattern } from "@peitho/array";
import { createEmptyPattern } from "@peitho/array";

export type PulsePrompt = {
  prompt: string;
  density?: number;
  seed?: number;
};

export type PulsePlanner = {
  generate(input: PulsePrompt): Promise<PeithoPattern>;
};

export class StubPulsePlanner implements PulsePlanner {
  async generate(_input: PulsePrompt): Promise<PeithoPattern> {
    return createEmptyPattern({ bars: 8 });
  }
}

export type MlxRuntimeConfig = {
  modelPath: string;
  quantization: "int4" | "int8" | "fp16";
};
