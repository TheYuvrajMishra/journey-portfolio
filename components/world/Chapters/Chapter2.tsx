"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import {
  ChapterRoot,
  useChapterFrame,
  useFlickerMaterial,
  makeLabelTexture,
  Bob,
  WavingFlag,
  ConfettiBurst,
  groundY,
  type ConfettiApi,
} from "../chapterKit";
import { ToonMesh } from "../ToonMesh";
import { G } from "@/lib/geometry";
import { toon, toonEmissive, getGradientMap, PALETTE } from "@/lib/toonMaterial";

/* Chapter 2 — First ships, age 18 (station index 1). */

const SP_BASE = groundY(-4.5);
const BB_BASE = groundY(5.5);
const FL_BASE = groundY(3.2);
const PLANK_N = 14;

const plankMat = toon(PALETTE.wood);
const fillMat = toonEmissive("#4ade80", "#4ade80", 0.9);

/** smoothstep clamped to 0..1 */
function smooth01(v: number): number {
  const c = Math.min(1, Math.max(0, v));
  return c * c * (3 - 2 * c);
}

export function Chapter2() {
  // Signpost label textures
  const localhostTex = useMemo(
    () => makeLabelTexture({ text: "localhost", w: 512, h: 128, fontSize: 76 }),
    [],
  );
  const prodTex = useMemo(
    () => makeLabelTexture({ text: "production", w: 512, h: 128, fontSize: 76 }),
    [],
  );
  const localhostMat = useMemo(
    () => new THREE.MeshToonMaterial({ map: localhostTex, gradientMap: getGradientMap() }),
    [localhostTex],
  );
  const prodMat = useMemo(
    () => new THREE.MeshToonMaterial({ map: prodTex, gradientMap: getGradientMap() }),
    [prodTex],
  );

  // Billboard face texture
  const boardTex = useMemo(
    () =>
      makeLabelTexture({
        text: "nxtworldwide",
        sub: "● LIVE — first ships at 18",
        w: 1024,
        h: 512,
        fontSize: 118,
        bg: "#f7ead7",
      }),
    [],
  );
  const boardMat = useMemo(
    () => new THREE.MeshToonMaterial({ map: boardTex, gradientMap: getGradientMap() }),
    [boardTex],
  );
  const liveMat = useFlickerMaterial("#7a1a1a", "#ff3b30", 1.6, 0.8);

  // "shipping…" label above the progress bar
  const shipTex = useMemo(
    () => makeLabelTexture({ text: "shipping…", w: 512, h: 128, fontSize: 64 }),
    [],
  );
  const shipMat = useMemo(
    () => new THREE.MeshToonMaterial({ map: shipTex, gradientMap: getGradientMap() }),
    [shipTex],
  );

  // Flag planting timeline
  const flagRef = useRef<THREE.Group>(null);
  const prevLt = useRef(0);
  const planted = useRef(false);
  const confettiApi = useRef<ConfettiApi | null>(null);
  useChapterFrame(1, 0.13, (lt) => {
    const p = prevLt.current;
    if (!planted.current && p < 0.18 && lt >= 0.18) {
      planted.current = true;
      confettiApi.current?.burst();
    }
    if (lt < p - 0.4) planted.current = false;
    prevLt.current = lt;
    const g = flagRef.current;
    if (g) g.scale.setScalar(Math.max(smooth01((lt - 0.18) / 0.12), 0.001));
  });

  // Progress-bar bridge: planks pop in sequentially, bar fills with lt
  const plankRefs = useRef<Array<THREE.Mesh | null>>([]);
  const fillRef = useRef<THREE.Mesh>(null);
  useChapterFrame(1, 0.13, (lt) => {
    for (let i = 0; i < PLANK_N; i++) {
      const m = plankRefs.current[i];
      if (m) m.scale.y = Math.max(smooth01((lt - i / PLANK_N) * PLANK_N * 3), 0.001);
    }
    const f = fillRef.current;
    if (f) {
      f.scale.x = Math.max(lt, 0.001);
      f.position.x = -2.1 * (1 - lt); // keep left edge pinned
    }
  });

  return (
    <ChapterRoot index={1}>
      {/* Forked signpost: localhost behind, production ahead */}
      <group position={[-4.5, SP_BASE, 1]}>
        <ToonMesh geo={G.cyl(0.09, 0.12, 3.4, 10)} color={PALETTE.woodDark} position={[0, 1.7, 0]} />
        <Bob amp={0.06} speed={1.8} phase={0}>
          <ToonMesh geo={G.box(1.6, 0.28, 0.1)} color="#e8b04b" outline position={[0, 2.6, -0.85]} />
          <ToonMesh geo={G.cone(0.26, 0.5, 4)} color="#e8b04b" outline position={[0, 2.6, -1.85]} rotation={[-Math.PI / 2, 0, 0]} />
          <mesh geometry={G.plane(1.4, 0.35)} material={localhostMat} position={[0, 3.05, -0.85]} rotation={[0, Math.PI, 0]} />
        </Bob>
        <Bob amp={0.06} speed={1.8} phase={1.7}>
          <ToonMesh geo={G.box(1.6, 0.28, 0.1)} color="#e8b04b" outline position={[0, 2.0, 0.85]} />
          <ToonMesh geo={G.cone(0.26, 0.5, 4)} color="#e8b04b" outline position={[0, 2.0, 1.85]} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={G.plane(1.4, 0.35)} material={prodMat} position={[0, 2.45, 0.85]} />
        </Bob>
      </group>

      {/* Billboard — first live ship, with a flickering LIVE badge */}
      <group position={[5.5, BB_BASE, -3]} rotation={[0, -0.5, 0]}>
        <ToonMesh geo={G.cyl(0.12, 0.15, 4.4, 10)} color={PALETTE.woodDark} position={[-1.8, 2.2, 0]} />
        <ToonMesh geo={G.cyl(0.12, 0.15, 4.4, 10)} color={PALETTE.woodDark} position={[1.8, 2.2, 0]} />
        <mesh geometry={G.box(4.6, 2.5, 0.25)} material={boardMat} position={[0, 3.4, 0]} />
        <mesh geometry={G.box(0.72, 0.36, 0.12)} material={liveMat} position={[1.85, 4.35, 0.14]} />
      </group>

      {/* Flag planting — springs up mid-chapter, confetti over the billboard */}
      <group position={[5.5, 4.6, -3]}>
        <ConfettiBurst apiRef={confettiApi} />
      </group>
      <group position={[3.2, FL_BASE, -1.5]}>
        <group ref={flagRef} scale={0.001}>
          <ToonMesh geo={G.cyl(0.07, 0.09, 2.6, 10)} color={PALETTE.woodDark} position={[0, 1.3, 0]} />
          <WavingFlag color="#a3e635" width={1.5} height={0.95} position={[0.06, 2.15, 0]} />
        </group>
      </group>

      {/* Progress-bar bridge under the path */}
      {Array.from({ length: PLANK_N }, (_, i) => (
        <mesh
          key={`plank-${i}`}
          geometry={G.box(3.8, 0.16, 0.9)}
          material={plankMat}
          position={[0, -0.26, -6.5 + i * 1.0]}
          scale={[1, 0.001, 1]}
          ref={(m) => {
            plankRefs.current[i] = m;
          }}
        />
      ))}
      <ToonMesh geo={G.box(0.16, 0.45, 14.2)} color={PALETTE.woodDark} position={[-1.98, 0.08, 0]} />
      <ToonMesh geo={G.box(0.16, 0.45, 14.2)} color={PALETTE.woodDark} position={[1.98, 0.08, 0]} />

      {/* Progress bar above the bridge entrance */}
      <group position={[0, 3, -7.5]}>
        <ToonMesh geo={G.box(4.4, 0.7, 0.2)} color="#2a1d16" />
        <mesh ref={fillRef} geometry={G.box(4.2, 0.5, 0.22)} material={fillMat} scale={[0.001, 1, 1]} position={[-2.1, 0, 0]} />
        <mesh geometry={G.plane(2.2, 0.55)} material={shipMat} position={[0, 0.85, 0.12]} />
      </group>
    </ChapterRoot>
  );
}
