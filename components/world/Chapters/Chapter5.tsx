"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import { stack, type StackItem } from "@/lib/content";
import { useUI } from "@/lib/scrollStore";
import { getGradientMap } from "@/lib/toonMaterial";
import { G } from "@/lib/geometry";
import { ToonMesh } from "../ToonMesh";
import { ChapterRoot, Hoverable, groundY, makeStripeTexture } from "../chapterKit";

/* ------------------------------------------------------------------ */
/* config (module scope — stable references, no per-render churn)        */
/* ------------------------------------------------------------------ */

const ROCKS: { x: number; z: number; s: number; ry: number }[] = [
  { x: 5.5, z: 1.5, s: 1.3, ry: 0.6 },
  { x: -6, z: -2, s: 1.7, ry: 2.1 },
  { x: 4, z: -6.5, s: 1.1, ry: 1.2 },
  { x: -4.5, z: 5.5, s: 1.0, ry: 4.0 },
  { x: 7.5, z: 4, s: 1.4, ry: 3.3 },
  { x: -7, z: -5.5, s: 1.2, ry: 5.1 },
];

/* ------------------------------------------------------------------ */
/* tech icon canvas texture                                             */
/* ------------------------------------------------------------------ */

function makeIconTexture(item: StackItem): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const x = c.getContext("2d")!;
  x.fillStyle = item.color;
  x.fillRect(0, 0, 256, 256);
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillStyle = "#ffffff";
  x.font = '700 120px Arial, "Segoe UI Symbol", sans-serif';
  x.fillText(item.glyph, 128, 108);
  x.fillStyle = "rgba(0,0,0,0.55)";
  x.fillRect(0, 208, 256, 48);
  x.fillStyle = "#ffffff";
  x.font = '700 28px "Space Mono", monospace';
  x.fillText(item.name, 128, 232);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/* ------------------------------------------------------------------ */
/* lighthouse                                                           */
/* ------------------------------------------------------------------ */

function Beams() {
  const { reducedMotion } = useUI((s) => s);
  const gref = useRef<THREE.Group>(null);
  const beamMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffe9a8",
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  useFrame((_, rawDt) => {
    if (reducedMotion || !gref.current) return;
    gref.current.rotation.y += Math.min(rawDt, 0.05) * 0.7;
  });

  return (
    <group ref={gref} position={[0, 7.975, 0]}>
      <mesh geometry={G.box(6, 0.25, 0.25)} material={beamMat} position={[3, 0, 0]} />
      <mesh geometry={G.box(6, 0.25, 0.25)} material={beamMat} position={[-3, 0, 0]} />
    </group>
  );
}

function Lighthouse() {
  const stripeTex = useMemo(() => {
    const t = makeStripeTexture("#c0392b", "#f7ead7", 10);
    t.repeat.set(3, 2);
    return t;
  }, []);
  const towerMat = useMemo(
    () => new THREE.MeshToonMaterial({ map: stripeTex, gradientMap: getGradientMap() }),
    [stripeTex],
  );
  const glassMat = useMemo(
    () =>
      new THREE.MeshToonMaterial({
        color: "#cfe8ef",
        transparent: true,
        opacity: 0.5,
        gradientMap: getGradientMap(),
      }),
    [],
  );

  return (
    <group position={[0, groundY(0), -2]}>
      <ToonMesh geo={G.cyl(1.6, 1.8, 1, 12)} color="#8a6f5c" position={[0, 0.5, 0]} />
      <mesh
        geometry={G.cyl(1.0, 1.5, 7, 16)}
        material={towerMat}
        position={[0, 4.5, 0]}
        castShadow
      />
      <ToonMesh geo={G.cyl(1.5, 1.5, 0.35, 16)} color="#2a1d16" position={[0, 7.2, 0]} />
      <mesh geometry={G.cyl(0.9, 0.9, 1.2, 16)} material={glassMat} position={[0, 7.975, 0]} />
      <ToonMesh
        geo={G.sphere(0.55, 14, 12)}
        color="#3a2c1c"
        emissive="#ffd166"
        emissiveIntensity={3.2}
        position={[0, 7.975, 0]}
        castShadow={false}
      />
      <ToonMesh geo={G.cone(1.3, 1, 12)} color="#c0392b" outline position={[0, 9.075, 0]} />
      <Beams />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* orbiting tech icons                                                  */
/* ------------------------------------------------------------------ */

function TechIcon({
  item,
  index,
  reg,
}: {
  item: StackItem;
  index: number;
  reg: (i: number, g: THREE.Group | null) => void;
}) {
  const tex = useMemo(() => makeIconTexture(item), [item]);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
    [tex],
  );
  return (
    <group
      ref={(g) => {
        reg(index, g);
      }}
    >
      <Billboard>
        <Hoverable tip={`${item.name} — ${item.blurb}`}>
          <mesh geometry={G.plane(1.4, 1.4)} material={mat} />
        </Hoverable>
      </Billboard>
    </group>
  );
}

function TechOrbit() {
  const { reducedMotion } = useUI((s) => s);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const phases = useMemo(() => stack.map((_, i) => (i * Math.PI) / 3), []);
  const reg = useMemo(
    () => (i: number, g: THREE.Group | null) => {
      refs.current[i] = g;
    },
    [],
  );

  useFrame(({ clock }) => {
    const t = reducedMotion ? 0 : clock.elapsedTime;
    for (let i = 0; i < stack.length; i++) {
      const g = refs.current[i];
      if (!g) continue;
      const a = t * 0.22 + phases[i];
      g.position.set(
        Math.cos(a) * 6.8,
        6.8 + Math.sin(t * 0.8 + i * 1.7) * 0.5,
        Math.sin(a) * 6.8,
      );
    }
  });

  return (
    <group>
      {stack.map((item, i) => (
        <TechIcon key={item.name} item={item} index={i} reg={reg} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* chapter                                                              */
/* ------------------------------------------------------------------ */

export function Chapter5() {
  return (
    <ChapterRoot index={4}>
      {ROCKS.map((r, i) => (
        <ToonMesh
          key={i}
          geo={G.ico(0.6, 0)}
          color="#6b7280"
          flat
          position={[r.x, groundY(r.x), r.z]}
          rotation={[0, r.ry, 0]}
          scale={r.s}
        />
      ))}
      <Lighthouse />
      <TechOrbit />
    </ChapterRoot>
  );
}
