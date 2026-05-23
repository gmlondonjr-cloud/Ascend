import { useMemo } from 'react';
import { applyTimeOfDay, interpKeyframes } from '../lib/landscape';
import type { TimeOfDay } from '../lib/landscape';
import { BASELINE, hillsPath, mountainPath } from '../lib/geometry';
import { clamp01, seededRand } from '../lib/noise';
import Blizzard from './Blizzard';
import HandSun from './HandSun';

interface LandscapeProps {
  /** 0..300 cumulative days completed. Drives the entire scene. */
  progress: number;
  /** Default 'day'. Other values tint the scene. */
  time?: TimeOfDay;
  /** Render size in CSS pixels — defaults to the iPhone screen 402×874. */
  width?: number;
  height?: number;
}

export default function Landscape({
  progress,
  time = 'day',
  width = 402,
  height = 874,
}: LandscapeProps) {
  const scene = useMemo(
    () => applyTimeOfDay(interpKeyframes(progress), time),
    [progress, time],
  );

  const mountain = useMemo(
    () => mountainPath(width, height, scene, 999),
    [scene, width, height],
  );
  const hills = useMemo(
    () => hillsPath(width, height, scene, 71),
    [scene, width, height],
  );

  const baseY = height * BASELINE;
  const sf = clamp01(scene.snowFraction);
  const snowLineY = baseY - scene.peakAmp * (1 - sf);
  const showSnow = sf > 0.02 && scene.peakAmp > 5;
  const showMountain = scene.peakAmp > 1;
  const showHills = scene.hillAmp > 1;

  // Grass dashes scatter — drops off as the scene gets snowy.
  const grassDensity = clamp01(1 - sf * 1.2);
  const grass = useMemo(() => {
    if (grassDensity < 0.05) return [];
    const rand = seededRand(3131);
    const n = Math.round(72 * grassDensity);
    const out: Array<{ x: number; y: number; h: number; lean: number }> = [];
    for (let i = 0; i < n; i++) {
      const x = rand() * width;
      const y = baseY + 10 + rand() * (height * (1 - BASELINE) - 18);
      const h = 5 + rand() * 6;
      const lean = (rand() - 0.5) * 4;
      out.push({ x, y, h, lean });
    }
    return out;
  }, [grassDensity, width, height, baseY]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ width: '100%', height: '100%', display: 'block', background: scene.sky }}
    >
      <defs>
        {/* Single rough turbulence filter applied to every line-art group. */}
        <filter id="hd-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves={2} seed={4} />
          <feDisplacementMap in="SourceGraphic" scale={5} />
        </filter>
        <clipPath id="hd-snow-clip">
          <rect x={-20} y={-200} width={width + 40} height={snowLineY + 200} />
        </clipPath>
      </defs>

      {/* Solid sky — no gradient */}
      <rect width={width} height={height} fill={scene.sky} />

      {/* Sun with rays */}
      <g filter="url(#hd-rough)">
        <HandSun
          cx={width * scene.sun.x}
          cy={height * scene.sun.y}
          r={scene.sun.r}
          color={scene.sun.color}
          ring={scene.sun.ring}
          outline={scene.outline}
        />
      </g>

      {/* Background rolling hills */}
      {showHills && (
        <g filter="url(#hd-rough)">
          <path
            d={hills.d}
            fill={scene.hillColor}
            stroke={scene.outline}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* Ground strip + grass dashes */}
      <g filter="url(#hd-rough)">
        <rect
          y={baseY}
          width={width}
          height={height * (1 - BASELINE) + 20}
          fill={scene.ground}
        />
        <line x1={-5} y1={baseY} x2={width + 5} y2={baseY} stroke={scene.outline} strokeWidth={2} />
        {grass.map((g, i) => (
          <path
            key={i}
            d={`M ${g.x} ${g.y} q ${g.lean * 0.5} ${-g.h * 0.5} ${g.lean} ${-g.h}`}
            stroke={scene.grass}
            strokeWidth={1.6}
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </g>

      {/* Main mountain — flat rock, clipped snow above the snowline, ink outline */}
      {showMountain && (
        <g filter="url(#hd-rough)">
          <path d={mountain.d} fill={scene.rockColor} />
          {showSnow && <path d={mountain.d} fill="#fbf6e5" clipPath="url(#hd-snow-clip)" />}
          <path
            d={mountain.d}
            fill="none"
            stroke={scene.outline}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          {showSnow && (
            <line
              x1={0}
              y1={snowLineY}
              x2={width}
              y2={snowLineY}
              stroke={scene.outline}
              strokeWidth={1}
              opacity={0.18}
              clipPath="url(#hd-snow-clip)"
            />
          )}
        </g>
      )}

      {/* Falling snow (only at extreme stages) */}
      <Blizzard
        width={width}
        height={height}
        intensity={scene.blizzard}
        outline={scene.outline}
      />
    </svg>
  );
}
