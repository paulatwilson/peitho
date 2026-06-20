// MIT-licensed chord vocabulary from PetrIvan/chord-seq-ai-app.
// Imported from .contrib at dev time — this module is CLI/tooling only.
import { tokenToChord } from "../../../../.contrib/chord-progression-ai/chord-seq-ai-app/src/data/token_to_chord.ts";

export const VOCAB_SIZE = Object.keys(tokenToChord).length; // 1033 chord tokens
export const NUM_TOKENS = VOCAB_SIZE + 2;                   // 1035 (+ start + end specials)
export const START_TOKEN = VOCAB_SIZE;                       // 1033
export const END_TOKEN = VOCAB_SIZE + 1;                     // 1034

const ROOT_RE = /^([A-G][#b]?)/;

const PRIMARY_SYMBOL: string[] = new Array(VOCAB_SIZE);
const ROOT_NOTE: string[] = new Array(VOCAB_SIZE);

for (const [idStr, names] of Object.entries(tokenToChord)) {
  const id = Number(idStr);
  const primary = names[0];
  PRIMARY_SYMBOL[id] = primary;
  ROOT_NOTE[id] = primary.match(ROOT_RE)?.[1] ?? primary[0];
}

const SYMBOL_TO_TOKEN = new Map<string, number>();
for (const [idStr, names] of Object.entries(tokenToChord)) {
  for (const name of names) {
    if (!SYMBOL_TO_TOKEN.has(name)) SYMBOL_TO_TOKEN.set(name, Number(idStr));
  }
}

export function primarySymbol(tokenId: number): string {
  return PRIMARY_SYMBOL[tokenId] ?? `token:${tokenId}`;
}

export function rootNote(tokenId: number): string {
  return ROOT_NOTE[tokenId] ?? "C";
}

export function symbolToToken(symbol: string): number | undefined {
  return SYMBOL_TO_TOKEN.get(symbol);
}
