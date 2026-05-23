// Ascend — main app. Composes Landscape + minimal HUD + Begin button,
// inside an iPhone portrait frame.

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

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const set = (k, v) => setTweak(k, v);

  // "idle" | "starting" | "running" | "complete"
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

  // Subtle breathing scale (8s in / 8s out) during run
  const [breath, setBreath] = useState(1);
  useEffect(() => {
    if (phase !== "running") return setBreath(1);
    let raf;
    const start = performance.now();
    const loop = (now) => {
      const t = ((now - start) / 1000) % 8;
      const phaseT = t < 4 ? t / 4 : 1 - (t - 4) / 4;
      const s = 1 + 0.035 * (0.5 - 0.5 * Math.cos(phaseT * Math.PI));
      setBreath(s);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const ringProgress = phase === "running" ? 1 - remaining / total : 0;
  const isIdle = phase === "idle";
  const displayTime = phase === "running" ? remaining : sessionSeconds;
  const beginLabel = t.completedToday ? "Tomorrow" : "Begin";
  const buttonDisabled = t.completedToday;

  /* ------------------------------------------- iPhone-framed render */

  const phoneW = 402;
  const phoneH = 874;
  const ink = "rgba(255,255,255,0.96)";
  const inkSoft = "rgba(255,255,255,0.72)";
  const textShadow = "0 1px 14px rgba(0,0,0,0.5), 0 0 28px rgba(0,0,0,0.25)";

  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex",
      alignItems: "center", justifyContent: "center",
      background: "#e8e6e0",
      backgroundImage: "radial-gradient(ellipse at 50% 35%, #f3f1eb 0%, #d8d4cb 100%)",
      fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
    }}>
      <IOSDevice width={phoneW} height={phoneH} dark={true}>
        <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#000" }}>
          {/* Landscape */}
          <div style={{ position: "absolute", inset: 0 }}>
            <Landscape progress={t.progress} time={t.timeOfDay}
                       width={phoneW} height={phoneH} />
          </div>

          {/* Top fade to ensure status bar legibility */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 90,
            background: "linear-gradient(180deg, rgba(0,0,0,0.32), rgba(0,0,0,0))",
            pointerEvents: "none",
          }} />

          {/* Streak chip — top center, below dynamic island */}
          <div style={{
            position: "absolute", top: 64, left: 0, right: 0,
            display: "flex", justifyContent: "center",
            color: ink, textShadow,
            opacity: isIdle ? 1 : 0,
            transform: isIdle ? "translateY(0)" : "translateY(-8px)",
            transition: "opacity 1.2s ease, transform 1.2s ease",
            pointerEvents: "none",
          }}>
            <div style={{
              display: "flex", alignItems: "baseline", gap: 8,
              padding: "8px 18px",
              borderRadius: 999,
              background: "rgba(0,0,0,0.18)",
              backdropFilter: "blur(10px) saturate(120%)",
              WebkitBackdropFilter: "blur(10px) saturate(120%)",
              fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
            }}>
              <div style={{
                fontSize: 28, fontWeight: 200, letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
              }}>{t.streak}</div>
              <div style={{
                fontSize: 10, letterSpacing: "0.32em", fontWeight: 400,
                textTransform: "uppercase", color: inkSoft,
              }}>
                {t.streak === 1 ? "day" : "days"}
              </div>
            </div>
          </div>

          {/* Center: running timer */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: ink, textShadow, pointerEvents: "none",
            transform: `scale(${breath})`,
            transition: "transform 0.04s linear",
          }}>
            {phase === "running" && (
              <div style={{
                fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
                fontWeight: 200,
                fontSize: 76,
                lineHeight: 1,
                letterSpacing: "-0.03em",
                fontVariantNumeric: "tabular-nums",
              }}>
                {formatMMSS(remaining)}
              </div>
            )}
          </div>

          {/* Bottom: timer-up-top + Begin button */}
          <div style={{
            position: "absolute", left: 0, right: 0, bottom: 64,
            display: "flex", flexDirection: "column", alignItems: "center",
            color: ink, textShadow,
            opacity: isIdle ? 1 : 0,
            transform: isIdle ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 1.4s ease, transform 1.4s ease",
            pointerEvents: isIdle ? "auto" : "none",
          }}>
            {/* upcoming session time — pill backdrop keeps it legible against snow */}
            <div style={{
              display: "inline-flex",
              padding: "6px 20px",
              borderRadius: 999,
              background: "rgba(0,0,0,0.18)",
              backdropFilter: "blur(10px) saturate(120%)",
              WebkitBackdropFilter: "blur(10px) saturate(120%)",
              marginBottom: 24,
            }}>
              <div style={{
                fontSize: 28, fontWeight: 200, letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
                opacity: 0.95,
              }}>
                {formatMMSS(sessionSeconds)}
              </div>
            </div>
            <BeginButton
              onClick={startSession}
              disabled={buttonDisabled}
              progress={ringProgress}
              label={beginLabel}
              ink={ink}
            />
          </div>

          {/* Starting bell hold — empty overlay (no text per design brief) */}

          {/* Bottom fade for home indicator legibility */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 60,
            background: "linear-gradient(0deg, rgba(0,0,0,0.28), rgba(0,0,0,0))",
            pointerEvents: "none",
          }} />
        </div>
      </IOSDevice>

      {/* Tweaks */}
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

function BeginButton({ onClick, disabled, progress = 0, label = "Begin", ink }) {
  const [pressed, setPressed] = useState(false);
  const size = 116;
  const r = size / 2 - 2;
  const c = 2 * Math.PI * r;

  // Tune typography to keep label within ring
  const isLong = label.length > 6;
  const fontSize = isLong ? 11 : 12;
  const tracking = isLong ? "0.22em" : "0.4em";

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
        color: ink,
        cursor: disabled ? "default" : "pointer",
        padding: 0,
        opacity: disabled ? 0.55 : 1,
        transition: "transform .25s ease, opacity .4s ease",
        transform: pressed && !disabled ? "scale(0.96)" : "scale(1)",
        fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
        WebkitTapHighlightColor: "transparent",
      }}
      aria-label={label}
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.16)",
          backdropFilter: "blur(12px) saturate(120%)",
          WebkitBackdropFilter: "blur(12px) saturate(120%)",
        }}
      />
      <span
        style={{
          position: "absolute",
          inset: -14,
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(255,255,255,0.15), rgba(255,255,255,0) 70%)",
        }}
      />
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.32)",
          animation: disabled ? "none" : "pulseRing 3.6s ease-in-out infinite",
        }}
      />
      <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke="rgba(255,255,255,0.55)" strokeWidth="1" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke="rgba(255,255,255,0.95)" strokeWidth="1.3"
                strokeDasharray={c} strokeDashoffset={c * (1 - progress)}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: "stroke-dashoffset .25s linear" }} />
      </svg>
      <span
        style={{
          position: "relative",
          fontWeight: 400,
          fontSize,
          letterSpacing: tracking,
          textTransform: "uppercase",
          textShadow: "0 1px 8px rgba(0,0,0,0.4)",
        }}
      >
        {label}
      </span>
      <style>{`
        @keyframes pulseRing {
          0%, 100% { transform: scale(1); opacity: .35; }
          50% { transform: scale(1.18); opacity: 0; }
        }
      `}</style>
    </button>
  );
}

/* --- mount --- */
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
