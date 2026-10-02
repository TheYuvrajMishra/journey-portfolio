"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  ChapterRoot,
  useWaterMaterial,
  Bob,
  Hoverable,
  groundY,
} from "../chapterKit";
import { ToonMesh } from "../ToonMesh";
import { G } from "@/lib/geometry";
import { getGradientMap, PALETTE } from "@/lib/toonMaterial";
import { useUI } from "@/lib/scrollStore";

/* Chapter 3 — Remote leap (station index 2). */

const MILL_BASE = groundY(-9);
const BIKE_BASE = groundY(5.5);
const TULIP_Y = groundY(5.8);
const DOWN_TUBE_LEN = Math.hypot(1.2, 0.5);
const DOWN_TUBE_ANG = Math.atan2(1.2, 0.5);

/** Canvas clock face: cream dial, city name, hour + minute hands. */
function makeClockTexture(city: string, hour: number, minute: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const x = c.getContext("2d")!;
  x.fillStyle = "#f7ead7";
  x.beginPath();
  x.arc(128, 128, 124, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = "#2a1d16";
  x.lineWidth = 10;
  x.beginPath();
  x.arc(128, 128, 116, 0, Math.PI * 2);
  x.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    x.strokeStyle = "#2a1d16";
    x.lineWidth = i % 3 === 0 ? 6 : 3;
    x.beginPath();
    x.moveTo(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100);
    x.lineTo(128 + Math.cos(a) * 110, 128 + Math.sin(a) * 110);
    x.stroke();
  }
  x.fillStyle = "#2a1d16";
  x.font = '700 26px "Space Mono", monospace';
  x.textAlign = "center";
  x.fillText(city, 128, 66);
  const ha = (((hour % 12) + minute / 60) / 12) * Math.PI * 2 - Math.PI / 2;
  const ma = (minute / 60) * Math.PI * 2 - Math.PI / 2;
  x.lineCap = "round";
  x.lineWidth = 10;
  x.beginPath();
  x.moveTo(128, 128);
  x.lineTo(128 + Math.cos(ha) * 55, 128 + Math.sin(ha) * 55);
  x.stroke();
  x.lineWidth = 7;
  x.beginPath();
  x.moveTo(128, 128);
  x.lineTo(128 + Math.cos(ma) * 85, 128 + Math.sin(ma) * 85);
  x.stroke();
  x.fillStyle = "#c0392b";
  x.beginPath();
  x.arc(128, 128, 8, 0, Math.PI * 2);
  x.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function Windmill() {
  const blades = useRef<THREE.Group>(null);
  const { reducedMotion } = useUI();
  useFrame((_, rawDt) => {
    if (reducedMotion || !blades.current) return;
    blades.current.rotation.z += Math.min(rawDt, 0.05) * 1.1;
  });
  return (
    <group position={[-9, MILL_BASE, -7]}>
      <ToonMesh geo={G.cyl(0.8, 1.5, 7.5, 10)} color={PALETTE.cream} outline position={[0, 3.75, 0]} />
      <ToonMesh geo={G.cone(1.15, 1.5, 10)} color={PALETTE.roofRed} outline position={[0, 8.25, 0]} />
      <ToonMesh geo={G.box(0.7, 1.4, 0.15)} color={PALETTE.woodDark} position={[0, 0.7, 1.36]} />
      <group position={[0, 7.6, 0.9]}>
        <ToonMesh geo={G.sphere(0.3, 10, 8)} color="#2a1d16" />
        <group ref={blades}>
          {[0, 1, 2, 3].map((i) => (
            <group key={`blade-${i}`} rotation={[0, 0, (i * Math.PI) / 2]}>
              <ToonMesh geo={G.box(0.55, 3.4, 0.1)} color={PALETTE.cream} position={[0, 1.9, 0]} />
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}

function Clock({
  pos,
  city,
  hour,
  minute,
  phase,
}: {
  pos: [number, number, number];
  city: string;
  hour: number;
  minute: number;
  phase: number;
}) {
  const faceMat = useMemo(
    () =>
      new THREE.MeshToonMaterial({
        map: makeClockTexture(city, hour, minute),
        gradientMap: getGradientMap(),
      }),
    [city, hour, minute],
  );
  return (
    <group position={pos}>
      <Hoverable tip="same standup, three timezones">
        <Bob amp={0.18} speed={1.2} phase={phase}>
          <mesh geometry={G.cyl(0.95, 0.95, 0.18, 24)} material={faceMat} rotation={[Math.PI / 2, 0, 0]} />
        </Bob>
      </Hoverable>
    </group>
  );
}

const CLOCKS: Array<{ pos: [number, number, number]; city: string; hour: number; minute: number; phase: number }> = [
  { pos: [-5, 4.5, -1], city: "Kolkata", hour: 10, minute: 10, phase: 0 },
  { pos: [0, 5.5, -2.5], city: "Delhi", hour: 10, minute: 10, phase: 1.6 },
  { pos: [5, 4.5, -1], city: "Amsterdam", hour: 6, minute: 40, phase: 3.1 },
];

export function Chapter3() {
  const waterMat = useWaterMaterial();
  const sailMat = useMemo(
    () =>
      new THREE.MeshToonMaterial({
        color: "#f7ead7",
        side: THREE.DoubleSide,
        gradientMap: getGradientMap(),
      }),
    [],
  );
  const archGeo = useMemo(() => new THREE.TorusGeometry(6, 0.45, 12, 40, Math.PI), []);
  const { isMobile } = useUI();

  // Tulip rows — instanced stems + heads along x at z = ±5.8
  const tulips = useMemo(() => {
    const step = isMobile ? 4 : 2;
    const perRow = Math.floor(24 / step) + 1;
    const count = perRow * 2;
    const stems = new THREE.InstancedMesh(G.cyl(0.04, 0.04, 0.5, 6), new THREE.MeshToonMaterial({ color: "#3f7a34", gradientMap: getGradientMap() }), count);
    const heads = new THREE.InstancedMesh(G.cone(0.16, 0.35, 8), new THREE.MeshToonMaterial({ color: "#ffffff", gradientMap: getGradientMap() }), count);
    const dummy = new THREE.Object3D();
    const cA = new THREE.Color("#e63946");
    const cB = new THREE.Color("#ffd166");
    const tc = new THREE.Color();
    let n = 0;
    for (const z of [-5.8, 5.8]) {
      for (let x = -12; x <= 12; x += step) {
        dummy.position.set(x, TULIP_Y + 0.25, z);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        stems.setMatrixAt(n, dummy.matrix);
        dummy.position.set(x, TULIP_Y + 0.55, z);
        dummy.updateMatrix();
        heads.setMatrixAt(n, dummy.matrix);
        heads.setColorAt(n, tc.copy(n % 2 === 0 ? cA : cB));
        n++;
      }
    }
    stems.count = n;
    heads.count = n;
    stems.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
    return { stems, heads };
  }, [isMobile]);

  return (
    <ChapterRoot index={2}>
      {/* Canal + dirt banks */}
      <mesh geometry={G.plane(34, 7.5)} material={waterMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]} />
      <ToonMesh geo={G.box(34, 0.3, 1.2)} color={PALETTE.dirt} position={[0, -0.5, 4.3]} />
      <ToonMesh geo={G.box(34, 0.3, 1.2)} color={PALETTE.dirt} position={[0, -0.5, -4.3]} />

      {/* Air-bridge arch over the canal along the path */}
      <ToonMesh geo={archGeo} color={PALETTE.wood} outline position={[0, -0.4, 0]} rotation={[0, Math.PI / 2, 0]} />
      <ToonMesh geo={G.box(1.4, 2.2, 1.4)} color={PALETTE.woodDark} position={[0, -1.5, 6]} />
      <ToonMesh geo={G.box(1.4, 2.2, 1.4)} color={PALETTE.woodDark} position={[0, -1.5, -6]} />

      {/* Windmill */}
      <Windmill />

      {/* Tulip rows */}
      <primitive object={tulips.stems} />
      <primitive object={tulips.heads} />

      {/* Boat on the canal */}
      <group position={[5, -0.35, 0.8]}>
        <Bob amp={0.12} speed={1.2} phase={0.5}>
          <ToonMesh geo={G.box(2.4, 0.7, 1.1)} color={PALETTE.wood} outline />
          <ToonMesh geo={G.cone(0.5, 0.9, 8)} color={PALETTE.wood} outline position={[1.55, 0, 0]} rotation={[0, 0, -Math.PI / 2]} />
          <ToonMesh geo={G.cyl(0.06, 0.08, 2.2, 8)} color={PALETTE.woodDark} position={[0, 1.45, 0]} />
          <mesh geometry={G.plane(1.4, 1.6)} material={sailMat} position={[0.78, 1.85, 0]} />
        </Bob>
      </group>

      {/* Bike on the bank */}
      <group position={[5.5, BIKE_BASE, 4.5]}>
        <ToonMesh geo={G.torus(0.45, 0.07, 8, 20)} color="#2a1d16" position={[0, 0.45, -0.65]} />
        <ToonMesh geo={G.torus(0.45, 0.07, 8, 20)} color="#2a1d16" position={[0, 0.45, 0.65]} />
        <ToonMesh geo={G.cyl(0.05, 0.05, 1.15, 8)} color="#2a1d16" position={[0, 0.95, 0]} rotation={[Math.PI / 2, 0, 0]} />
        <ToonMesh geo={G.cyl(0.05, 0.05, DOWN_TUBE_LEN, 8)} color="#2a1d16" position={[0, 0.7, -0.05]} rotation={[DOWN_TUBE_ANG, 0, 0]} />
        <ToonMesh geo={G.cyl(0.05, 0.05, 0.6, 8)} color="#2a1d16" position={[0, 0.72, -0.63]} />
        <ToonMesh geo={G.box(0.34, 0.09, 0.26)} color="#2a1d16" position={[0, 1.03, -0.63]} />
        <ToonMesh geo={G.cyl(0.05, 0.05, 0.35, 8)} color="#2a1d16" position={[0, 1.1, 0.58]} />
        <ToonMesh geo={G.cyl(0.04, 0.04, 0.5, 8)} color="#2a1d16" position={[0, 1.28, 0.58]} rotation={[0, 0, Math.PI / 2]} />
      </group>

      {/* Floating clocks — three timezones, same standup */}
      {CLOCKS.map((c) => (
        <Clock key={c.city} pos={c.pos} city={c.city} hour={c.hour} minute={c.minute} phase={c.phase} />
      ))}
    </ChapterRoot>
  );
}
