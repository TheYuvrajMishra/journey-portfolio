"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Lenis from "lenis";
import { chapters, links, site, ui } from "@/lib/content";
import { scrollRef, useUI, chapterIndexForT } from "@/lib/scrollStore";

const World = dynamic(
  () => import("@/components/world/World").then((m) => m.World),
  { ssr: false },
);
import { Overlay } from "@/components/ui/Overlay";
import { Loader } from "@/components/ui/Loader";

const SCROLL_VH = 700;

/**
 * Page: tall scroll container + sticky fullscreen canvas.
 * Lenis smooth-scrolls; per-frame progress goes into a mutable ref
 * (zero re-renders); only the coarse chapter index hits zustand.
 */
export default function Page() {
  const [progress, setProgress] = useState(0.25);
  const [ready, setReady] = useState(false);
  const setChapter = useUI((s) => s.setChapter);
  const initEnv = useUI((s) => s.initEnv);
  const loaded = useUI((s) => s.loaded);
  const setLoaded = useUI((s) => s.setLoaded);
  const prevT = useRef(0);
  const prevTime = useRef(0);

  useEffect(() => {
    initEnv();
  }, [initEnv]);

  // Lenis + scroll progress wiring
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    prevTime.current = performance.now();

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);

      const max = document.documentElement.scrollHeight - window.innerHeight;
      const t = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      const dt = Math.max((time - prevTime.current) / 1000, 0.001);
      prevTime.current = time;

      const cur = scrollRef.current;
      const rawVel = (t - prevT.current) / dt;
      // smooth the velocity so the walk cycle doesn't stutter
      cur.vel += (rawVel - cur.vel) * 0.18;
      if (Math.abs(cur.vel) < 0.0004) cur.vel = 0;
      cur.t = t;
      cur.dt = dt;
      prevT.current = t;

      setChapter(chapterIndexForT(t));
    };
    raf = requestAnimationFrame(loop);

    // touch: Lenis handles it; make sure the page doesn't hijack
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [setChapter]);

  // loader steps: fonts → scene ready → first frames
  const handleWorldReady = () => {
    setProgress(0.7);
    // let a few frames render so shaders compile before reveal
    let frames = 0;
    const tick = () => {
      frames += 1;
      setProgress(0.7 + Math.min(frames / 40, 1) * 0.3);
      if (frames < 40) requestAnimationFrame(tick);
      else {
        setReady(true);
        setLoaded(true);
      }
    };
    requestAnimationFrame(tick);
  };

  return (
    <main className="relative bg-[#0d1420]">
      {/* screen-reader / SEO fallback: full semantic copy of every chapter */}
      <div className="sr-only">
        <h1>
          {site.name} — {site.role}
        </h1>
        <p>{site.tagline}</p>
        {chapters.map((c, i) => (
          <section key={c.kicker} aria-label={c.title}>
            <h2>{c.title}</h2>
            <p>{c.oneLiner}</p>
            {c.body.map((p, j) => (
              <p key={j}>{p}</p>
            ))}
            {i === 5 && (
              <ul>
                {links.map((l) => (
                  <li key={l.label}>
                    <a href={l.url}>{l.label}</a> — {l.hint}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div style={{ height: `${SCROLL_VH}vh` }} aria-hidden="true">
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <World onReady={handleWorldReady} />
        </div>
      </div>

      {loaded ? <Overlay /> : null}
      {!ready && <Loader progress={progress} />}

      {/* keep the document title honest while JS boots */}
      <noscript>
        <div style={{ padding: 24, color: "#fff" }}>
          <h1>
            {site.name} — {site.role}
          </h1>
          <p>{ui.scrollHint} — this portfolio needs JavaScript for the 3D journey.</p>
        </div>
      </noscript>
    </main>
  );
}
