import {
  ChordSeqAIGenerator,
  MagentaPulsePlanner,
  type ChordGenRequest,
  type PulsePlanner,
  type PulseRequest,
} from "@peitho/pulse";
import { errorResponse, isResponse, readJson } from "./http-response";

type PulseApiDependencies = {
  chordGenerator: Pick<ChordSeqAIGenerator, "generate">;
  planner: PulsePlanner;
};

export function createPulseApi(
  dependencies: PulseApiDependencies = {
    chordGenerator: new ChordSeqAIGenerator(),
    planner: new MagentaPulsePlanner(),
  },
) {
  return async function pulseApi(request: Request, pathname: string): Promise<Response | null> {
    if (request.method !== "POST") return null;

    if (pathname === "/pulse/chords") {
      const body = await readJson<ChordGenRequest>(request);
      if (isResponse(body)) return body;

      try {
        return Response.json(await dependencies.chordGenerator.generate(body));
      } catch (error) {
        return errorResponse(error);
      }
    }

    if (pathname === "/pulse/generate") {
      const body = await readJson<PulseRequest>(request);
      if (isResponse(body)) return body;

      try {
        return Response.json(await dependencies.planner.generate(body));
      } catch (error) {
        return errorResponse(error);
      }
    }

    return null;
  };
}
