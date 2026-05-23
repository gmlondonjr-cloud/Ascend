// Ascend — root component. Orchestrates session lifecycle, persists state.
//
// Phases:
//   idle      — waiting for the user to press Begin
//   starting  — bell chime is ringing; brief settle pause before countdown
//   running   — timer counting down, no pause, no skip
//   complete  — bell rang for the end, brief celebration before returning to idle
//
// The session can only count once per local calendar day. Missed-day decay
// is applied on mount (in `applyDailyDecay`) so the user lands on a state
// reflecting today's reality.

import { useCallback, useEffect, useRef, useState } from 'react';
import Landscape from './components/Landscape';
import Streak from './components/Streak';
import Timer, { formatMMSS } from './components/Timer';
import BeginButton from './components/BeginButton';
import { chime, prime } from './lib/audio';
import { localDayKey } from './lib/date';
import {
  type AppState,
  applyDailyDecay,
  completeSession,
  initialState,
  isCompletedToday,
  timerSecondsForStreak,
} from './lib/progression';
import { loadState, saveState } from './lib/storage';
import { HAND_FONT, INK, SCREEN_H, SCREEN_W } from './theme';

type Phase = 'idle' | 'starting' | 'running' | 'complete';

export default function App() {
  const [state, setState] = useState<AppState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0);
  const startTsRef = useRef(0);

  /* ---------------------------------------------- load + daily decay */
  useEffect(() => {
    void (async () => {
      const loaded = await loadState();
      const today = localDayKey();
      const decayed = applyDailyDecay(loaded, today);
      setState(decayed);
      if (decayed !== loaded) saveState(decayed);
      setHydrated(true);
    })();
  }, []);

  /* ---------------------------------------------- session lifecycle */

  const today = localDayKey();
  const completedToday = hydrated && isCompletedToday(state, today);
  const sessionSeconds = timerSecondsForStreak(state.streak);

  const startSession = useCallback(() => {
    if (completedToday) return;
    prime();
    chime({ gain: 0.45 });
    setTotal(sessionSeconds);
    setRemaining(sessionSeconds);
    setPhase('starting');
    // Settle pause while the opening bell rings, then begin countdown.
    window.setTimeout(() => {
      startTsRef.current = performance.now();
      setPhase('running');
    }, 1400);
  }, [completedToday, sessionSeconds]);

  // Tick while running. Uses performance.now() so the timer survives a
  // background tab without drifting.
  useEffect(() => {
    if (phase !== 'running') return;
    const id = window.setInterval(() => {
      const elapsed = (performance.now() - startTsRef.current) / 1000;
      const left = Math.max(0, total - elapsed);
      setRemaining(left);
      if (left <= 0) {
        window.clearInterval(id);
        chime({ gain: 0.45 });
        const todayKey = localDayKey();
        setState((prev) => {
          const next = completeSession(prev, todayKey);
          saveState(next);
          return next;
        });
        setPhase('complete');
        window.setTimeout(() => setPhase('idle'), 4200);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, total]);

  /* ---------------------------------------------- breathing animation */

  const [breath, setBreath] = useState(1);
  useEffect(() => {
    if (phase !== 'running') {
      setBreath(1);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      const t = ((now - start) / 1000) % 8;
      const phaseT = t < 4 ? t / 4 : 1 - (t - 4) / 4;
      const s = 1 + 0.03 * (0.5 - 0.5 * Math.cos(phaseT * Math.PI));
      setBreath(s);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  /* ---------------------------------------------- render */

  const ringProgress = phase === 'running' ? 1 - remaining / total : 0;
  const isIdle = phase === 'idle';
  const beginLabel = completedToday ? 'tomorrow' : 'begin';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#efece4',
        backgroundImage:
          'radial-gradient(ellipse at 50% 35%, #f6f3eb 0%, #d9d4c5 100%)',
        fontFamily: HAND_FONT,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: SCREEN_W,
          height: SCREEN_H,
          maxWidth: '100vw',
          maxHeight: '100vh',
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        <div style={{ position: 'absolute', inset: 0 }}>
          <Landscape progress={state.progress} width={SCREEN_W} height={SCREEN_H} />
        </div>

        <Streak streak={state.streak} visible={isIdle} />

        {phase === 'running' && <Timer remaining={remaining} breath={breath} />}

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 64,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: INK,
            fontFamily: HAND_FONT,
            opacity: isIdle ? 1 : 0,
            transform: isIdle ? 'translateY(0)' : 'translateY(14px)',
            transition: 'opacity 1.4s ease, transform 1.4s ease',
            pointerEvents: isIdle ? 'auto' : 'none',
          }}
        >
          <div
            style={{
              fontSize: 36,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: 2,
              marginBottom: 22,
            }}
          >
            {formatMMSS(sessionSeconds)}
          </div>
          <BeginButton
            onClick={startSession}
            disabled={completedToday}
            progress={ringProgress}
            label={beginLabel}
          />
        </div>
      </div>
    </div>
  );
}
