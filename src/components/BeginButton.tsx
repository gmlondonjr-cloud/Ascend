// Hand-drawn Begin button: a white-filled wobbly circle with black "begin"
// text inside. While the session runs, the outline doubles as a progress
// ring (strokeDashoffset animates toward 0 as the timer expires).
import { useState } from 'react';
import { HAND_FONT, INK } from '../theme';

interface BeginButtonProps {
  onClick: () => void;
  /** When true, the button is dimmed and not clickable (e.g. completed today). */
  disabled?: boolean;
  /** 0..1 — fills the outline as a progress ring while the session is running. */
  progress?: number;
  /** Button label — typically "begin" or "tomorrow". */
  label?: string;
}

export default function BeginButton({
  onClick,
  disabled = false,
  progress = 0,
  label = 'begin',
}: BeginButtonProps) {
  const [pressed, setPressed] = useState(false);
  const size = 116;
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;

  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        border: 'none',
        background: 'transparent',
        color: INK,
        cursor: disabled ? 'default' : 'pointer',
        padding: 0,
        opacity: disabled ? 0.55 : 1,
        transition: 'transform .25s ease, opacity .4s ease',
        transform: pressed && !disabled ? 'scale(0.96)' : 'scale(1)',
        fontFamily: HAND_FONT,
        WebkitTapHighlightColor: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-label={label}
    >
      <svg
        width={size}
        height={size}
        style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
      >
        <defs>
          <filter id="btn-rough" x="-15%" y="-15%" width="130%" height="130%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={2} seed={9} />
            <feDisplacementMap in="SourceGraphic" scale={3} />
          </filter>
        </defs>
        <g filter="url(#btn-rough)">
          <circle cx={size / 2} cy={size / 2} r={r} fill="#ffffff" stroke={INK} strokeWidth={3} />
        </g>
        {progress > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={INK}
            strokeWidth={3}
            strokeDasharray={c}
            strokeDashoffset={c * (1 - progress)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset .25s linear' }}
          />
        )}
      </svg>
      <span style={{ position: 'relative', fontWeight: 400, fontSize: 26, color: INK }}>
        {label}
      </span>
    </button>
  );
}
