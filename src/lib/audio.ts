// Synthesized meditation bell — C-major chord with exponential decay.
// Pure Web Audio API; no audio files.

let ctx: AudioContext | null = null;

type CtxLike = AudioContext & { state: AudioContextState };

function getCtx(): CtxLike | null {
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx as CtxLike;
}

interface ChimeOptions {
  /** Seconds from now to play. Default 0. */
  when?: number;
  /** Master gain 0..1. Default 0.35. */
  gain?: number;
}

/**
 * Bell-like singing-bowl chime: C-major triad with FM-shaped sines + a
 * detuned air-shimmer voice, low-pass filtered, exponential decay.
 *
 * Resilient to suspended AudioContext on iOS — if the context hasn't
 * resumed yet, we wait for the 'running' state before scheduling so
 * oscillators aren't scheduled relative to currentTime=0.
 */
export function chime(opts: ChimeOptions = {}): void {
  const ac = getCtx();
  if (!ac) return;

  if (ac.state === 'running') {
    scheduleChime(ac, opts);
    return;
  }

  // Suspended (iOS gesture race) — wait for state to flip, then schedule.
  const onStateChange = () => {
    if (ac.state === 'running') {
      ac.removeEventListener('statechange', onStateChange);
      scheduleChime(ac, opts);
    }
  };
  ac.addEventListener('statechange', onStateChange);
  // Belt-and-suspenders: nudge resume again
  void ac.resume();

  // Safety timeout — give up after 1s if the context never resumed
  // (avoids a leaked listener if audio is hard-blocked, e.g. mute switch).
  window.setTimeout(() => {
    ac.removeEventListener('statechange', onStateChange);
  }, 1000);
}

function scheduleChime(ac: CtxLike, { when = 0, gain = 0.35 }: ChimeOptions): void {
  const t0 = ac.currentTime + when;

  // [frequency, amplitude, decaySeconds]
  const voices: Array<[number, number, number]> = [
    [261.63, 0.55, 7.0], // C4 fundamental warmth
    [523.25, 1.0, 6.0], // C5
    [659.25, 0.65, 5.0], // E5
    [783.99, 0.45, 4.5], // G5
    [1046.5, 0.22, 3.5], // C6 sparkle
    [1318.5, 0.12, 2.5], // E6
  ];

  const master = ac.createGain();
  master.gain.value = gain;
  master.connect(ac.destination);

  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3200;
  lp.Q.value = 0.4;
  lp.connect(master);

  for (const [f, a, decay] of voices) {
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    osc.frequency.setValueAtTime(f * 1.003, t0);
    osc.frequency.exponentialRampToValueAtTime(f, t0 + 0.6);

    const g = ac.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(a * 0.55, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);

    osc.connect(g);
    g.connect(lp);
    osc.start(t0);
    osc.stop(t0 + decay + 0.1);
  }

  // Faint detuned shimmer for air
  const air = ac.createOscillator();
  air.type = 'sine';
  air.frequency.value = 1567.98;
  const ag = ac.createGain();
  ag.gain.setValueAtTime(0, t0);
  ag.gain.linearRampToValueAtTime(0.05, t0 + 0.05);
  ag.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.2);
  air.connect(ag);
  ag.connect(master);
  air.start(t0);
  air.stop(t0 + 2.4);
}

/** Unlock the AudioContext on the first user gesture (iOS Safari). */
export function prime(): void {
  const ac = getCtx();
  if (!ac) return;
  const b = ac.createBuffer(1, 1, 22050);
  const s = ac.createBufferSource();
  s.buffer = b;
  s.connect(ac.destination);
  s.start(0);
}
