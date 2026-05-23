# Handoff: Ascend — Meditation Timer

> A web-based meditation app where daily practice transforms a flat prairie
> into a Himalayan summit. The hand-drawn art direction was committed after
> exploring a TE/industrial alternative and a higher-fidelity MVP.

## 0 · About this bundle

The files under `src/` and `google-apps-script/` are **production-ready
TypeScript** ports of the working HTML prototype — drop them into the
existing Vite + React 19 + TypeScript scaffold (already present at the root)
and the app should run. Nothing in this bundle is meant to be reverse-
engineered from screenshots; the code already matches the agreed design.

The folder `design_reference/` contains the original HTML prototypes for
visual comparison if anything reads "off" after porting:

| File                            | What it shows                              |
| ------------------------------- | ------------------------------------------ |
| `Ascend.html`                   | Earlier, higher-fidelity MVP (NOT shipped) |
| `Ascend Hand-drawn.html`        | **The committed direction**                |
| `landscape-hd.jsx`, `app-hd.jsx`, `audio.js` | Source for the hand-drawn HTML |

If a behaviour question can't be answered from this README, the HTML
prototype is the source of truth.

## 1 · Fidelity

**High-fidelity.** The visual language, palette, typography, sun shape,
mountain procedural parameters, snowline rule, and UI placement are all
final. The developer should not redesign anything; they should make the
TypeScript code render byte-for-byte the way the HTML prototype does.

The only thing intentionally left underspecified is the *iOS device frame*
the prototype renders inside. That frame is a presentation device, not part
of the shipped app — when the app runs on a real phone, it fills the
viewport directly.

## 2 · Tech stack

The scaffold (already in this repo at the root):

- **React 19** + **TypeScript** + **Vite**
- Target: **Cloudflare Pages**
- Optional persistence: **Google Sheets via Apps Script** (see §10)
- **Zero external images, audio, or icon assets.** The landscape is procedural
  SVG; the bell chime is synthesized via Web Audio.

## 3 · Architecture

```
src/
├── main.tsx              React root
├── App.tsx               Orchestrator — session lifecycle, persistence
├── theme.ts              Shared design tokens (HAND_FONT, INK, screen size)
├── styles.css            Global resets + Google Fonts import
├── env.d.ts              VITE_SHEETS_URL type
├── components/
│   ├── Landscape.tsx     Procedural SVG scene (sky + sun + hills + mountain + blizzard)
│   ├── HandSun.tsx       Filled disc + ink outline + 10 radiating ray strokes
│   ├── Blizzard.tsx      3-layer animated falling-snow particles
│   ├── Streak.tsx        Top-left handwritten streak counter
│   ├── Timer.tsx         Centred MM:SS, only renders while running
│   └── BeginButton.tsx   White-filled wobbly circle with black "begin" text
└── lib/
    ├── audio.ts          Web Audio bell chime + audio-context priming
    ├── date.ts           Local calendar-day helpers (NOT UTC)
    ├── progression.ts    Timer rule + streak/progress AppState math
    ├── storage.ts        localStorage + optional Apps Script sync
    ├── landscape.ts      Keyframes + smooth-step interpolation
    ├── noise.ts          Seeded multi-octave ridge noise
    └── geometry.ts       Gaussian skyline + mountain + hills path builders

google-apps-script/
└── Code.gs               Backend for VITE_SHEETS_URL (optional)
```

`App.tsx` is the only component with state. Everything else is presentational.

## 4 · Core mechanics

### Timer length

`timerSecondsForStreak(streak)` in `lib/progression.ts`:

- Base: **5 minutes** (300 s)
- +5 s per consecutive day in `streak`
- Floor: **1 minute** · Cap: **30 minutes**

### Streak + landscape progress

| Event                       | streak           | progress (landscape) |
| --------------------------- | ---------------- | -------------------- |
| Today's first completion    | +1               | +1 (cap 300)         |
| Same-day repeat completion  | no change        | no change            |
| Missed 1 day                | reset to 0       | −10                  |
| Missed N days               | reset to 0       | −10 × N (floor 0)    |

"Missed a day" means `daysBetween(lastCompletedDay, today) > 1`. Penalty
runs **once on mount** (`applyDailyDecay`) — not on a setInterval — so
the user always lands on a state that reflects today's reality.

### Session lifecycle

```
idle ─── press Begin ───▶ starting ─── 1.4 s settle ───▶ running
  ▲                                                          │
  │                                                          │
  └── 4.2 s celebration ◀── complete ◀── timer reaches 0 ────┘
```

- **idle**: Streak counter + upcoming-session timer + Begin button are
  visible. Background landscape is fully visible.
- **starting**: Bell chimes. Streak/Begin block fades out; nothing yet at
  centre. After 1400 ms we transition to `running`.
- **running**: MM:SS appears in the centre with a slow 8 s breath-scale
  animation. No pause, no skip. Esc / back-gesture should NOT cancel
  (intentional — sit through the bell). The Begin button's outline doubles
  as a progress ring (strokeDashoffset).
- **complete**: Bell rings again. State is mutated: streak +1, progress +1
  (cap 300), `lastCompletedDay = today`. After 4200 ms we return to idle.
  The Begin button label becomes **"tomorrow"** (and is disabled) until
  midnight rolls over.

### Audio

`chime()` in `lib/audio.ts` plays a six-voice C-major bell with FM-shaped
sines, a slight pitch settle, a soft low-pass, and exponential decay (~7 s).
A faint detuned shimmer voice adds air. **No audio files** — pure Web Audio.

On iOS/Safari the AudioContext must be unlocked by a user gesture; we call
`prime()` from inside the Begin onClick before the first chime.

## 5 · Procedural landscape

The signature feature. Two procedural elements:

1. **Main mountain** — 9-point Gaussian skyline + multi-octave noise.
2. **Background rolling hills** — 7-point Gaussian skyline, smoother, drawn
   behind the mountain.

Both are built by `geometry.ts`. The 5 keyframes in `landscape.ts` are:

| Progress | Stage             | peakAmp | snowFraction | jaggedness |
| -------: | ----------------- | ------: | -----------: | ---------: |
|        0 | Empty prairie     |       0 |            0 |          0 |
|       75 | Small central hill|      75 |            0 |       0.04 |
|      150 | Alpine emerging   |     230 |         0.32 |       0.22 |
|      225 | Tall alpine range |     430 |         0.68 |       0.55 |
|      300 | Himalayan summit  |     752 |         0.96 |       0.92 |

Interpolation is **cubic smoothstep** between adjacent keyframes
(`smooth(t) = t² · (3 − 2t)`), applied per-channel to every numeric
parameter and per-component to every colour (RGB lerp).

### Key invariants

- `peakAmp = baseY` at progress=300 ⇒ central peak's y = 0 (top of frame)
  **only** at 300, never earlier. Don't change this without redesigning the
  composition.
- `totalH` in `mountainPath` is **clamped at 1.0** so the peak respects
  `peakAmp` exactly even when jagged noise would otherwise push it higher.
- Snow is a **hard horizontal line** (clipPath rect with top at
  `baseY − peakAmp · (1 − snowFraction)`), NOT a gradient. This was a
  specific user request — preserve the sharp boundary.
- Mountain silhouette is the **MAX** of all per-peak Gaussians (not sum) so
  9 control peaks render as 9 distinct peaks rather than one summed mass.

### Rendering style

Every drawn shape (sun, hills, ground, mountain) is wrapped in `<g filter="url(#hd-rough)">`. The filter is:

```html
<filter id="hd-rough" x="-5%" y="-5%" width="110%" height="110%">
  <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="4" />
  <feDisplacementMap in="SourceGraphic" scale="5" />
</filter>
```

This wobbles every line by ~5 px in a fractal-noise pattern — the source of
the hand-drawn quality. Don't decrease `scale` (kills the wobble) and don't
increase it past 7 (text starts breaking apart).

Every shape also has an **ink stroke** (`scene.outline`, a near-black warm
brown) at 2-2.5 px stroke width, drawn _on top_ of the snow fill so the
silhouette outline remains visible.

The Begin button has its own smaller turbulence filter (`btn-rough`, scale 3)
applied only to the white circle — its label sits flat for legibility.

## 6 · Design tokens

```ts
// theme.ts
HAND_FONT  = "'Patrick Hand', 'Caveat', 'Comic Sans MS', cursive";
INK        = '#2a1c12';   // primary text + outlines
INK_SOFT   = 'rgba(42,28,18,0.6)';
SCREEN_W   = 402;         // iPhone screen px (prototype frame size)
SCREEN_H   = 874;
```

Per-keyframe palette lives in `lib/landscape.ts` (`KEYFRAMES[]`). Don't
add a separate design-token file for colours — the scene palette is
inherently progress-dependent.

Google Font: **Patrick Hand** (regular, primary). Fallback chain:
`Caveat → Comic Sans MS → cursive`. Pre-load in `styles.css` via the
`@import` at the top.

## 7 · Typography scale

| Element                 | Size  | Weight | Notes                               |
| ----------------------- | ----- | ------ | ----------------------------------- |
| Streak number (top-left)|  36px |   400  | tabular numerics not required       |
| Streak "days" label     |  18px |   400  | letterSpacing: 1                    |
| Idle upcoming-session   |  36px |   400  | tabular-nums + letterSpacing: 2     |
| Running countdown timer |  96px |   400  | tabular-nums + letterSpacing: 2     |
| Begin / Tomorrow label  |  26px |   400  |                                     |

## 8 · Layout (iPhone portrait, 402 × 874 viewport)

- **Streak**: `top: 56px, left: 28px`. No backdrop, no pill, no badge.
- **Timer (running)**: `position: fixed; inset: 0; flex; items-center; justify-center;`
- **Idle bottom block**: `bottom: 64px`. Vertical flex column, centred.
  Upcoming-session timer sits 22 px above the Begin button.
- **Begin button**: 116 × 116 px wobbly circle, **white fill, black text,
  black outline**. No drop shadow, no glow, no glassy pill.

The whole landscape SVG is 402 × 874 (`viewBox="0 0 402 874"`,
`preserveAspectRatio="xMidYMid slice"`). On real devices the SVG should
stretch to fill the viewport; the layout still works because the streak,
timer, and Begin button are positioned by `top`/`bottom` against the same
container.

## 9 · State (`AppState`)

```ts
interface AppState {
  streak: number;             // 0..N consecutive days
  progress: number;           // 0..300 landscape progress
  lastCompletedDay: string|null;  // "YYYY-MM-DD" local-day key, or null
}
```

Persisted via `lib/storage.ts`:

- **Always** written to `localStorage` under key `ascend.state.v1`.
- **Best-effort** POSTed to `VITE_SHEETS_URL` if defined.
- On mount, `loadState()` prefers the remote copy (so the user's account
  survives device changes), falling back to localStorage, then a fresh
  `initialState()`.

## 10 · Google Sheets backend (optional)

See `google-apps-script/Code.gs` for full instructions. Summary:

1. Create a Google Sheet.
2. Extensions → Apps Script. Paste `Code.gs`. Save.
3. Deploy → New deployment → Web app:
   - Execute as: **Me**
   - Who has access: **Anyone with the link**
4. Copy the deployment URL.
5. In `.env`: `VITE_SHEETS_URL=https://script.google.com/macros/s/.../exec`

The app POSTs the full `AppState` as JSON text on each successful session
completion. The Sheet keeps a row per save (`updated_at`, `state_json`).
GET returns the latest.

**Note**: the browser sends `Content-Type: text/plain;charset=utf-8` to
avoid a CORS preflight that Apps Script web apps don't support. Apps Script
parses `e.postData.contents` regardless of the declared type.

## 11 · Cloudflare Pages deployment

The existing `package.json` already has `npm run build` (TypeScript +
Vite). For Cloudflare Pages:

- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Environment variable**: `VITE_SHEETS_URL` (optional)
- **Framework preset**: Vite

Either connect the GitHub repo through the Cloudflare dashboard or deploy
directly with `npx wrangler pages deploy dist` after a local build.

## 12 · What NOT to change

- **The hard horizontal snowline.** It is intentional — the user
  specifically asked for a treeline-style hard edge instead of a gradient.
- **The hand-drawn aesthetic.** Don't add drop-shadows, glass-blur pills,
  border-radius treatments, or gradient backgrounds. The frame should look
  painted, not engineered.
- **The single sans-serif rule.** Patrick Hand only. Don't pair it with
  Inter or Helvetica anywhere on this screen.
- **The "tomorrow" affordance.** When a session is complete for the day,
  the Begin button stays in the same position, with the label "tomorrow"
  (lowercase) and `disabled` styling. Don't replace with a different button
  or a separate "completion" screen.
- **The bell.** Don't replace with audio files — it's procedural by design.
- **The procedural seed (999 / 71).** Same input ⇒ same mountain. If you
  change the seed, every existing user's mountain shape changes overnight.

## 13 · What's left for the developer

Things this bundle deliberately does **not** ship; they're your call:

- **App-icon / favicon / PWA manifest.** Nothing branded provided —
  generate from the hand-drawn sun glyph or commission something.
- **Time-of-day automation.** `applyTimeOfDay()` supports dawn/dusk/night
  but `App.tsx` always passes `time="day"`. Wiring up actual sunrise/sunset
  is a future addition.
- **Onboarding / settings / sound-toggle.** None of these screens exist.
- **Telemetry / analytics.** No tracking implemented.
- **Tests.** No unit tests; the procedural math in `geometry.ts` and the
  date math in `date.ts` are good candidates to add Vitest coverage for.

## 14 · Files in this handoff

```
design_handoff_ascend/
├── README.md                            (this file)
├── index.html
├── package.json                         (React 19, Vite, no extras)
├── vite.config.ts
├── tsconfig.json / .app.json / .node.json
├── eslint.config.js
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── theme.ts
│   ├── styles.css
│   ├── env.d.ts
│   ├── components/{Landscape,HandSun,Blizzard,Streak,Timer,BeginButton}.tsx
│   └── lib/{audio,date,progression,storage,landscape,noise,geometry}.ts
├── google-apps-script/
│   └── Code.gs
└── design_reference/
    ├── Ascend Hand-drawn.html           (committed direction, run-able)
    ├── Ascend.html                      (earlier MVP — not shipped)
    ├── landscape-hd.jsx                 (source for hand-drawn)
    ├── app-hd.jsx
    ├── landscape.jsx                    (earlier MVP)
    ├── app.jsx
    └── audio.js
```

To run the design references: open the `.html` files directly in any modern
browser — they fetch React + Babel from a CDN. No build step.

To run the production app: `npm install && npm run dev` from this folder.
