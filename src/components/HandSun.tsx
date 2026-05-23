// Hand-drawn sun — filled disc + ink outline + radiating ray strokes.

interface HandSunProps {
  cx: number;
  cy: number;
  r: number;
  color: string;
  ring: string;
  outline: string;
}

export default function HandSun({ cx, cy, r, color, ring, outline }: HandSunProps) {
  const rays = [];
  const rayCount = 10;
  for (let i = 0; i < rayCount; i++) {
    const a = (i / rayCount) * Math.PI * 2;
    const r1 = r * 1.25;
    const r2 = r * 1.55 + (i % 2 === 0 ? 4 : 0);
    rays.push(
      <line
        key={i}
        x1={cx + Math.cos(a) * r1}
        y1={cy + Math.sin(a) * r1}
        x2={cx + Math.cos(a) * r2}
        y2={cy + Math.sin(a) * r2}
        stroke={ring}
        strokeWidth={3}
        strokeLinecap="round"
      />,
    );
  }
  return (
    <g>
      {rays}
      <circle cx={cx} cy={cy} r={r} fill={color} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={outline} strokeWidth={2.5} />
    </g>
  );
}
