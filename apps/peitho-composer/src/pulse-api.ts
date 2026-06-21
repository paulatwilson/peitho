import {
  ChordSeqAIGenerator,
  MagentaMelodyPlanner,
  MagentaPulsePlanner,
  generateMelodyCandidates,
  type ChordGenRequest,
  type MelodyGenerationRequest,
  type MelodyPlanner,
  type PulsePlanner,
  type PulseRequest,
} from "@peitho/pulse";
import { errorResponse, isResponse, readJson } from "./http-response";

type PulseApiDependencies = {
  chordGenerator: Pick<ChordSeqAIGenerator, "generate">;
  planner: PulsePlanner;
  melodyPlanner: MelodyPlanner;
};

export function createPulseApi(
  dependencies: PulseApiDependencies = {
    chordGenerator: new ChordSeqAIGenerator(),
    planner: new MagentaPulsePlanner(),
    melodyPlanner: new MagentaMelodyPlanner(),
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
      const body = await readJson<PulseRequest | MelodyGenerationRequest>(request);
      if (isResponse(body)) return body;

      if (body.target === "melody" || body.target === "counter") {
        try {
          const candidates = await generateMelodyCandidates(
            body as MelodyGenerationRequest,
            dependencies.melodyPlanner,
          );
          return Response.json(candidates);
        } catch (error) {
          return errorResponse(error);
        }
      }

      try {
        return Response.json(await dependencies.planner.generate(body as PulseRequest));
      } catch (error) {
        return errorResponse(error);
      }
    }

    return null;
  };
}
