// Landscape keyframes + smooth interpolation. The hand-drawn flat palette.

import { clamp01, lerp, smooth } from './noise';

/* ----------------------------------------------- colour utilities */

function hexToRgb(h: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function lerpColor(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex([lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)]);
}

function lerpArr(a: readonly number[], b: readonly number[], t: number): number[] {
  return a.map((v, i) => lerp(v, b[i] ?? v, t));
}

/* ----------------------------------------------- types */

export interface SunParams {
  /** 0..1 fraction of width. */
  x: number;
  /** 0..1 fraction of height. */
  y: number;
  /** Pixel radius. */
  r: number;
  /** Fill colour. */
  color: string;
  /** Ray-stroke colour. */
  ring: string;
}

export interface Keyframe {
  /** Days of cumulative landscape progress this keyframe represents (0..300). */
  progress: number;
  /** Solid sky background colour. */
  sky: string;
  sun: SunParams;
  /** 9 heights (0..1) at PEAK_XS positions — h=1 is the configured tallest peak. */
  peakHeights: number[];
  /** Max height in px of the central peak (h=1). */
  peakAmp: number;
  /** Multi-octave noise amplitude on the silhouette (0..1). */
  jaggedness: number;
  /** Gaussian bell width. Smaller = more distinct individual peaks. */
  sigma: number;
  /** 7 heights (0..1) for the rolling background hills at HILL_XS positions. */
  hillHeights: number[];
  hillAmp: number;
  /** Rock/mountain fill colour. */
  rockColor: string;
  /** Background-hill fill colour. */
  hillColor: string;
  /** Ground rect fill. */
  ground: string;
  /** Grass-dash stroke colour. */
  grass: string;
  /** Outline/ink colour. */
  outline: string;
  /** Fraction of mountain height covered in snow (0..1). */
  snowFraction: number;
  /** Falling-snow intensity (0..1). */
  blizzard: number;
}

/** Interpolated scene at a given progress. Same shape as a Keyframe (without `progress`). */
export type Scene = Omit<Keyframe, 'progress'>;

export type TimeOfDay = 'day' | 'dawn' | 'dusk' | 'night';

/* ----------------------------------------------- keyframes */

export const KEYFRAMES: Keyframe[] = [
  // ── 0  Empty prairie horizon ───────────────────────────────────────
  {
    progress: 0,
    sky: '#bedbe8',
    sun: { x: 0.74, y: 0.22, r: 44, color: '#ffb840', ring: '#f59f2c' },
    peakHeights: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    peakAmp: 0,
    jaggedness: 0,
    sigma: 0.16,
    hillHeights: [0, 0, 0, 0, 0, 0, 0],
    hillAmp: 0,
    rockColor: '#8d7964',
    hillColor: '#8aaa68',
    ground: '#7aae45',
    grass: '#4a7a26',
    outline: '#2a1c12',
    snowFraction: 0,
    blizzard: 0,
  },
  // ── 1  Small central hill + rolling hills behind ───────────────────
  {
    progress: 75,
    sky: '#aecde0',
    sun: { x: 0.72, y: 0.20, r: 42, color: '#ffb842', ring: '#f59f2c' },
    peakHeights: [0, 0, 0.20, 0.55, 1.0, 0.55, 0.20, 0, 0],
    peakAmp: 75,
    jaggedness: 0.04,
    sigma: 0.22,
    hillHeights: [0.40, 0.70, 0.50, 0.80, 0.45, 0.85, 0.40],
    hillAmp: 60,
    rockColor: '#6e9a48',
    hillColor: '#8fb866',
    ground: '#6da13e',
    grass: '#3e6420',
    outline: '#2a1c12',
    snowFraction: 0,
    blizzard: 0,
  },
  // ── 2  Alpine range emerging + foothills ───────────────────────────
  {
    progress: 150,
    sky: '#8eb6cc',
    sun: { x: 0.56, y: 0.18, r: 40, color: '#ffb43a', ring: '#e8932b' },
    peakHeights: [0.15, 0.35, 0.60, 0.85, 1.0, 0.88, 0.62, 0.35, 0.15],
    peakAmp: 230,
    jaggedness: 0.22,
    sigma: 0.16,
    hillHeights: [0.50, 0.85, 0.60, 0.95, 0.55, 0.85, 0.45],
    hillAmp: 115,
    rockColor: '#8a715a',
    hillColor: '#7d9e58',
    ground: '#5b8a35',
    grass: '#2e561b',
    outline: '#2a1c12',
    snowFraction: 0.32,
    blizzard: 0,
  },
  // ── 3  Tall alpine range ───────────────────────────────────────────
  {
    progress: 225,
    sky: '#5b86a8',
    sun: { x: 0.32, y: 0.14, r: 38, color: '#ffc24c', ring: '#e8983a' },
    peakHeights: [0.32, 0.58, 0.78, 0.94, 1.0, 0.96, 0.80, 0.60, 0.34],
    peakAmp: 430,
    jaggedness: 0.55,
    sigma: 0.14,
    hillHeights: [0.60, 0.92, 0.70, 1.0, 0.72, 0.90, 0.55],
    hillAmp: 165,
    rockColor: '#6b6e7e',
    hillColor: '#5f7a76',
    ground: '#3f5a48',
    grass: '#1f2e22',
    outline: '#1d1208',
    snowFraction: 0.68,
    blizzard: 0.15,
  },
  // ── 4  Himalayan summit ────────────────────────────────────────────
  {
    progress: 300,
    sky: '#345e80',
    sun: { x: 0.20, y: 0.16, r: 36, color: '#ffd566', ring: '#e8983a' },
    peakHeights: [0.50, 0.70, 0.86, 0.96, 1.0, 0.97, 0.88, 0.70, 0.52],
    peakAmp: 752, // = baseY (height*0.86 @ 874) → central peak hits y=0
    jaggedness: 0.92,
    sigma: 0.115,
    hillHeights: [0.70, 0.95, 0.80, 1.0, 0.82, 0.95, 0.65],
    hillAmp: 220,
    rockColor: '#4a4d63',
    hillColor: '#4c5e6e',
    ground: '#2c3a48',
    grass: '#10141c',
    outline: '#0e0a05',
    snowFraction: 0.96,
    blizzard: 1.0,
  },
];

/* ----------------------------------------------- interpolation */

/**
 * Compute the scene at any progress 0..300 by smoothly interpolating between
 * the two surrounding keyframes (cubic smoothstep eases the transitions).
 */
export function interpKeyframes(progress: number): Scene {
  const p = Math.max(0, Math.min(300, progress));
  let i = 0;
  while (i < KEYFRAMES.length - 1 && KEYFRAMES[i + 1].progress < p) i++;
  const a = KEYFRAMES[Math.min(i, KEYFRAMES.length - 1)];
  const b = KEYFRAMES[Math.min(i + 1, KEYFRAMES.length - 1)];
  const span = Math.max(1, b.progress - a.progress);
  const t = smooth(clamp01((p - a.progress) / span));

  return {
    sky: lerpColor(a.sky, b.sky, t),
    sun: {
      x: lerp(a.sun.x, b.sun.x, t),
      y: lerp(a.sun.y, b.sun.y, t),
      r: lerp(a.sun.r, b.sun.r, t),
      color: lerpColor(a.sun.color, b.sun.color, t),
      ring: lerpColor(a.sun.ring, b.sun.ring, t),
    },
    peakHeights: lerpArr(a.peakHeights, b.peakHeights, t),
    peakAmp: lerp(a.peakAmp, b.peakAmp, t),
    jaggedness: lerp(a.jaggedness, b.jaggedness, t),
    sigma: lerp(a.sigma, b.sigma, t),
    hillHeights: lerpArr(a.hillHeights, b.hillHeights, t),
    hillAmp: lerp(a.hillAmp, b.hillAmp, t),
    rockColor: lerpColor(a.rockColor, b.rockColor, t),
    hillColor: lerpColor(a.hillColor, b.hillColor, t),
    ground: lerpColor(a.ground, b.ground, t),
    grass: lerpColor(a.grass, b.grass, t),
    outline: lerpColor(a.outline, b.outline, t),
    snowFraction: lerp(a.snowFraction, b.snowFraction, t),
    blizzard: lerp(a.blizzard, b.blizzard, t),
  };
}

/**
 * Tint the scene for dawn/dusk/night. The MVP ships with `day` only; the
 * other modes are useful for future automatic time-of-day rendering.
 */
export function applyTimeOfDay(scene: Scene, time: TimeOfDay): Scene {
  if (time === 'day') return scene;
  const overlays = {
    dawn:  { tint: '#ff9e6e', strength: 0.40, sun: '#ffae72' },
    dusk:  { tint: '#a04860', strength: 0.50, sun: '#ff6840' },
    night: { tint: '#1a2244', strength: 0.78, sun: '#dde6f0' },
  } as const;
  const o = overlays[time];
  const s: Scene = JSON.parse(JSON.stringify(scene));
  s.sky = lerpColor(s.sky, o.tint, o.strength);
  s.hillColor = lerpColor(s.hillColor, o.tint, o.strength * 0.4);
  s.rockColor = lerpColor(s.rockColor, o.tint, o.strength * 0.4);
  s.ground = lerpColor(s.ground, o.tint, o.strength * 0.5);
  s.grass = lerpColor(s.grass, o.tint, o.strength * 0.5);
  s.sun.color = lerpColor(s.sun.color, o.sun, 0.7);
  return s;
}
