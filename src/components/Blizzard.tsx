// Animated blizzard particles — three layers of falling snow with slight
// horizontal sway. Each flake is an outlined circle (so it reads hand-drawn).
//
// Animation is split across nested <g>/<circle> so the two transforms
// (vertical fall + horizontal sway) compose instead of fighting.

import { useMemo } from 'react';
import { lerp, seededRand } from '../lib/noise';

interface BlizzardProps {
  width: number;
  height: number;
  /** 0..1 — at 0 the component renders nothing. */
  intensity: number;
  outline: string;
}

interface Flake {
  x: number;
  delay: number;
  r: number;
  dur: number;
}

interface LayerSpec {
  count: number;
  size: [number, number];
  speed: number;
  opacity: number;
  sway: number;
  flakes: Flake[];
}

const SPECS: Array<Omit<LayerSpec, 'flakes'>> = [
  { count: 70, size: [1.8, 3.0], speed: 9, opacity: 0.95, sway: 16 },
  { count: 50, size: [1.2, 2.0], speed: 14, opacity: 0.7, sway: 12 },
  { count: 35, size: [0.8, 1.4], speed: 22, opacity: 0.45, sway: 7 },
];

export default function Blizzard({ width, height, intensity, outline }: BlizzardProps) {
  const layers = useMemo<LayerSpec[]>(() => {
    let seed = 555;
    return SPECS.map((ls) => {
      const rand = seededRand(seed++);
      const flakes: Flake[] = [];
      const cnt = Math.round(ls.count * intensity);
      for (let i = 0; i < cnt; i++) {
        flakes.push({
          x: rand() * width,
          delay: -rand() * ls.speed,
          r: lerp(ls.size[0], ls.size[1], rand()),
          dur: ls.speed * (0.7 + rand() * 0.6),
        });
      }
      return { ...ls, flakes };
    });
  }, [width, height, intensity]);

  if (intensity < 0.02) return null;

  return (
    <g style={{ pointerEvents: 'none' }}>
      {layers.map((L, li) => (
        <g key={li} opacity={L.opacity * Math.min(1, intensity * 1.4)}>
          {L.flakes.map((f, i) => (
            <g
              key={i}
              style={{
                animation: `hd-snowfall-${li} ${f.dur}s linear ${f.delay}s infinite`,
              }}
            >
              <circle
                cx={f.x}
                cy={-10}
                r={f.r}
                fill="#faf6ec"
                stroke={outline}
                strokeWidth={0.7}
                style={{
                  animation: `hd-snowsway-${li} ${f.dur * 0.35}s ease-in-out ${f.delay}s infinite alternate`,
                }}
              />
            </g>
          ))}
          <style>{`
            @keyframes hd-snowfall-${li} {
              0%   { transform: translateY(0); }
              100% { transform: translateY(${height + 40}px); }
            }
            @keyframes hd-snowsway-${li} {
              0%   { transform: translateX(-${L.sway}px); }
              100% { transform: translateX(${L.sway}px); }
            }
          `}</style>
        </g>
      ))}
    </g>
  );
}
