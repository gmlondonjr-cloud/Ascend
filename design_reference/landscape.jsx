// Procedural meditation landscape — single central alpine range that ascends
// from a flat prairie horizon (progress=0) to a frame-topping Himalayan summit
// (progress=300). Background rolling hills layer adds depth. Snow line is a
// sharp horizontal cutoff (true treeline aesthetic), not a soft gradient.

const { useMemo } = React;

/* ---------------------------------------------------------------- helpers */

function seededRand(seed) {
  let s = seed | 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 1000000) / 1000000;
  };
}

function smooth(t) { return t * t * (3 - 2 * t); }
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp01(t) { return Math.max(0, Math.min(1, t)); }

function hexToRgb(h) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}
function rgbToHex([r, g, b]) {
  const c = (n) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
function lerpColor(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex([lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)]);
}
function lerpArr(a, b, t) {
  return a.map((v, i) => lerp(v, b[i] ?? v, t));
}

/* ------------------------------------------------------------- constants */

// Main alpine range — 9 control peaks across the frame
const PEAK_XS = [0.08, 0.20, 0.32, 0.42, 0.50, 0.58, 0.68, 0.80, 0.92];

// Back rolling hills — 7 control bumps, offset from main peaks so the two
// layers read as distinct features rather than a doubled silhouette
const HILL_XS = [0.04, 0.18, 0.30, 0.46, 0.62, 0.78, 0.94];

const BASELINE = 0.86; // y fraction where mountains meet the ground

/* ------------------------------------------------------------- keyframes */

const KEYFRAMES = [
  // ── 0  Empty prairie horizon ─────────────────────────────────────
  {
    progress: 0,
    sky: { top: "#bcd6e2", mid: "#dde8e8", bottom: "#f1e9d6" },
    sun: { x: 0.74, y: 0.22, r: 78, color: "#fff4dd", glow: 0.6 },
    hazeColor: "#e6dfc9",
    hazeOpacity: 0.7,
    peakHeights: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    peakAmp: 0,
    jaggedness: 0,
    sigma: 0.14,
    hillHeights: [0, 0, 0, 0, 0, 0, 0],
    hillAmp: 0,
    rockColor: "#6b8a4a",
    hillColor: "#8aaa68",
    ground: { top: "#6b8a4a", bottom: "#3d6326" },
    snowFraction: 0,
    blizzard: 0,
    starOpacity: 0,
  },
  // ── 1  Small central hill + rolling backdrop ─────────────────────
  {
    progress: 75,
    sky: { top: "#a8ccdd", mid: "#cad9d8", bottom: "#e6dac0" },
    sun: { x: 0.72, y: 0.20, r: 72, color: "#fff0d6", glow: 0.55 },
    hazeColor: "#d5cdb0",
    hazeOpacity: 0.7,
    peakHeights: [0, 0, 0.2, 0.55, 1.0, 0.55, 0.2, 0, 0],
    peakAmp: 75,
    jaggedness: 0.04,
    sigma: 0.22,
    hillHeights: [0.4, 0.7, 0.5, 0.8, 0.45, 0.85, 0.4],
    hillAmp: 60,
    rockColor: "#6a8550",
    hillColor: "#8aa666",
    ground: { top: "#6a8550", bottom: "#3a5d24" },
    snowFraction: 0,
    blizzard: 0,
    starOpacity: 0,
  },
  // ── 2  Alpine range emerging + foothills behind ──────────────────
  {
    progress: 150,
    sky: { top: "#7ba5c3", mid: "#a8c2cf", bottom: "#cfc7a8" },
    sun: { x: 0.56, y: 0.18, r: 64, color: "#ffe7bb", glow: 0.45 },
    hazeColor: "#b9b699",
    hazeOpacity: 0.62,
    // Multiple substantial peaks, central tallest — smooth pyramidal range
    peakHeights: [0.15, 0.35, 0.60, 0.85, 1.0, 0.88, 0.62, 0.35, 0.15],
    peakAmp: 230,
    jaggedness: 0.22,
    sigma: 0.16,
    hillHeights: [0.50, 0.85, 0.60, 0.95, 0.55, 0.85, 0.45],
    hillAmp: 115,
    rockColor: "#52624c",
    hillColor: "#6e826a",
    ground: { top: "#52624c", bottom: "#2d4022" },
    snowFraction: 0.30,
    blizzard: 0,
    starOpacity: 0,
  },
  // ── 3  Tall Rockies-style alpine range ───────────────────────────
  {
    progress: 225,
    sky: { top: "#3f6e98", mid: "#6c93ac", bottom: "#aab3a0" },
    sun: { x: 0.32, y: 0.14, r: 54, color: "#ffdca8", glow: 0.32 },
    hazeColor: "#9aa0a0",
    hazeOpacity: 0.55,
    // Peaks closer in height — alpine range without harsh asymmetry
    peakHeights: [0.32, 0.58, 0.78, 0.94, 1.0, 0.96, 0.80, 0.60, 0.34],
    peakAmp: 430,
    jaggedness: 0.55,
    sigma: 0.14,
    hillHeights: [0.60, 0.92, 0.70, 1.0, 0.72, 0.90, 0.55],
    hillAmp: 165,
    rockColor: "#3f5260",
    hillColor: "#5c6f7c",
    ground: { top: "#3a4858", bottom: "#1c2632" },
    snowFraction: 0.65,
    blizzard: 0.15,
    starOpacity: 0,
  },
  // ── 4  Himalayan summit — central peak hits y=0 exactly ─────────
  {
    progress: 300,
    sky: { top: "#143258", mid: "#456e94", bottom: "#a4b8c8" },
    sun: { x: 0.20, y: 0.16, r: 44, color: "#ffd498", glow: 0.22 },
    hazeColor: "#b6c2cc",
    hazeOpacity: 0.5,
    peakHeights: [0.50, 0.70, 0.86, 0.96, 1.0, 0.97, 0.88, 0.70, 0.52],
    peakAmp: 752, // = baseY (height * BASELINE @ 874px) → main peak hits y=0
    jaggedness: 0.92,
    sigma: 0.115,
    hillHeights: [0.70, 0.95, 0.80, 1.0, 0.82, 0.95, 0.65],
    hillAmp: 220,
    rockColor: "#2e4258",
    hillColor: "#4e6178",
    ground: { top: "#3a4a5e", bottom: "#1a2530" }, // dark navy rock keeps UI legible against snow-heavy mountain
    snowFraction: 0.96,
    blizzard: 1.0,
    starOpacity: 0,
  },
];

function interpKeyframes(progress) {
  const p = Math.max(0, Math.min(300, progress));
  let i = 0;
  while (i < KEYFRAMES.length - 1 && KEYFRAMES[i + 1].progress < p) i++;
  const a = KEYFRAMES[Math.min(i, KEYFRAMES.length - 1)];
  const b = KEYFRAMES[Math.min(i + 1, KEYFRAMES.length - 1)];
  const span = Math.max(1, b.progress - a.progress);
  const t = smooth(clamp01((p - a.progress) / span));

  return {
    sky: {
      top: lerpColor(a.sky.top, b.sky.top, t),
      mid: lerpColor(a.sky.mid, b.sky.mid, t),
      bottom: lerpColor(a.sky.bottom, b.sky.bottom, t),
    },
    sun: {
      x: lerp(a.sun.x, b.sun.x, t),
      y: lerp(a.sun.y, b.sun.y, t),
      r: lerp(a.sun.r, b.sun.r, t),
      color: lerpColor(a.sun.color, b.sun.color, t),
      glow: lerp(a.sun.glow, b.sun.glow, t),
    },
    hazeColor: lerpColor(a.hazeColor, b.hazeColor, t),
    hazeOpacity: lerp(a.hazeOpacity, b.hazeOpacity, t),
    peakHeights: lerpArr(a.peakHeights, b.peakHeights, t),
    peakAmp: lerp(a.peakAmp, b.peakAmp, t),
    jaggedness: lerp(a.jaggedness, b.jaggedness, t),
    sigma: lerp(a.sigma, b.sigma, t),
    hillHeights: lerpArr(a.hillHeights, b.hillHeights, t),
    hillAmp: lerp(a.hillAmp, b.hillAmp, t),
    rockColor: lerpColor(a.rockColor, b.rockColor, t),
    hillColor: lerpColor(a.hillColor, b.hillColor, t),
    ground: {
      top: lerpColor(a.ground.top, b.ground.top, t),
      bottom: lerpColor(a.ground.bottom, b.ground.bottom, t),
    },
    snowFraction: lerp(a.snowFraction, b.snowFraction, t),
    blizzard: lerp(a.blizzard, b.blizzard, t),
    starOpacity: lerp(a.starOpacity, b.starOpacity, t),
  };
}

/* ---------------------------- time-of-day overlay -------------------- */
function applyTimeOfDay(scene, time) {
  if (time === "day") return scene;
  const overlays = {
    dawn: { topTint: "#ff9e6e", botTint: "#fff0d8", strength: 0.5, sun: "#ffae72", sunStrength: 0.55 },
    dusk: { topTint: "#5a2a64", botTint: "#ff8a5a", strength: 0.55, sun: "#ff6840", sunStrength: 0.6 },
    night:{ topTint: "#08152e", botTint: "#1a2a44", strength: 0.82, sun: "#dde6f0", sunStrength: 0.85 },
  };
  const o = overlays[time];
  if (!o) return scene;

  const s = JSON.parse(JSON.stringify(scene));
  s.sky.top = lerpColor(s.sky.top, o.topTint, o.strength);
  s.sky.mid = lerpColor(s.sky.mid, lerpColor(o.topTint, o.botTint, 0.5), o.strength * 0.85);
  s.sky.bottom = lerpColor(s.sky.bottom, o.botTint, o.strength * 0.6);
  s.hazeColor = lerpColor(s.hazeColor, o.botTint, o.strength * 0.5);
  s.sun.color = lerpColor(s.sun.color, o.sun, o.sunStrength);
  s.rockColor = lerpColor(s.rockColor, o.topTint, o.strength * 0.35);
  s.hillColor = lerpColor(s.hillColor, o.topTint, o.strength * 0.3);
  s.ground.top = lerpColor(s.ground.top, o.botTint, o.strength * 0.35);
  s.ground.bottom = lerpColor(s.ground.bottom, o.topTint, o.strength * 0.45);
  if (time === "night") s.starOpacity = 0.9;
  return s;
}

/* ----------------------------------------------- multi-octave ridge noise */

const _noiseCache = new Map();
function ridgeNoise(seed) {
  if (_noiseCache.has(seed)) return _noiseCache.get(seed);
  const rand = seededRand(seed);
  const octaves = [];
  for (let i = 0; i < 5; i++) {
    octaves.push({
      phase: rand() * Math.PI * 2,
      freqMul: Math.pow(1.95, i),
      ampMul: Math.pow(0.55, i),
      jag: rand() * 0.6 + 0.4,
    });
  }
  const fn = (x, baseFreq, detail) => {
    let y = 0;
    for (let i = 0; i < 5; i++) {
      const o = octaves[i];
      const f = x * baseFreq * o.freqMul;
      const a = Math.sin(f + o.phase);
      const b = 1 - 2 * Math.abs(Math.sin(f * 0.5 + o.phase));
      const sharp = Math.sign(b) * Math.pow(Math.abs(b), 0.45);
      const peakish = lerp(b, sharp, clamp01((detail - 0.5) * 2));
      const w = Math.min(1, detail) * o.jag;
      y += lerp(a, peakish, w) * o.ampMul;
    }
    return y;
  };
  _noiseCache.set(seed, fn);
  return fn;
}

/* --------------------------------------------- silhouette path builders */

// Skyline-of-Gaussians (MAX, not SUM). Each control peak is an independent
// bell curve; the silhouette at each x is whichever bell sits highest.
function maxOfGaussians(x, xs, heights, sigma) {
  let max = 0;
  for (let i = 0; i < xs.length; i++) {
    const h = heights[i];
    if (h <= 0) continue;
    const d = (x - xs[i]) / sigma;
    const value = h * Math.exp(-d * d * 0.6);
    if (value > max) max = value;
  }
  return max;
}

// Jagged alpine silhouette. Capped at totalH=1.0 so peakAmp directly
// equals the max height of the central peak.
function mountainPath(width, height, scene, seed) {
  const noise = ridgeNoise(seed);
  const baseY = height * BASELINE;
  const steps = Math.max(280, Math.round(width * 1.2));

  // Reserve some budget for jagged variation so noise + bump ≤ 1.0
  const jaggedHeadroom = scene.jaggedness * 0.18;
  const bumpScale = 1 - jaggedHeadroom;

  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const x = i / steps;
    const bumpRaw = maxOfGaussians(x, PEAK_XS, scene.peakHeights, scene.sigma);
    const bump = bumpRaw * bumpScale;
    const peakEnvelope = clamp01(bumpRaw * 1.4);
    // Normalized noise (~[-1, 1])
    const n = noise(x * 5.4, 1.0, 0.95) * 0.6;
    const jaggedDelta = n * jaggedHeadroom * peakEnvelope;
    // Cap at 1.0 so the peak respects peakAmp exactly
    const totalH = Math.max(0, Math.min(1.0, bump + jaggedDelta));
    const y = baseY - scene.peakAmp * totalH;
    pts.push([x * width, y]);
  }

  let d = `M -10 ${baseY}`;
  for (let i = 0; i < pts.length; i++) d += ` L ${pts[i][0]} ${pts[i][1]}`;
  d += ` L ${width + 10} ${baseY} Z`;
  return { d, points: pts, baseY };
}

// Smooth rolling hills silhouette — no jagged noise, just gentle bumps.
function hillsPath(width, height, scene, seed) {
  const noise = ridgeNoise(seed);
  const baseY = height * BASELINE;
  const steps = 240;

  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const x = i / steps;
    const bumpRaw = maxOfGaussians(x, HILL_XS, scene.hillHeights, 0.16);
    // very mild perlin-ish wobble for organic feel — never jagged
    const wobble = noise(x * 2.4, 0.4, 0.2) * 0.04 * bumpRaw;
    const totalH = Math.max(0, Math.min(1.0, bumpRaw + wobble));
    const y = baseY - scene.hillAmp * totalH;
    pts.push([x * width, y]);
  }

  let d = `M -10 ${baseY}`;
  for (let i = 0; i < pts.length; i++) d += ` L ${pts[i][0]} ${pts[i][1]}`;
  d += ` L ${width + 10} ${baseY} Z`;
  return { d, points: pts, baseY };
}

/* =============================================================== Blizzard */

function Blizzard({ width, height, intensity }) {
  const layers = useMemo(() => {
    const out = [];
    const layerSpecs = [
      { count: 75, size: [1.2, 2.2], speed: 9,  opacity: 0.95, sway: 14 },
      { count: 55, size: [0.8, 1.6], speed: 14, opacity: 0.7,  sway: 10 },
      { count: 40, size: [0.6, 1.1], speed: 22, opacity: 0.45, sway: 6  },
    ];
    let seedBase = 444;
    for (const ls of layerSpecs) {
      const rand = seededRand(seedBase++);
      const flakes = [];
      const cnt = Math.round(ls.count * intensity);
      for (let i = 0; i < cnt; i++) {
        flakes.push({
          x: rand() * width,
          delay: -rand() * ls.speed,
          r: lerp(ls.size[0], ls.size[1], rand()),
          dur: ls.speed * (0.7 + rand() * 0.6),
        });
      }
      out.push({ ...ls, flakes });
    }
    return out;
  }, [width, height, intensity]);

  if (intensity < 0.02) return null;

  return (
    <g style={{ pointerEvents: "none" }}>
      {layers.map((L, li) => (
        <g key={li} opacity={L.opacity * Math.min(1, intensity * 1.4)}>
          {L.flakes.map((f, i) => (
            <g
              key={i}
              style={{
                animation: `snowfall-${li} ${f.dur}s linear ${f.delay}s infinite`,
              }}
            >
              <circle
                cx={f.x}
                cy={-10}
                r={f.r}
                fill="#fff"
                style={{
                  animation: `snowsway-${li} ${f.dur * 0.35}s ease-in-out ${f.delay}s infinite alternate`,
                  transformBox: "fill-box",
                  transformOrigin: "center",
                }}
              />
            </g>
          ))}
          <style>{`
            @keyframes snowfall-${li} {
              0%   { transform: translateY(0); }
              100% { transform: translateY(${height + 40}px); }
            }
            @keyframes snowsway-${li} {
              0%   { transform: translateX(-${L.sway}px); }
              100% { transform: translateX(${L.sway}px); }
            }
          `}</style>
        </g>
      ))}
    </g>
  );
}

/* ================================================================ Landscape */

function Landscape({ progress, time = "day", width = 402, height = 874 }) {
  const scene = useMemo(
    () => applyTimeOfDay(interpKeyframes(progress), time),
    [progress, time]
  );

  const mountain = useMemo(
    () => mountainPath(width, height, scene, 999),
    [scene, width, height]
  );
  const hills = useMemo(
    () => hillsPath(width, height, scene, 71),
    [scene, width, height]
  );

  const stars = useMemo(() => {
    if (scene.starOpacity < 0.05) return [];
    const rand = seededRand(2024);
    const out = [];
    for (let i = 0; i < 130; i++) {
      out.push({
        x: rand() * width,
        y: rand() * height * 0.55,
        r: rand() * 1.2 + 0.2,
        op: (0.3 + rand() * 0.7) * scene.starOpacity,
      });
    }
    return out;
  }, [scene.starOpacity, width, height]);

  // ── Snow line ── HARD horizontal cutoff, computed as a single global altitude.
  // y < snowLineY → snow; y > snowLineY → rock. Same line applies to back hills
  // and main mountain, which matches how real-world snowlines work (altitude-based).
  const baseY = height * BASELINE;
  const sf = clamp01(scene.snowFraction);
  // snowLineY descends as snowFraction rises. When snowFraction=1 it sits at the
  // base of the main mountain (everything is snow). When 0 it sits above the peak
  // (no snow). peakAmp is the canonical reference height since totalH is capped at 1.
  const snowLineY = baseY - scene.peakAmp * (1 - sf);
  const showSnow = sf > 0.02 && scene.peakAmp > 5;

  const snowColor = time === "night" ? "#c8d4dc" : "#f4f8fa";
  const showMountain = scene.peakAmp > 1;
  const showHills = scene.hillAmp > 1;

  return (
    <svg viewBox={`0 0 ${width} ${height}`}
         preserveAspectRatio="xMidYMid slice"
         style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={scene.sky.top} />
          <stop offset="55%" stopColor={scene.sky.mid} />
          <stop offset="100%" stopColor={scene.sky.bottom} />
        </linearGradient>
        <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={scene.sun.color} stopOpacity={scene.sun.glow} />
          <stop offset="60%" stopColor={scene.sun.color} stopOpacity={scene.sun.glow * 0.2} />
          <stop offset="100%" stopColor={scene.sun.color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={scene.hazeColor} stopOpacity="0" />
          <stop offset="100%" stopColor={scene.hazeColor} stopOpacity={scene.hazeOpacity} />
        </linearGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={scene.ground.top} />
          <stop offset="100%" stopColor={scene.ground.bottom} />
        </linearGradient>
        <radialGradient id="vignette" cx="50%" cy="60%" r="80%">
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.32" />
        </radialGradient>
        {/* Single hard-edge clip for everything above the snowline */}
        <clipPath id="snow-clip">
          <rect x="-20" y="-200" width={width + 40} height={snowLineY + 200} />
        </clipPath>
      </defs>

      {/* Sky */}
      <rect width={width} height={height} fill="url(#sky)" />

      {/* Stars (night) */}
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.op} />
      ))}

      {/* Sun / moon */}
      <g transform={`translate(${width * scene.sun.x} ${height * scene.sun.y})`}>
        <circle r={scene.sun.r * 2.8} fill="url(#sunGlow)" />
        <circle r={scene.sun.r} fill={scene.sun.color} opacity="0.95" />
      </g>

      {/* Distance haze band on horizon */}
      <rect y={height * 0.40} width={width} height={height * 0.5} fill="url(#haze)" />

      {/* Back rolling hills: rock fill, then snow above snowline */}
      {showHills && (
        <g>
          <path d={hills.d} fill={scene.hillColor} />
          {showSnow && (
            <path d={hills.d} fill={snowColor} clipPath="url(#snow-clip)" />
          )}
        </g>
      )}

      {/* Ground strip — shows in foreground beyond mountain */}
      <rect y={baseY} width={width} height={height * (1 - BASELINE) + 20}
            fill="url(#ground)" />

      {/* Main mountain: rock fill, then snow clipped above the snowline */}
      {showMountain && (
        <g>
          <path d={mountain.d} fill={scene.rockColor} />
          {showSnow && (
            <path d={mountain.d} fill={snowColor} clipPath="url(#snow-clip)" />
          )}
        </g>
      )}

      {/* Blizzard */}
      <Blizzard width={width} height={height} intensity={scene.blizzard} />

      {/* Vignette */}
      <rect width={width} height={height} fill="url(#vignette)" />
    </svg>
  );
}

window.Landscape = Landscape;
window.AscendScene = { interpKeyframes, applyTimeOfDay };
