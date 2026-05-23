// Top-left streak counter — handwritten, no chrome, ink colour.
import { HAND_FONT, INK } from '../theme';

interface StreakProps {
  streak: number;
  /** Hides the chip during a session for full-screen focus. */
  visible: boolean;
}

export default function Streak({ streak, visible }: StreakProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 56,
        left: 28,
        color: INK,
        fontFamily: HAND_FONT,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-6px)',
        transition: 'opacity 1.2s ease, transform 1.2s ease',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
      }}
    >
      <div style={{ fontSize: 36, lineHeight: 1, fontWeight: 400 }}>{streak}</div>
      <div style={{ fontSize: 18, fontWeight: 400, letterSpacing: 1 }}>
        {streak === 1 ? 'day' : 'days'}
      </div>
    </div>
  );
}
