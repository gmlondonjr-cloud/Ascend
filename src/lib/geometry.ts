// Procedural silhouette geometry — Gaussian skyline + mountain + rolling hills.

import { clamp01, lerp, ridgeNoise } from './noise';
import type { Scene } from './landscape';

/** Control-point x positions across the frame (0..1) for the main mountain range. */
export const PEAK_XS = [0.08, 0.20, 0.32, 0.42, 0.50, 0.58, 0.68, 0.80, 0.92];

/** Control-point x positions for the rolling background hills. */
export const HILL_XS = [0.04, 0.18, 0.30, 0.46, 0.62, 0.78, 0.94];

/** Y fraction where mountains meet the ground line. */
export const BASELINE = 0.86;

/**
 * Skyline-of-Gaussians (MAX, not SUM) — each control peak is an independent
 * bell curve; the silhouette at each x is whichever bell sits highest there.
 * Falloff exp(-d² · 0.6) gives a soft, naturalistic dip between peaks.
 */
export function maxOfGaussians(
  x: number,
  xs: readonly number[],
  heights: readonly number[],
  sigma: number,
): number {
  let max = 0;
  for (let i = 0; i < xs.length; i++) {
    const h = heights[i];
    if (h <= 0) continue;
    const d = (x - xs[i]) / sigma;
    const value = h * Math.exp(-d * d * 0.6);
    if (value > max) max = value;
  }
  return max;
}

export interface MountainGeometry {
  d: string;
  baseY: number;
}

/**
 * Build the main mountain silhouette path.
 *
 * Capped at totalH = 1.0 so `scene.peakAmp` directly equals the max height
 * of the central peak (the Himalayan stage's peakAmp = baseY ensures the
 * peak hits y=0, top of frame, precisely at progress=300).
 */
export function mountainPath(
  width: number,
  height: number,
  scene: Scene,
  seed = 999,
): MountainGeometry {
  const noise = ridgeNoise(seed);
  const baseY = height * BASELINE;
  const steps = Math.max(280, Math.round(width * 1.2));

  // Reserve some budget for jagged variation so noise + bump ≤ 1.0.
  const jaggedHeadroom = scene.jaggedness * 0.18;
  const bumpScale = 1 - jaggedHeadroom;

  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i++) {
    const x = i / steps;
    const bumpRaw = maxOfGaussians(x, PEAK_XS, scene.peakHeights, scene.sigma);
    const bump = bumpRaw * bumpScale;
    const peakEnvelope = clamp01(bumpRaw * 1.4);
    const n = noise(x * 5.4, 1.0, 0.95) * 0.6;
    const jaggedDelta = n * jaggedHeadroom * peakEnvelope;
    const totalH = Math.max(0, Math.min(1.0, bump + jaggedDelta));
    const y = baseY - scene.peakAmp * totalH;
    pts.push([x * width, y]);
  }

  let d = `M -10 ${baseY}`;
  for (const [x, y] of pts) d += ` L ${x} ${y}`;
  d += ` L ${width + 10} ${baseY} Z`;
  return { d, baseY };
}

export interface HillsGeometry {
  d: string;
}

/** Smooth rolling background hills — no jagged noise, just gentle bumps. */
export function hillsPath(
  width: number,
  height: number,
  scene: Scene,
  seed = 71,
): HillsGeometry {
  const noise = ridgeNoise(seed);
  const baseY = height * BASELINE;
  const steps = 240;

  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i++) {
    const x = i / steps;
    const bumpRaw = maxOfGaussians(x, HILL_XS, scene.hillHeights, 0.16);
    const wobble = noise(x * 2.4, 0.4, 0.2) * 0.04 * bumpRaw;
    const totalH = Math.max(0, Math.min(1.0, bumpRaw + wobble));
    const y = baseY - scene.hillAmp * totalH;
    pts.push([x * width, y]);
  }

  let d = `M -10 ${baseY}`;
  for (const [x, y] of pts) d += ` L ${x} ${y}`;
  d += ` L ${width + 10} ${baseY} Z`;
  return { d };
}
