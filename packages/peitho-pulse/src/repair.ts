import { quantizeToGrid, snapToScale, thinDensity, type NoteEvent } from "@peitho/array";
import type { PulseRequest } from "./contracts";

export function repairNotes(notes: NoteEvent[], request: PulseRequest, seed: number): NoteEvent[] {
  return thinDensity(
    snapToScale(quantizeToGrid(notes, 4), request.key, request.scale),
    request.density,
    seed,
  );
}
