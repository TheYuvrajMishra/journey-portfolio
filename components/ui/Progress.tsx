"use client";

import { useEffect, useRef } from "react";
import { ui } from "@/lib/content";
import { scrollRef } from "@/lib/scrollStore";

/**
 * Mini winding-path progress indicator. The dot is positioned by direct DOM
 * updates in rAF — no React re-renders while scrolling.
 */
export function Progress() {
  const dotRef = useRef<SVGCircleElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const path = pathRef.current;
      const dot = dotRef.current;
      if (!path || !dot) return;
      const len = path.getTotalLength();
      const pt = path.getPointAtLength(len * scrollRef.current.t);
      dot.setAttribute("cx", String(pt.x));
      dot.setAttribute("cy", String(pt.y));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="pointer-events-none fixed bottom-5 right-5 z-20 opacity-80"
      aria-label={ui.progressLabel}
      role="img"
    >
      <svg width="72" height="120" viewBox="0 0 72 120" fill="none">
        <path
          ref={pathRef}
          d="M36 6 C 58 22, 14 34, 30 50 S 62 70, 40 84 S 20 100, 36 114"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="1 7"
        />
        <circle ref={dotRef} r="5" fill="#ffd166" stroke="#2a1d16" strokeWidth="2" />
      </svg>
    </div>
  );
}
