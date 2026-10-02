"use client";

import { useEffect, useRef, useState } from "react";
import { chapters, ui, site } from "@/lib/content";
import { useUI, scrollRef } from "@/lib/scrollStore";
import { ambientAudio } from "@/lib/audio";
import { Progress } from "./Progress";

/** Types out text character by character. Remount (via key) to retype. */
function useTypewriter(text: string, speed = 22): string {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!text) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
  }, [text, speed]);
  return out;
}

function ChapterCard({ chapter }: { chapter: number }) {
  const copy = chapters[chapter];
  const title = useTypewriter(copy.title, 34);
  const oneLiner = useTypewriter(copy.oneLiner, 14);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={`pointer-events-none fixed left-5 top-24 z-20 max-w-xs transition-all duration-500 md:left-10 md:top-1/3 md:max-w-sm ${
        entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#ffd166]">
        {copy.kicker}
      </p>
      <h2 className="mt-2 font-display text-3xl font-bold leading-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] md:text-5xl">
        {title}
        <span className="animate-pulse text-[#ffd166]">_</span>
      </h2>
      <p className="mt-3 font-mono text-xs leading-relaxed text-white/85 drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)] md:text-sm">
        {oneLiner}
      </p>
    </div>
  );
}

function SoundToggle() {
  const soundOn = useUI((s) => s.soundOn);
  const setSoundOn = useUI((s) => s.setSoundOn);
  return (
    <button
      onClick={() => {
        const next = !soundOn;
        setSoundOn(next);
        if (next) ambientAudio.start();
        else ambientAudio.stop();
      }}
      aria-pressed={soundOn}
      className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/25 bg-black/35 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/85 backdrop-blur-md transition hover:border-white/50 hover:text-white"
    >
      <span aria-hidden="true">{soundOn ? "🔊" : "🔇"}</span>
      {ui.soundLabel}: {soundOn ? "on" : "off"}
    </button>
  );
}

function ScrollHint() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      setShow((s) => {
        const should = scrollRef.current.t < 0.015;
        return s === should ? s : should;
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  if (!show) return null;
  return (
    <div className="pointer-events-none fixed bottom-8 left-1/2 z-20 -translate-x-1/2 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/80">
        {ui.scrollHint}
      </p>
      <div className="mx-auto mt-3 h-10 w-6 rounded-full border-2 border-white/50 p-1">
        <div className="h-2 w-2 animate-bounce rounded-full bg-[#ffd166]" />
      </div>
    </div>
  );
}

function Tooltip() {
  const tooltip = useUI((s) => s.tooltip);
  if (!tooltip) return null;
  return (
    <div
      className="pointer-events-none fixed z-30 -translate-x-1/2 rounded-lg border border-white/20 bg-black/70 px-3 py-1.5 font-mono text-xs text-white backdrop-blur-md"
      style={{ left: tooltip.x, top: tooltip.y - 44 }}
    >
      {tooltip.text}
    </div>
  );
}

/** Minimal HTML layer over the 3D world. */
export function Overlay() {
  const chapter = useUI((s) => s.chapter);
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      // fade the header as the journey gets dark (keeps text readable)
      const el = headerRef.current;
      if (el) {
        const t = scrollRef.current.t;
        el.style.opacity = String(t > 0.85 ? 0.55 : 1);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <header
        ref={headerRef}
        className="pointer-events-none fixed left-5 top-5 z-20 md:left-10 md:top-8"
      >
        <p className="font-display text-lg font-bold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
          {site.name}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/70">
          {site.role}
        </p>
      </header>

      <div className="fixed right-5 top-5 z-20 md:right-10 md:top-8">
        <SoundToggle />
      </div>

      {chapter >= 0 ? <ChapterCard key={chapter} chapter={chapter} /> : null}
      <Progress />
      <ScrollHint />
      <Tooltip />

      <div
        className="pointer-events-none fixed inset-0 z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 58%, rgba(8,10,18,0.42) 100%)",
        }}
        aria-hidden="true"
      />
    </>
  );
}
