// Synthesized meditation bell — C major chord with exponential decay.
// No audio files, pure Web Audio API.
(function () {
  let ctx = null;

  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // Singing-bowl-ish bell: C major triad (C5, E5, G5) plus a low fundamental,
  // each voice an FM-shaped sine with a long exponential decay.
  function chime({ when = 0, gain = 0.35 } = {}) {
    const ac = getCtx();
    if (!ac) return;
    const t0 = ac.currentTime + when;

    // Partials chosen for a slightly inharmonic, bell-like timbre.
    // [frequency, amplitude, decaySeconds]
    const voices = [
      [261.63, 0.55, 7.0], // C4 fundamental warmth
      [523.25, 1.0, 6.0],  // C5
      [659.25, 0.65, 5.0], // E5
      [783.99, 0.45, 4.5], // G5
      [1046.5, 0.22, 3.5], // C6 sparkle
      [1318.5, 0.12, 2.5], // E6
    ];

    const master = ac.createGain();
    master.gain.value = gain;
    master.connect(ac.destination);

    // Subtle low-pass to keep it soft, not harsh
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 3200;
    lp.Q.value = 0.4;
    lp.connect(master);

    voices.forEach(([f, a, decay]) => {
      const osc = ac.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;

      // Slight pitch drop over time mimics a struck bowl settling
      osc.frequency.setValueAtTime(f * 1.003, t0);
      osc.frequency.exponentialRampToValueAtTime(f, t0 + 0.6);

      const g = ac.createGain();
      g.gain.value = 0;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(a * 0.55, t0 + 0.012); // fast attack
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);

      osc.connect(g);
      g.connect(lp);
      osc.start(t0);
      osc.stop(t0 + decay + 0.1);
    });

    // A faint detuned shimmer voice for air
    const air = ac.createOscillator();
    air.type = "sine";
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

  // Tiny tap to indicate a press without breaking the calm.
  function tap({ gain = 0.04 } = {}) {
    const ac = getCtx();
    if (!ac) return;
    const t0 = ac.currentTime;
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 880;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + 0.3);
  }

  // Unlock audio on first user gesture (mobile)
  function prime() {
    const ac = getCtx();
    if (!ac) return;
    // Play a silent buffer to unlock
    const b = ac.createBuffer(1, 1, 22050);
    const s = ac.createBufferSource();
    s.buffer = b;
    s.connect(ac.destination);
    s.start(0);
  }

  window.AscendAudio = { chime, tap, prime };
})();
