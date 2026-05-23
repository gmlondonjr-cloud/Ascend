// Hand-drawn meditation landscape. Procedural skyline + rolling hills like
// the MVP, but rendered with:
//   - Flat bold primary colours (no gradients)
//   - Stroked outlines on every shape (dark warm-brown ink)
//   - SVG turbulence + displacement filter to wobble every line
//   - Hand-drawn sun with radiating rays (instead of soft glow)
//   - Hard horizontal snowline (clipped flat snow fill)
//   - Scribbly blizzard particles at high progress
// No vignette, no glassy backdrops — the whole frame should look painted.

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

const PEAK_XS = [0.08, 0.20, 0.32, 0.42, 0.50, 0.58, 0.68, 0.80, 0.92];
const HILL_XS = [0.04, 0.18, 0.30, 0.46, 0.62, 0.78, 0.94];
const BASELINE = 0.86;

/* ------------------------------------------------------------- keyframes */
// Flat palettes — single sky colour, single rock colour, etc.
// `outline` is the ink stroke that traces every shape.

const KEYFRAMES = [
  // ── 0  Empty prairie ─────────────────────────────────────────────
  {
    progress: 0,
    sky:       "#bedbe8",
    sun:       { x: 0.74, y: 0.22, r: 44, color: "#ffb840", ring: "#f59f2c" },
    peakHeights: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    peakAmp: 0,
    jaggedness: 0,
    sigma: 0.16,
    hillHeights: [0, 0, 0, 0, 0, 0, 0],
    hillAmp: 0,
    rockColor: "#8d7964",  // not used at this stage
    hillColor: "#8aaa68",
    ground:    "#7aae45",
    grass:     "#4a7a26",
    outline:   "#2a1c12",
    snowFraction: 0,
    blizzard: 0,
  },
  // ── 1  Small central hill + rolling hills behind ─────────────────
  {
    progress: 75,
    sky:       "#aecde0",
    sun:       { x: 0.72, y: 0.20, r: 42, color: "#ffb842", ring: "#f59f2c" },
    peakHeights: [0, 0, 0.20, 0.55, 1.0, 0.55, 0.20, 0, 0],
    peakAmp: 75,
    jaggedness: 0.04,
    sigma: 0.22,
    hillHeights: [0.40, 0.70, 0.50, 0.80, 0.45, 0.85, 0.40],
    hillAmp: 60,
    rockColor: "#6e9a48",
    hillColor: "#8fb866",
    ground:    "#6da13e",
    grass:     "#3e6420",
    outline:   "#2a1c12",
    snowFraction: 0,
    blizzard: 0,
  },
  // ── 2  Alpine range emerging + foothills ─────────────────────────
  {
    progress: 150,
    sky:       "#8eb6cc",
    sun:       { x: 0.56, y: 0.18, r: 40, color: "#ffb43a", ring: "#e8932b" },
    peakHeights: [0.15, 0.35, 0.60, 0.85, 1.0, 0.88, 0.62, 0.35, 0.15],
    peakAmp: 230,
    jaggedness: 0.22,
    sigma: 0.16,
    hillHeights: [0.50, 0.85, 0.60, 0.95, 0.55, 0.85, 0.45],
    hillAmp: 115,
    rockColor: "#8a715a",
    hillColor: "#7d9e58",
    ground:    "#5b8a35",
    grass:     "#2e561b",
    outline:   "#2a1c12",
    snowFraction: 0.32,
    blizzard: 0,
  },
  // ── 3  Tall alpine range ─────────────────────────────────────────
  {
    progress: 225,
    sky:       "#5b86a8",
    sun:       { x: 0.32, y: 0.14, r: 38, color: "#ffc24c", ring: "#e8983a" },
    peakHeights: [0.32, 0.58, 0.78, 0.94, 1.0, 0.96, 0.80, 0.60, 0.34],
    peakAmp: 430,
    jaggedness: 0.55,
    sigma: 0.14,
    hillHeights: [0.60, 0.92, 0.70, 1.0, 0.72, 0.90, 0.55],
    hillAmp: 165,
    rockColor: "#6b6e7e",
    hillColor: "#5f7a76",
    ground:    "#3f5a48",
    grass:     "#1f2e22",
    outline:   "#1d1208",
    snowFraction: 0.68,
    blizzard: 0.15,
  },
  // ── 4  Himalayan summit — peak hits top of frame ─────────────────
  {
    progress: 300,
    sky:       "#345e80",
    sun:       { x: 0.20, y: 0.16, r: 36, color: "#ffd566", ring: "#e8983a" },
    peakHeights: [0.50, 0.70, 0.86, 0.96, 1.0, 0.97, 0.88, 0.70, 0.52],
    peakAmp: 752,
    jaggedness: 0.92,
    sigma: 0.115,
    hillHeights: [0.70, 0.95, 0.80, 1.0, 0.82, 0.95, 0.65],
    hillAmp: 220,
    rockColor: "#4a4d63",
    hillColor: "#4c5e6e",
    ground:    "#2c3a48",
    grass:     "#10141c",
    outline:   "#0e0a05",
    snowFraction: 0.96,
    blizzard: 1.0,
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
    sky: lerpColor(a.sky, b.sky, t),
    sun: {
      x: lerp(a.sun.x, b.sun.x, t),
      y: lerp(a.sun.y, b.sun.y, t),
      r: lerp(a.sun.r, b.sun.r, t),
      color: lerpColor(a.sun.color, b.sun.color, t),
      ring: lerpColor(a.sun.ring, b.sun.ring, t),
    },
    peakHeights: lerpArr(a.peakHeights, b.peakHeights, t),
    peakAmp: lerp(a.peakAmp, b.peakAmp, t),
    jaggedness: lerp(a.jaggedness, b.jaggedness, t),
    sigma: lerp(a.sigma, b.sigma, t),
    hillHeights: lerpArr(a.hillHeights, b.hillHeights, t),
    hillAmp: lerp(a.hillAmp, b.hillAmp, t),
    rockColor: lerpColor(a.rockColor, b.rockColor, t),
    hillColor: lerpColor(a.hillColor, b.hillColor, t),
    ground: lerpColor(a.ground, b.ground, t),
    grass: lerpColor(a.grass, b.grass, t),
    outline: lerpColor(a.outline, b.outline, t),
    snowFraction: lerp(a.snowFraction, b.snowFraction, t),
    blizzard: lerp(a.blizzard, b.blizzard, t),
  };
}

/* ---------------------------- time-of-day overlay (kept simple) ------ */
function applyTimeOfDay(scene, time) {
  if (time === "day") return scene;
  const overlays = {
    dawn: { tint: "#ff9e6e", strength: 0.4, sun: "#ffae72" },
    dusk: { tint: "#a04860", strength: 0.5, sun: "#ff6840" },
    night:{ tint: "#1a2244", strength: 0.78, sun: "#dde6f0" },
  };
  const o = overlays[time];
  if (!o) return scene;
  const s = JSON.parse(JSON.stringify(scene));
  s.sky = lerpColor(s.sky, o.tint, o.strength);
  s.hillColor = lerpColor(s.hillColor, o.tint, o.strength * 0.4);
  s.rockColor = lerpColor(s.rockColor, o.tint, o.strength * 0.4);
  s.ground = lerpColor(s.ground, o.tint, o.strength * 0.5);
  s.grass = lerpColor(s.grass, o.tint, o.strength * 0.5);
  s.sun.color = lerpColor(s.sun.color, o.sun, 0.7);
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

function mountainPath(width, height, scene, seed) {
  const noise = ridgeNoise(seed);
  const baseY = height * BASELINE;
  const steps = Math.max(280, Math.round(width * 1.2));
  const jaggedHeadroom = scene.jaggedness * 0.18;
  const bumpScale = 1 - jaggedHeadroom;

  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const x = i / steps;
    const bumpRaw = maxOfGaussians(x, PEAK_XS, scene.peakHeights, scene.sigma);
    const bump = bumpRaw * bumpScale;
    const peakEnvelope = clamp01(bumpRaw * 1.4);
    const n = noise(x * 5.4, 1.0, 0.95) * 0.6;
    const jaggedDelta = n * jaggedHeadroom * peakEnvelope;
    const totalH = Math.max(0, Math.min(1.0, bump + jaggedDelta));
    const y = baseY - scene.peakAmp * totalH;
    pts.push([x * width, y]);
  }
  let d = `M -10 ${baseY}`;
  for (let i = 0; i < pts.length; i++) d += ` L ${pts[i][0]} ${pts[i][1]}`;
  d += ` L ${width + 10} ${baseY} Z`;
  return { d, points: pts, baseY };
}

function hillsPath(width, height, scene, seed) {
  const noise = ridgeNoise(seed);
  const baseY = height * BASELINE;
  const steps = 240;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const x = i / steps;
    const bumpRaw = maxOfGaussians(x, HILL_XS, scene.hillHeights, 0.16);
    const wobble = noise(x * 2.4, 0.4, 0.2) * 0.04 * bumpRaw;
    const totalH = Math.max(0, Math.min(1.0, bumpRaw + wobble));
    const y = baseY - scene.hillAmp * totalH;
    pts.push([x * width, y]);
  }
  let d = `M -10 ${baseY}`;
  for (let i = 0; i < pts.length; i++) d += ` L ${pts[i][0]} ${pts[i][1]}`;
  d += ` L ${width + 10} ${baseY} Z`;
  return { d };
}

/* =============================================================== Blizzard */
// Scribbly hand-drawn snowflake circles. Same animation rig as MVP but
// no transformBox magic — each flake is a tiny outlined circle for the
// "drawn" feel.

function Blizzard({ width, height, intensity, outline }) {
  const layers = useMemo(() => {
    const out = [];
    const layerSpecs = [
      { count: 70, size: [1.8, 3.0], speed: 9,  opacity: 0.95, sway: 16 },
      { count: 50, size: [1.2, 2.0], speed: 14, opacity: 0.7,  sway: 12 },
      { count: 35, size: [0.8, 1.4], speed: 22, opacity: 0.45, sway: 7  },
    ];
    let seedBase = 555;
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
              style={{ animation: `hd-snowfall-${li} ${f.dur}s linear ${f.delay}s infinite` }}
            >
              <circle
                cx={f.x} cy={-10} r={f.r}
                fill="#faf6ec"
                stroke={outline} strokeWidth="0.7"
                style={{
                  animation: `hd-snowsway-${li} ${f.dur * 0.35}s ease-in-out ${f.delay}s infinite alternate`,
                }}
              />
            </g>
          ))}
          <style>{`
            @keyframes hd-snowfall-${li} {
              0%   { transform: translateY(0); }
              100% { transform: translateY(${height + 40}px); }
            }
            @keyframes hd-snowsway-${li} {
              0%   { transform: translateX(-${L.sway}px); }
              100% { transform: translateX(${L.sway}px); }
            }
          `}</style>
        </g>
      ))}
    </g>
  );
}

/* ================================================================ Sun */
// Hand-drawn sun: filled disc + outline + ray strokes radiating around it.

function HandSun({ cx, cy, r, color, ring, outline }) {
  const rays = [];
  const rayCount = 10;
  for (let i = 0; i < rayCount; i++) {
    const a = (i / rayCount) * Math.PI * 2;
    const r1 = r * 1.25;
    const r2 = r * 1.55 + (i % 2 === 0 ? 4 : 0); // slight variation
    rays.push(
      <line key={i}
            x1={cx + Math.cos(a) * r1} y1={cy + Math.sin(a) * r1}
            x2={cx + Math.cos(a) * r2} y2={cy + Math.sin(a) * r2}
            stroke={ring} strokeWidth="3" strokeLinecap="round" />
    );
  }
  return (
    <g>
      {rays}
      <circle cx={cx} cy={cy} r={r} fill={color} />
      <circle cx={cx} cy={cy} r={r} fill="none"
              stroke={outline} strokeWidth="2.5" />
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

  const baseY = height * BASELINE;
  const sf = clamp01(scene.snowFraction);
  const snowLineY = baseY - scene.peakAmp * (1 - sf);
  const showSnow = sf > 0.02 && scene.peakAmp > 5;
  const showMountain = scene.peakAmp > 1;
  const showHills = scene.hillAmp > 1;

  // Grass dashes scatter (only at lower stages — drops off as it gets snowy)
  const grassDensity = clamp01(1 - sf * 1.2);
  const grass = useMemo(() => {
    if (grassDensity < 0.05) return [];
    const rand = seededRand(3131);
    const n = Math.round(72 * grassDensity);
    const out = [];
    for (let i = 0; i < n; i++) {
      const x = rand() * width;
      const y = baseY + 10 + rand() * (height * (1 - BASELINE) - 18);
      const h = 5 + rand() * 6;
      const lean = (rand() - 0.5) * 4;
      out.push({ x, y, h, lean });
    }
    return out;
  }, [grassDensity, width, height, baseY]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`}
         preserveAspectRatio="xMidYMid slice"
         style={{ width: "100%", height: "100%", display: "block",
                  background: scene.sky }}>
      <defs>
        {/* Single rough turbulence filter, applied to all line-art groups */}
        <filter id="hd-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="4" />
          <feDisplacementMap in="SourceGraphic" scale="5" />
        </filter>
        <clipPath id="hd-snow-clip">
          <rect x="-20" y="-200" width={width + 40} height={snowLineY + 200} />
        </clipPath>
      </defs>

      {/* Sky — solid bold colour, no gradient */}
      <rect width={width} height={height} fill={scene.sky} />

      {/* Sun (with rays) — filtered for hand-drawn look */}
      <g filter="url(#hd-rough)">
        <HandSun
          cx={width * scene.sun.x}
          cy={height * scene.sun.y}
          r={scene.sun.r}
          color={scene.sun.color}
          ring={scene.sun.ring}
          outline={scene.outline}
        />
      </g>

      {/* Background hills — flat + outline + filtered */}
      {showHills && (
        <g filter="url(#hd-rough)">
          <path d={hills.d} fill={scene.hillColor}
                stroke={scene.outline} strokeWidth="2" strokeLinejoin="round" />
        </g>
      )}

      {/* Ground strip — flat green/dark + outlined top edge */}
      <g filter="url(#hd-rough)">
        <rect y={baseY} width={width} height={height * (1 - BASELINE) + 20}
              fill={scene.ground} />
        {/* horizon stroke */}
        <line x1={-5} y1={baseY} x2={width + 5} y2={baseY}
              stroke={scene.outline} strokeWidth="2" />
        {/* grass dashes */}
        {grass.map((g, i) => (
          <path key={i}
                d={`M ${g.x} ${g.y} q ${g.lean * 0.5} ${-g.h * 0.5} ${g.lean} ${-g.h}`}
                stroke={scene.grass} strokeWidth="1.6"
                strokeLinecap="round" fill="none" />
        ))}
      </g>

      {/* Main mountain — flat rock + filtered outline */}
      {showMountain && (
        <g filter="url(#hd-rough)">
          <path d={mountain.d} fill={scene.rockColor} />
          {showSnow && (
            <path d={mountain.d} fill="#fbf6e5"
                  clipPath="url(#hd-snow-clip)" />
          )}
          {/* outline drawn AFTER snow so the silhouette outline stays visible */}
          <path d={mountain.d} fill="none"
                stroke={scene.outline} strokeWidth="2.5"
                strokeLinejoin="round" />
          {showSnow && (
            // Snow line itself drawn as a soft scribbly stroke for craft feel
            <line x1={0} y1={snowLineY} x2={width} y2={snowLineY}
                  stroke={scene.outline} strokeWidth="1"
                  opacity="0.18" clipPath="url(#hd-snow-clip)" />
          )}
        </g>
      )}

      {/* Blizzard (only at extreme stages) */}
      <Blizzard width={width} height={height}
                intensity={scene.blizzard} outline={scene.outline} />
    </svg>
  );
}

window.Landscape = Landscape;
window.AscendScene = { interpKeyframes, applyTimeOfDay };
