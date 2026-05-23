// Central session timer — only renders while the session is running.
// Pairs with a slow breathing-scale animation in <App>.
import { HAND_FONT, INK } from '../theme';

function formatMMSS(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

interface TimerProps {
  /** Seconds remaining. */
  remaining: number;
  /** Multiplier for the breathing animation (slight scale wobble). */
  breath: number;
}

export default function Timer({ remaining, breath }: TimerProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: INK,
        pointerEvents: 'none',
        transform: `scale(${breath})`,
        transition: 'transform 0.04s linear',
      }}
    >
      <div
        style={{
          fontFamily: HAND_FONT,
          fontSize: 96,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: 2,
        }}
      >
        {formatMMSS(remaining)}
      </div>
    </div>
  );
}

export { formatMMSS };
