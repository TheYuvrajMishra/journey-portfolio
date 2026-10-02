import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scrollRef } from "@/lib/scrollStore";

/**
 * Lazy-mounts a chapter: the group is only visible when the scroll
 * position is near the chapter's station t. No React re-renders —
 * visibility flips on the three object directly.
 */
export function ChapterGate({
  t,
  span = 0.13,
  children,
}: {
  t: number;
  span?: number;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const d = Math.abs(scrollRef.current.t - t);
    const v = d < span;
    if (g.visible !== v) g.visible = v;
  });
  return (
    <group ref={ref} visible={false}>
      {children}
    </group>
  );
}
