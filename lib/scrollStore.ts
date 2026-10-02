import { create } from "zustand";

/**
 * Scroll + UI state.
 *
 * Per-frame scroll progress lives in the MUTABLE `scrollRef` object below —
 * the 3D loop reads it directly without triggering React re-renders.
 * Only coarse, UI-relevant values (chapter index, tooltip, toggles) go into
 * the zustand store.
 */

export interface ScrollFrame {
  /** 0..1 scroll progress through the whole journey */
  t: number;
  /** smoothed scroll velocity (t units per second, signed) */
  vel: number;
  /** seconds since last update */
  dt: number;
}

export const scrollRef: { current: ScrollFrame } = {
  current: { t: 0, vel: 0, dt: 0 },
};

export interface TooltipState {
  x: number;
  y: number;
  text: string;
}

interface UIState {
  /** coarse chapter index for the HTML overlay (-1 = none yet) */
  chapter: number;
  tooltip: TooltipState | null;
  soundOn: boolean;
  loaded: boolean;
  reducedMotion: boolean;
  isMobile: boolean;
  setChapter: (c: number) => void;
  setTooltip: (t: TooltipState | null) => void;
  setSoundOn: (v: boolean) => void;
  setLoaded: (v: boolean) => void;
  initEnv: () => void;
}

export const useUI = create<UIState>((set) => ({
  chapter: -1,
  tooltip: null,
  soundOn: false,
  loaded: false,
  reducedMotion: false,
  isMobile: false,
  setChapter: (chapter) => set((s) => (s.chapter === chapter ? s : { chapter })),
  setTooltip: (tooltip) => set({ tooltip }),
  setSoundOn: (soundOn) => set({ soundOn }),
  setLoaded: (loaded) => set({ loaded }),
  initEnv: () =>
    set({
      reducedMotion:
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      isMobile:
        typeof window !== "undefined" &&
        (window.matchMedia("(pointer: coarse)").matches ||
          window.innerWidth < 768),
    }),
}));

/** Which coarse chapter segment t falls into (0..5). */
export function chapterIndexForT(t: number): number {
  return Math.max(0, Math.min(5, Math.floor(t * 6)));
}

/** Local chapter progress: 0 when entering, 1 when leaving a station. */
export function localChapterT(t: number, stationT: number, span = 0.14): number {
  const v = (t - (stationT - span)) / (span * 2);
  return Math.max(0, Math.min(1, v));
}
