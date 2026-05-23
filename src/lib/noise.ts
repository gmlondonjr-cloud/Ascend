// Multi-octave ridge noise. Deterministic given a seed — used to wobble the
// procedural mountain silhouette so identical app state always renders the
// same mountain shape.

export type NoiseFn = (x: number, baseFreq: number, detail: number) => number;

function seededRand(seed: number): () => number {
  let s = seed | 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

export { smooth, seededRand };

// One ridgeNoise per seed (cached). Each is a function of (x, baseFreq, detail).
const cache = new Map<number, NoiseFn>();

export function ridgeNoise(seed: number): NoiseFn {
  const cached = cache.get(seed);
  if (cached) return cached;

  const rand = seededRand(seed);
  const octaves = Array.from({ length: 5 }, (_, i) => ({
    phase: rand() * Math.PI * 2,
    freqMul: Math.pow(1.95, i),
    ampMul: Math.pow(0.55, i),
    jag: rand() * 0.6 + 0.4,
  }));

  const fn: NoiseFn = (x, baseFreq, detail) => {
    let y = 0;
    for (let i = 0; i < octaves.length; i++) {
      const o = octaves[i];
      const f = x * baseFreq * o.freqMul;
      const a = Math.sin(f + o.phase);
      const b = 1 - 2 * Math.abs(Math.sin(f * 0.5 + o.phase));
      const sharp = Math.sign(b) * Math.pow(Math.abs(b), 0.45);
      const peakish = lerp(b, sharp, clamp01((detail - 0.5) * 2));
      const w = Math.min(1, detail) * o.jag;
      y += lerp(a, peakish, w) * o.ampMul;
    }
    return y;
  };
  cache.set(seed, fn);
  return fn;
}
