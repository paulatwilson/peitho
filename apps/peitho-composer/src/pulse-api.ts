import {
  AmtSessionPlayerSpike,
  ChordSeqAIGenerator,
  MagentaMelodyPlanner,
  MagentaPulsePlanner,
  generateMelodyCandidates,
  type ChordGenRequest,
  type MelodyGenerationRequest,
  type MelodyPlanner,
  type PulsePlanner,
  type PulseRequest,
  type AmtSessionPlayerRequest,
  type AmtSessionPlayerResult,
} from "@peitho/pulse";
import { errorResponse, isResponse, readJson } from "./http-response";

type PulseApiDependencies = {
  chordGenerator: Pick<ChordSeqAIGenerator, "generate">;
  planner: PulsePlanner;
  melodyPlanner: MelodyPlanner;
  amtSessionPlayer: { generate(request: AmtSessionPlayerRequest): Promise<AmtSessionPlayerResult> };
};

export function createPulseApi(
  dependencies: PulseApiDependencies = {
    chordGenerator: new ChordSeqAIGenerator(),
    planner: new MagentaPulsePlanner(),
    melodyPlanner: new MagentaMelodyPlanner(),
    amtSessionPlayer: new AmtSessionPlayerSpike(),
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

    if (pathname === "/pulse/session-player/amt") {
      const body = await readJson<AmtSessionPlayerRequest>(request);
      if (isResponse(body)) return body;

      try {
        return Response.json(await dependencies.amtSessionPlayer.generate(body));
      } catch (error) {
        return errorResponse(error);
      }
    }

    return null;
  };
}
