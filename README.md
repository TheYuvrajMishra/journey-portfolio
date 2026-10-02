# Journey — a scroll-driven 3D portfolio

A single continuous 3D world for **Yuvraj Mishra** (Full Stack AI Engineer, CTO at Foontro).
Scrolling walks a cartoon protagonist along a winding spline through six chapters of his
journey — dawn in Kolkata to a night-time campfire — with the time of day grading from
dawn → day → dusk → night as you scroll.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve the production build
```

Quality gates (all must pass):

```bash
npx tsc --noEmit
npx eslint
npm run build
```

## How it works

- **Scroll** — `app/page.tsx` renders a 700vh spacer with a sticky fullscreen `<Canvas>`.
  [Lenis](https://lenis.darkroom.engineering/) smooth-scrolls; scroll progress `t` (0→1) is
  written per frame into a mutable ref (`lib/scrollStore.ts` → `scrollRef`, no re-renders).
  Only the coarse chapter index goes into zustand for the HTML overlay.
- **World path** — one `CatmullRomCurve3` (`lib/spline.ts`) winds through 6 chapter
  stations (`lib/stations.ts`). The character rides `curve.getPointAt(t)` facing the tangent;
  scrolling back walks him backward. Idle (no scroll velocity) → breathing idle cycle.
- **Camera** — third-person follow rig (`components/world/CameraRig.tsx`) with tangent lead,
  gentle bob, and lerped cursor parallax. Reduced-motion gets a fixed offset; mobile a
  tighter framing.
- **Day/night** — `lib/daynight.ts` lerps sky-dome shader colors, fog, sun/moon and
  hemisphere lights across 6 gradient stops. No per-frame allocations (reused temps).
- **Toon look** — every material is `MeshToonMaterial` sharing one 4-step gradient map
  (`lib/toonMaterial.ts`); inverted-hull outlines on the character + hero props;
  `EffectComposer` with high-threshold bloom (emissive-only) + vignette.
- **Chapters** — `components/world/Chapters/ChapterN.tsx`, each self-contained with its own
  enter/exit timeline driven by chapter-local progress. Lazy-mounted via `ChapterGate`
  (visible only when `|t − stationT| < 0.13`).
- **Copy** — every word and link lives in **`lib/content.ts`**. See below.

## Editing chapter copy (the important part)

**All text and links come from a single file: `lib/content.ts`.**

- Chapter titles / one-liners / body copy → the `chapters` array (6 entries, in scroll order).
- Tech-stack orbit icons (chapter 5) → the `stack` array (`name`, `blurb`, `glyph`, `color`).
  The `glyph` is drawn on the 3D icon sprite; keep it to 1–2 characters.
- Contact lanterns (chapter 6) → the `links` array (`label`, `url`, `hint`).
  Clicking a lantern opens `url` in a new tab.
- Site name / role / tagline → `site`. Loader + toggle labels → `ui`.

The 3D chapters, the HTML overlay, and the screen-reader fallback all read from this file —
edit it and everything updates. No other file contains user-facing copy.

## Project structure

```
app/                    # layout, page (scroll container + Lenis), globals.css
components/
  world/
    World.tsx           # Canvas, lights-free assembly, EffectComposer
    Sky.tsx             # sky-dome shader, stars, sun/moon/fog rig, day-night
    Terrain.tsx         # ground ribbon, instanced grass/trees/flowers
    Path.tsx            # walking-path ribbon (+ pathY helper)
    Character.tsx       # procedural dev character, walk cycle, dust, reactions
    CameraRig.tsx       # third-person follow camera
    Ambient.tsx         # clouds, birds, chimney smoke, embers, fireflies, pollen
    ChapterGate.tsx     # lazy-mount chapters near the camera
    ToonMesh.tsx        # toon mesh + inverted-hull outline wrapper
    chapterKit.tsx      # chapter helpers (see below)
    Chapters/
      Chapter1.tsx      # Origin — Kolkata at dawn
      Chapter2.tsx      # First ships — nxtworldwide billboard + flag
      Chapter3.tsx      # Remote leap — canal, windmill, tulips, clocks
      Chapter4.tsx      # Foontro — marketplace town + beacon
      Chapter5.tsx      # Stack — lighthouse + orbiting tech icons
      Chapter6.tsx      # Now — campfire + contact lanterns
  ui/
    Overlay.tsx         # chapter title/one-liner, sound toggle, hint
    Progress.tsx        # mini winding-path progress (rAF-driven, no re-renders)
    Loader.tsx          # loading overlay with walking character
lib/
  content.ts            # ← ALL copy/links (edit this)
  spline.ts             # the world curve + scratch temps
  stations.ts           # 6 chapter anchors on the curve
  scrollStore.ts        # mutable scroll ref + zustand UI store
  toonMaterial.ts       # shared gradient map, material cache, palette
  geometry.ts           # cached primitives, mergeGeos, faceted
  shaders.ts            # sky / wind / points shaders
  daynight.ts           # dawn→night gradient stops
  terrain.ts            # terrain height field
  emitters.ts           # named particle emitter registry
  audio.ts              # procedural WebAudio wind + footsteps (off by default)
```

### chapterKit helpers (for building/editing chapters)

Inside `<ChapterRoot index={n}>`, local coords are: origin = path point at the station,
`+z` = walking direction, `+x` = right side, `y` up. Path surface ≈ `y −0.2`;
ground ≈ `groundY(lateral)`.

- `useChapterFrame(index, span, (lt, dt, time) => …)` — per-frame callback with
  chapter-local progress `lt` (0 entering → 1 leaving) for enter/exit timelines.
- `Hoverable({ tip, onClick })` — hover tooltip + scale pop + pointer cursor.
- `Bob` / `Spin` — gentle motion wrappers (auto-disabled under reduced motion).
- `useFlickerMaterial(color, emissive, base, amp, speed)` — candle-like flicker.
- `makeLabelTexture({ text, sub, … })` / `makeStripeTexture(c1, c2)` — canvas textures.
- `useWaterMaterial()` — animated cartoon water.
- `WavingFlag({ color, … })` — CPU-waved cloth flag.
- `ConfettiBurst({ apiRef })` — one-shot instanced confetti; call `apiRef.current?.burst()`.
- `PuffPool({ apiRef, … })` — reusable soft-sprite puff pool.
- `addEmitter(id, worldPos)` + `stationLocalToWorld(index, x, y, z, out)` — register
  particle sources (`"chimney"`, `"chai-steam"`, `"campfire"`, `"fireflies"` are consumed
  by `Ambient.tsx`).

## Performance notes

- DPR capped at `[1, 1.75]`; instancing for grass/trees/flowers/tulips/coins/confetti;
  chapters lazy-mount near the camera; particle counts halve on mobile; particles and
  camera bob/parallax disable under `prefers-reduced-motion`.
- No per-frame allocations in the render loop (module-scope temps, preallocated pools).

## Accessibility

- Semantic, screen-reader-only `<section>` per chapter with full copy + real links.
- `prefers-reduced-motion` → simplified camera, no particles, no bob/parallax.
- Keyboard: it's a normal scroll page — Tab reaches the sound toggle; chapter-6 links
  exist as real anchors in the fallback content.

## Deploying

Deploy-ready for Vercel: `npm run build` → `npm start`. No environment variables,
no external assets — every visual is procedural (the only network fetch is Google Fonts).
