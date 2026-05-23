// Hand-drawn Ascend — same behaviour as MVP (timer, streak, web-audio bell)
// but a fully hand-drawn UI: Patrick Hand type, no glass pills, hand-drawn
// circle for the Begin button with a white centre + black "begin" text.

const { useState, useEffect, useRef, useCallback } = React;

function timerSecondsForStreak(streak) {
  const base = 5 * 60;
  const grown = base + streak * 5;
  return Math.max(60, Math.min(30 * 60, grown));
}

function formatMMSS(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

/* ------------------------------------------------- Tweakable defaults */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "streak": 28,
  "progress": 42,
  "timerOverride": 15,
  "timeOfDay": "day",
  "completedToday": false
}/*EDITMODE-END*/;

/* =================================================================== App */

const HAND_FONT = "'Patrick Hand', 'Caveat', 'Comic Sans MS', cursive";
const INK = "#2a1c12";
const INK_SOFT = "rgba(42,28,18,0.6)";

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const set = (k, v) => setTweak(k, v);

  const [phase, setPhase] = useState("idle");
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0);
  const startTsRef = useRef(0);

  const sessionSeconds =
    t.timerOverride && t.timerOverride > 0
      ? Math.round(t.timerOverride)
      : timerSecondsForStreak(t.streak);

  const startSession = useCallback(() => {
    if (window.AscendAudio) {
      window.AscendAudio.prime();
      window.AscendAudio.chime({ gain: 0.45 });
    }
    setTotal(sessionSeconds);
    setRemaining(sessionSeconds);
    setPhase("starting");
    setTimeout(() => {
      startTsRef.current = performance.now();
      setPhase("running");
    }, 1400);
  }, [sessionSeconds]);

  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      const elapsed = (performance.now() - startTsRef.current) / 1000;
      const left = Math.max(0, total - elapsed);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(id);
        if (window.AscendAudio) window.AscendAudio.chime({ gain: 0.45 });
        setPhase("complete");
        set("completedToday", true);
        set("streak", t.streak + 1);
        set("progress", Math.min(300, t.progress + 1));
        setTimeout(() => setPhase("idle"), 4200);
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, total]);

  // Breathing scale during run
  const [breath, setBreath] = useState(1);
  useEffect(() => {
    if (phase !== "running") return setBreath(1);
    let raf;
    const start = performance.now();
    const loop = (now) => {
      const t = ((now - start) / 1000) % 8;
      const phaseT = t < 4 ? t / 4 : 1 - (t - 4) / 4;
      const s = 1 + 0.03 * (0.5 - 0.5 * Math.cos(phaseT * Math.PI));
      setBreath(s);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const ringProgress = phase === "running" ? 1 - remaining / total : 0;
  const isIdle = phase === "idle";
  const beginLabel = t.completedToday ? "tomorrow" : "begin";
  const buttonDisabled = t.completedToday;

  const phoneW = 402;
  const phoneH = 874;

  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex",
      alignItems: "center", justifyContent: "center",
      background: "#efece4",
      backgroundImage: "radial-gradient(ellipse at 50% 35%, #f6f3eb 0%, #d9d4c5 100%)",
      fontFamily: HAND_FONT,
    }}>
      <IOSDevice width={phoneW} height={phoneH} dark={false}>
        <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#fff" }}>
          {/* Landscape fills the screen */}
          <div style={{ position: "absolute", inset: 0 }}>
            <Landscape progress={t.progress} time={t.timeOfDay}
                       width={phoneW} height={phoneH} />
          </div>

          {/* Streak — top-left corner, handwritten, no pill */}
          <div style={{
            position: "absolute", top: 56, left: 28,
            color: INK,
            fontFamily: HAND_FONT,
            opacity: isIdle ? 1 : 0,
            transform: isIdle ? "translateY(0)" : "translateY(-6px)",
            transition: "opacity 1.2s ease, transform 1.2s ease",
            pointerEvents: "none",
            display: "flex", alignItems: "baseline", gap: 8,
          }}>
            <div style={{ fontSize: 36, lineHeight: 1, fontWeight: 400 }}>{t.streak}</div>
            <div style={{ fontSize: 18, fontWeight: 400, letterSpacing: 1 }}>
              {t.streak === 1 ? "day" : "days"}
            </div>
          </div>

          {/* Running timer (centred) */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: INK, pointerEvents: "none",
            transform: `scale(${breath})`,
            transition: "transform 0.04s linear",
          }}>
            {phase === "running" && (
              <div style={{
                fontFamily: HAND_FONT,
                fontSize: 96,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: 2,
              }}>
                {formatMMSS(remaining)}
              </div>
            )}
          </div>

          {/* Bottom block: upcoming-session timer + Begin button */}
          <div style={{
            position: "absolute", left: 0, right: 0, bottom: 64,
            display: "flex", flexDirection: "column", alignItems: "center",
            color: INK, fontFamily: HAND_FONT,
            opacity: isIdle ? 1 : 0,
            transform: isIdle ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 1.4s ease, transform 1.4s ease",
            pointerEvents: isIdle ? "auto" : "none",
          }}>
            <div style={{
              fontSize: 36, lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: 2,
              marginBottom: 22,
            }}>
              {formatMMSS(sessionSeconds)}
            </div>
            <BeginButton
              onClick={startSession}
              disabled={buttonDisabled}
              progress={ringProgress}
              label={beginLabel}
            />
          </div>
        </div>
      </IOSDevice>

      {/* Tweaks panel — keeps the MVP's controls */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Landscape">
          <TweakSlider label="Progress" min={0} max={300} step={1} unit=" / 300"
                       value={t.progress} onChange={(v) => set("progress", v)} />
          <div style={{ fontSize: 10, opacity: 0.55, padding: "2px 0 10px", lineHeight: 1.5 }}>
            0 prairie · 75 hills · 150 foothills · 225 mountains · 300 himalayas
          </div>
          <TweakSelect label="Time of day" value={t.timeOfDay}
                       options={[
                         { label: "Day", value: "day" },
                         { label: "Dawn", value: "dawn" },
                         { label: "Dusk", value: "dusk" },
                         { label: "Night", value: "night" },
                       ]}
                       onChange={(v) => set("timeOfDay", v)} />
        </TweakSection>
        <TweakSection label="Session">
          <TweakSlider label="Streak" min={0} max={365} step={1} unit=" days"
                       value={t.streak} onChange={(v) => set("streak", v)} />
          <TweakSlider label="Timer override" min={0} max={1800} step={5} unit="s"
                       value={t.timerOverride} onChange={(v) => set("timerOverride", v)} />
          <div style={{ fontSize: 10, opacity: 0.55, padding: "2px 0 10px", lineHeight: 1.5 }}>
            0s uses the streak rule ({formatMMSS(timerSecondsForStreak(t.streak))})
          </div>
          <TweakToggle label="Completed today" value={t.completedToday}
                       onChange={(v) => set("completedToday", v)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

/* ============================================================ BeginButton */

function BeginButton({ onClick, disabled, progress = 0, label = "begin" }) {
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
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        border: "none",
        background: "transparent",
        color: INK,
        cursor: disabled ? "default" : "pointer",
        padding: 0,
        opacity: disabled ? 0.55 : 1,
        transition: "transform .25s ease, opacity .4s ease",
        transform: pressed && !disabled ? "scale(0.96)" : "scale(1)",
        fontFamily: HAND_FONT,
        WebkitTapHighlightColor: "transparent",
      }}
      aria-label={label}
    >
      <svg width={size} height={size}
           style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <filter id="btn-rough" x="-15%" y="-15%" width="130%" height="130%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="9" />
            <feDisplacementMap in="SourceGraphic" scale="3" />
          </filter>
        </defs>
        {/* White-filled circle (so begin text always reads black-on-white) */}
        <g filter="url(#btn-rough)">
          <circle cx={size / 2} cy={size / 2} r={r}
                  fill="#ffffff" stroke={INK} strokeWidth="3" />
        </g>
        {/* Subtle progress ring overlaid on the outline while running */}
        {progress > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r}
                  fill="none" stroke={INK} strokeWidth="3"
                  strokeDasharray={c} strokeDashoffset={c * (1 - progress)}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  style={{ transition: "stroke-dashoffset .25s linear" }} />
        )}
      </svg>
      <span
        style={{
          position: "relative",
          fontWeight: 400,
          fontSize: 26,
          color: INK,
          fontFamily: HAND_FONT,
        }}
      >
        {label}
      </span>
    </button>
  );
}

/* --- mount --- */
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
