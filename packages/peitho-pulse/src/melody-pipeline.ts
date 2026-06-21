import { enrichChords } from "./chord-enrichment";
import type {
  InternalMelodyRequest,
  MelodyCandidateReport,
  MelodyGenerationRequest,
  MelodyPlanner,
} from "./melody-contracts";
import { repairMelodyCandidate } from "./melody-repair";
import { scoreMelodyCandidate } from "./melody-scoring";

export async function generateMelodyCandidates(
  request: MelodyGenerationRequest,
  planner: MelodyPlanner,
): Promise<MelodyCandidateReport[]> {
  if (!request.chords.length) {
    throw new Error("Melody generation requires locked chords");
  }

  const enriched = enrichChords(request.chords, request.key, request.scale, request.bars);

  const internal: InternalMelodyRequest = { ...request, chords: enriched };

  const rawCandidates = await planner.generate(internal);

  const reports: MelodyCandidateReport[] = rawCandidates.map((candidate, i) => {
    const seed = (request.seed * 1000 + i * 137) & 0x7fffffff;
    const { notes, report } = repairMelodyCandidate(candidate.notes, request, seed);
    return scoreMelodyCandidate(
      notes,
      internal,
      report,
      candidate.source,
      request.target === "counter" ? request.melody : undefined,
    );
  });

  return reports.sort((a, b) => b.score - a.score);
}
