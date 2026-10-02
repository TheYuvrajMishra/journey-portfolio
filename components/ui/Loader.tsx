"use client";

import { ui } from "@/lib/content";

/**
 * Loader overlay: progress bar with a CSS-animated walking character.
 * `progress` is 0..1, driven by real init steps from the page.
 */
export function Loader({ progress }: { progress: number }) {
  const stepIdx = Math.min(
    ui.loaderSteps.length - 1,
    Math.floor(progress * ui.loaderSteps.length),
  );
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0d1420] transition-opacity duration-700">
      <style>{`
        @keyframes walker-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
        @keyframes leg-a { 0%,100% { transform: rotate(24deg); } 50% { transform: rotate(-24deg); } }
        @keyframes leg-b { 0%,100% { transform: rotate(-24deg); } 50% { transform: rotate(24deg); } }
        .walker { animation: walker-bob 0.55s ease-in-out infinite; }
        .walker .leg-a { animation: leg-a 0.55s ease-in-out infinite; transform-origin: top center; }
        .walker .leg-b { animation: leg-b 0.55s ease-in-out infinite; transform-origin: top center; }
      `}</style>

      {/* little walking character, pure CSS */}
      <div className="walker relative mb-8 h-20 w-12" aria-hidden="true">
        <div className="absolute left-1/2 top-0 h-7 w-7 -translate-x-1/2 rounded-full bg-[#c98d64]" />
        <div className="absolute left-1/2 top-7 h-8 w-8 -translate-x-1/2 rounded-md bg-[#1f8a80]" />
        <div className="leg-a absolute left-2 top-[60px] h-5 w-2 rounded bg-[#33415c]" />
        <div className="leg-b absolute right-2 top-[60px] h-5 w-2 rounded bg-[#33415c]" />
      </div>

      <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/60">
        {ui.loaderTitle}
      </p>
      <p className="mt-2 font-mono text-sm text-[#ffd166]">
        {ui.loaderSteps[stepIdx]}…
      </p>

      <div className="mt-6 h-2 w-64 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#1f8a80] to-[#ffd166] transition-[width] duration-300"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      <p className="mt-3 font-mono text-xs text-white/40">
        {Math.round(progress * 100)}%
      </p>
    </div>
  );
}
