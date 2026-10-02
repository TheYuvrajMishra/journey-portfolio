"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useUI } from "@/lib/scrollStore";
import { toon, toonEmissive, getGradientMap } from "@/lib/toonMaterial";
import { G } from "@/lib/geometry";
import { ToonMesh } from "../ToonMesh";
import {
  ChapterRoot,
  Bob,
  Hoverable,
  groundY,
  makeStripeTexture,
  makeLabelTexture,
  useChapterFrame,
} from "../chapterKit";

/* ------------------------------------------------------------------ */
/* config (module scope — stable references, no per-render churn)        */
/* ------------------------------------------------------------------ */

interface StallCfg {
  x: number;
  z: number;
  rotY: number;
  c1: string;
  c2: string;
  goods: string[];
}

const STALLS: StallCfg[] = [
  { x: -6, z: 2, rotY: 0, c1: "#e4572e", c2: "#f7ead7", goods: ["#67e8f9", "#ffd166", "#ff6b8a"] },
  { x: 0, z: -5, rotY: 0.4, c1: "#1f8a80", c2: "#f7ead7", goods: ["#a3e635", "#c084fc", "#ff6b8a", "#67e8f9"] },
  { x: 6, z: 2, rotY: 0, c1: "#e8a13c", c2: "#2a1d16", goods: ["#ffd166", "#67e8f9", "#a3e635"] },
];

interface GigCfg {
  title: string;
  price: string;
  pos: [number, number, number];
}

const GIGS: GigCfg[] = [
  { title: "Logo design", price: "₹1,200", pos: [-3, 3.6, -1] },
  { title: "Landing page", price: "₹6,000", pos: [3, 4.2, -1] },
  { title: "AI chatbot", price: "₹9,500", pos: [-1.5, 4.6, -4] },
  { title: "Brand kit", price: "₹2,400", pos: [4.5, 3.4, -4.5] },
];

const BUILDINGS: { x: number; z: number }[] = [
  { x: -7, z: -9 },
  { x: 0, z: -10 },
  { x: 7, z: -9 },
];

const POST_OFFSETS: [number, number][] = [
  [-1.6, -1.2],
  [1.6, -1.2],
  [-1.6, 1.2],
  [1.6, 1.2],
];

const CARD_BACK = toon("#2a1d16");

/** module-scope temp — zero per-frame allocations in the coin loop */
const _coinDummy = new THREE.Object3D();

/* ------------------------------------------------------------------ */
/* market stall                                                         */
/* ------------------------------------------------------------------ */

function Stall({ cfg }: { cfg: StallCfg }) {
  const stripeTex = useMemo(() => makeStripeTexture(cfg.c1, cfg.c2), [cfg]);
  const awningMat = useMemo(
    () => new THREE.MeshToonMaterial({ map: stripeTex, gradientMap: getGradientMap() }),
    [stripeTex],
  );
  return (
    <group position={[cfg.x, groundY(cfg.x), cfg.z]} rotation={[0, cfg.rotY, 0]}>
      {POST_OFFSETS.map(([px, pz], i) => (
        <ToonMesh
          key={i}
          geo={G.cyl(0.09, 0.11, 2.6, 8)}
          color="#7a4a2b"
          position={[px, 1.3, pz]}
        />
      ))}
      <mesh
        geometry={G.box(3.4, 0.18, 2.6)}
        material={awningMat}
        position={[0, 2.7, 0]}
        castShadow
      />
      <ToonMesh geo={G.box(3, 1.1, 1.4)} color="#7a4a2b" position={[0, 0.55, 0]} />
      {cfg.goods.map((col, i) => (
        <ToonMesh
          key={i}
          geo={G.box(0.34, 0.34, 0.34)}
          color={col}
          position={[-1.0 + i * 0.68, 1.27, 0]}
        />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* floating gig card                                                    */
/* ------------------------------------------------------------------ */

function GigCard({ gig, phase }: { gig: GigCfg; phase: number }) {
  const tex = useMemo(
    () =>
      makeLabelTexture({
        text: gig.title,
        sub: `gig · ${gig.price}`,
        w: 512,
        h: 660,
        fontSize: 72,
      }),
    [gig],
  );
  const cardMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
    [tex],
  );
  return (
    <Bob amp={0.18} phase={phase} position={gig.pos}>
      <Hoverable tip="escrow-protected gig">
        <mesh geometry={G.box(1.78, 2.28, 0.06)} material={CARD_BACK} />
        <mesh geometry={G.plane(1.7, 2.2)} material={cardMat} position={[0, 0, 0.035]} />
      </Hoverable>
    </Bob>
  );
}

/* ------------------------------------------------------------------ */
/* popping coins above the middle stall                                 */
/* ------------------------------------------------------------------ */

function Coins({ count, reducedMotion }: { count: number; reducedMotion: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const laidOut = useRef(false);
  const coinGeo = useMemo(() => G.cyl(0.2, 0.2, 0.06, 12), []);
  const coinMat = useMemo(() => toonEmissive("#b8860b", "#ffd166", 0.7), []);

  useFrame(({ clock }) => {
    if (reducedMotion && laidOut.current) return;
    const im = ref.current;
    if (!im) return;
    if (reducedMotion) laidOut.current = true;
    const time = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const cycle = reducedMotion ? i / count : (time * 0.45 + i / count) % 1;
      const arc = Math.sin(cycle * Math.PI);
      _coinDummy.position.set(0, 1.5 + arc * 3.2, -5);
      _coinDummy.rotation.set(0, reducedMotion ? i * 0.6 : time * 3 + i, 0);
      _coinDummy.scale.setScalar(0.2 + arc * 0.8);
      _coinDummy.updateMatrix();
      im.setMatrixAt(i, _coinDummy.matrix);
    }
    im.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[coinGeo, coinMat, count]} frustumCulled={false} />;
}

/* ------------------------------------------------------------------ */
/* multi-tenant buildings with scroll-lit windows                       */
/* ------------------------------------------------------------------ */

function Buildings() {
  const winRefs = useRef<(THREE.Mesh | null)[]>([]);
  const dark = useMemo(() => toon("#1c2733"), []);
  const lit = useMemo(() => toonEmissive("#3a2c1c", "#ffd166", 1.3), []);
  const winGeo = G.plane(0.5, 0.6);

  useChapterFrame(3, 0.13, (lt) => {
    const litCount = Math.floor(lt * 12);
    for (let b = 0; b < BUILDINGS.length; b++) {
      for (let j = 0; j < 12; j++) {
        const m = winRefs.current[b * 12 + j];
        if (m) m.material = j < litCount ? lit : dark;
      }
    }
  });

  return (
    <>
      {BUILDINGS.map((bd, b) => (
        <group key={b} position={[bd.x, groundY(bd.x), bd.z]}>
          <ToonMesh geo={G.box(3, 4.5, 3)} color="#8a6f5c" outline position={[0, 2.25, 0]} />
          <ToonMesh geo={G.box(3.4, 0.35, 3.4)} color="#5d3820" position={[0, 4.68, 0]} />
          {[0, 1, 2].map((col) =>
            [0, 1, 2, 3].map((row) => {
              const gi = b * 12 + col * 4 + row;
              return (
                <mesh
                  key={`${col}-${row}`}
                  geometry={winGeo}
                  material={dark}
                  position={[(col - 1) * 1.0, 0.7 + row * 1.0, 1.51]}
                  ref={(m) => {
                    winRefs.current[gi] = m;
                  }}
                />
              );
            }),
          )}
        </group>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* escrow beacon                                                        */
/* ------------------------------------------------------------------ */

function Beacon() {
  const { reducedMotion } = useUI((s) => s);
  const shaftRef = useRef<THREE.Mesh>(null);
  const shaftGeo = useMemo(() => new THREE.CylinderGeometry(1.3, 0.5, 15, 16, 1, true), []);
  const shaftMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#67e8f9",
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );

  useFrame(({ clock }) => {
    const m = shaftRef.current;
    if (!m || reducedMotion) return;
    const s = Math.sin(clock.elapsedTime * 2.4);
    shaftMat.opacity = 0.22 + s * 0.1;
    m.scale.set(1 + s * 0.06, 1, 1 + s * 0.06);
  });

  return (
    <group position={[2.5, groundY(2.5), 4]}>
      <ToonMesh geo={G.cyl(0.12, 0.16, 3, 8)} color="#5d3820" position={[0, 1.5, 0]} />
      <ToonMesh
        geo={G.sphere(0.35, 12, 10)}
        color="#0b2b33"
        emissive="#67e8f9"
        emissiveIntensity={2.6}
        outline
        position={[0, 3.2, 0]}
      />
      <mesh ref={shaftRef} geometry={shaftGeo} material={shaftMat} position={[0, 9, 0]} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* chapter                                                              */
/* ------------------------------------------------------------------ */

export function Chapter4() {
  const { reducedMotion, isMobile } = useUI((s) => s);
  const coinCount = isMobile ? 12 : 24;
  return (
    <ChapterRoot index={3}>
      {STALLS.map((s, i) => (
        <Stall key={i} cfg={s} />
      ))}
      {GIGS.map((g, i) => (
        <GigCard key={g.title} gig={g} phase={i * 1.3} />
      ))}
      <Coins count={coinCount} reducedMotion={reducedMotion} />
      <Buildings />
      <Beacon />
    </ChapterRoot>
  );
}
