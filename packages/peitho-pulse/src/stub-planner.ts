import { createEmptyPattern, type PeithoPattern } from "@peitho/array";
import type { PulsePlanner, PulseRequest } from "./contracts";

export class StubPulsePlanner implements PulsePlanner {
  async generate(request: PulseRequest): Promise<PeithoPattern> {
    return createEmptyPattern({ bars: request.bars });
  }
}
