// Mulberry32 PRNG — deterministic, zero dependencies
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

// Each candidate gets an independent seed so candidate N is reproducible
// without re-running all prior candidates.
export function deriveCandidateSeed(requestSeed: number, index: number): number {
  return ((requestSeed ^ (index * 0x9e3779b9)) >>> 0);
}

export function softmax(logits: Float32Array): Float32Array {
  let max = -Infinity;
  for (let i = 0; i < logits.length; i++) {
    if (logits[i] > max) max = logits[i];
  }
  const probs = new Float32Array(logits.length);
  let sum = 0;
  for (let i = 0; i < logits.length; i++) {
    const v = Math.exp(logits[i] - max);
    probs[i] = v;
    sum += v;
  }
  if (sum > 0) {
    for (let i = 0; i < probs.length; i++) probs[i] /= sum;
  }
  return probs;
}

export function sampleMultinomial(probs: Float32Array, rng: () => number): number {
  let r = rng();
  for (let i = 0; i < probs.length; i++) {
    r -= probs[i];
    if (r <= 0) return i;
  }
  // Floating-point rounding fallback: return last non-zero entry
  for (let i = probs.length - 1; i >= 0; i--) {
    if (probs[i] > 0) return i;
  }
  return 0;
}

export function sampleGreedy(logits: Float32Array): number {
  let best = 0;
  for (let i = 1; i < logits.length; i++) {
    if (logits[i] > logits[best]) best = i;
  }
  return best;
}

export function sampleTopK(logits: Float32Array, k: number, rng: () => number): number {
  const sorted = Array.from({ length: logits.length }, (_, i) => i)
    .sort((a, b) => logits[b] - logits[a]);
  const topK = sorted.slice(0, Math.max(1, k));
  const masked = new Float32Array(logits.length).fill(-Infinity);
  for (const i of topK) masked[i] = logits[i];
  return sampleMultinomial(softmax(masked), rng);
}

export function sampleTopP(logits: Float32Array, p: number, rng: () => number): number {
  const probs = softmax(logits);
  const sorted = Array.from({ length: logits.length }, (_, i) => i)
    .sort((a, b) => probs[b] - probs[a]);

  let cumsum = 0;
  const nucleus: number[] = [];
  for (const i of sorted) {
    nucleus.push(i);
    cumsum += probs[i];
    if (cumsum >= p) break;
  }

  const masked = new Float32Array(logits.length).fill(-Infinity);
  for (const i of nucleus) masked[i] = logits[i];
  return sampleMultinomial(softmax(masked), rng);
}
