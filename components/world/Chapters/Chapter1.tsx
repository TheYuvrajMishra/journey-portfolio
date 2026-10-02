"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  ChapterRoot,
  useFlickerMaterial,
  makeStripeTexture,
  stationLocalToWorld,
  groundY,
} from "../chapterKit";
import { ToonMesh } from "../ToonMesh";
import { G } from "@/lib/geometry";
import { toon, getGradientMap, PALETTE } from "@/lib/toonMaterial";
import { addEmitter } from "@/lib/emitters";
import { useUI } from "@/lib/scrollStore";

/* Chapter 1 — Origin, Kolkata at dawn (station index 0). */

const HOUSE_BASE = groundY(-6);
const DESK_BASE = groundY(-2.2);
const CHAI_BASE = groundY(6);

const _emitterOnce = new Set<string>();
const wingMat = toon("#23232b", { side: THREE.DoubleSide });

const TABLE_LEGS: Array<[number, number]> = [
  [-0.8, -0.35],
  [0.8, -0.35],
  [-0.8, 0.35],
  [0.8, 0.35],
];
const STOOL_LEGS: Array<[number, number]> = [
  [1.68, 0.4],
  [1.41, 0.51],
  [1.41, 0.29],
];
const CHAI_POSTS: Array<[number, number]> = [
  [-1.3, -1.0],
  [1.3, -1.0],
  [-1.3, 1.0],
  [1.3, 1.0],
];

/** Taxi pose on the ellipse around the house: center (-6,-4), rx 9, rz 6.5. */
function taxiPose(a: number): { x: number; y: number; z: number; yaw: number } {
  const x = -6 + 9 * Math.cos(a);
  const z = -4 + 6.5 * Math.sin(a);
  return {
    x,
    y: groundY(x) + 0.45,
    z,
    yaw: Math.atan2(-9 * Math.sin(a), 6.5 * Math.cos(a)),
  };
}

/** Crow pose circling above the house. */
function crowPose(a: number, r: number, h: number): { p: [number, number, number]; yaw: number } {
  return {
    p: [-6 + r * Math.cos(a), h, -4 + r * Math.sin(a)],
    yaw: Math.atan2(-Math.sin(a), Math.cos(a)),
  };
}

function Taxi() {
  const g = useRef<THREE.Group>(null);
  const ang = useRef(0.6);
  const { reducedMotion } = useUI();
  const init = useMemo(() => taxiPose(0.6), []);
  useFrame((_, rawDt) => {
    if (reducedMotion) return;
    const grp = g.current;
    if (!grp) return;
    ang.current += Math.min(rawDt, 0.05) * 0.22;
    const p = taxiPose(ang.current);
    grp.position.set(p.x, p.y, p.z);
    grp.rotation.y = p.yaw;
  });
  return (
    <group ref={g} position={[init.x, init.y, init.z]} rotation={[0, init.yaw, 0]}>
      {/* inner group: body long axis (x) aligned with travel direction */}
      <group rotation={[0, Math.PI / 2, 0]}>
        <ToonMesh geo={G.box(2.4, 0.7, 1.2)} color="#f5b301" outline position={[0, 0.75, 0]} />
        <ToonMesh geo={G.box(1.2, 0.6, 1.1)} color="#f7ead7" outline position={[-0.1, 1.35, 0]} />
        <ToonMesh geo={G.box(1.24, 0.28, 1.14)} color="#1c2430" position={[-0.1, 1.4, 0]} />
        <ToonMesh geo={G.box(0.5, 0.18, 0.3)} color="#2a1d16" position={[0, 1.74, 0]} />
        <ToonMesh geo={G.cyl(0.32, 0.32, 0.26, 12)} color="#2a1d16" rotation={[0, 0, Math.PI / 2]} position={[-0.8, 0.32, -0.55]} />
        <ToonMesh geo={G.cyl(0.32, 0.32, 0.26, 12)} color="#2a1d16" rotation={[0, 0, Math.PI / 2]} position={[0.8, 0.32, -0.55]} />
        <ToonMesh geo={G.cyl(0.32, 0.32, 0.26, 12)} color="#2a1d16" rotation={[0, 0, Math.PI / 2]} position={[-0.8, 0.32, 0.55]} />
        <ToonMesh geo={G.cyl(0.32, 0.32, 0.26, 12)} color="#2a1d16" rotation={[0, 0, Math.PI / 2]} position={[0.8, 0.32, 0.55]} />
      </group>
    </group>
  );
}

function Crow({ r, h, speed, phase }: { r: number; h: number; speed: number; phase: number }) {
  const g = useRef<THREE.Group>(null);
  const wl = useRef<THREE.Group>(null);
  const wr = useRef<THREE.Group>(null);
  const ang = useRef(phase);
  const { reducedMotion } = useUI();
  const init = useMemo(() => crowPose(phase, r, h), [phase, r, h]);
  useFrame(({ clock }, rawDt) => {
    if (reducedMotion) return;
    const grp = g.current;
    if (!grp) return;
    ang.current += Math.min(rawDt, 0.05) * speed;
    const p = crowPose(ang.current, r, h);
    grp.position.set(p.p[0], p.p[1], p.p[2]);
    grp.rotation.y = p.yaw;
    const f = Math.sin(clock.elapsedTime * 9 + phase) * 0.55;
    if (wl.current) wl.current.rotation.z = 0.3 + f;
    if (wr.current) wr.current.rotation.z = -0.3 - f;
  });
  return (
    <group ref={g} position={init.p} rotation={[0, init.yaw, 0]}>
      <ToonMesh geo={G.cone(0.26, 1.1, 8)} color="#2b2b33" rotation={[Math.PI / 2, 0, 0]} scale={[0.8, 0.8, 1]} />
      <group ref={wl} position={[-0.15, 0.12, 0]} rotation={[0, 0, 0.3]}>
        <mesh geometry={G.plane(1.15, 0.5)} material={wingMat} position={[-0.6, 0, 0]} />
      </group>
      <group ref={wr} position={[0.15, 0.12, 0]} rotation={[0, 0, -0.3]}>
        <mesh geometry={G.plane(1.15, 0.5)} material={wingMat} position={[0.6, 0, 0]} />
      </group>
    </group>
  );
}

export function Chapter1() {
  const winMat = useFlickerMaterial("#3a2c1c", "#ffca7a", 1.2, 0.4);
  const canopyMat = useMemo(
    () =>
      new THREE.MeshToonMaterial({
        map: makeStripeTexture("#e4572e", "#f7ead7"),
        gradientMap: getGradientMap(),
      }),
    [],
  );

  // Register particle emitter points once (world coords).
  useMemo(() => {
    if (_emitterOnce.has("ch1")) return;
    _emitterOnce.add("ch1");
    addEmitter("chimney", stationLocalToWorld(0, -4.5, HOUSE_BASE + 5.15, -4.8, new THREE.Vector3()));
    addEmitter("chai-steam", stationLocalToWorld(0, 6, CHAI_BASE + 1.8, 3, new THREE.Vector3()));
  }, []);

  return (
    <ChapterRoot index={0}>
      {/* House — brick box, pyramid roof, warm flickering windows, chimney */}
      <group position={[-6, HOUSE_BASE, -4]}>
        <ToonMesh geo={G.box(5, 3.2, 4)} color={PALETTE.brick} outline position={[0, 1.6, 0]} />
        <ToonMesh geo={G.cone(3.6, 1.8, 4)} color={PALETTE.roofRed} outline position={[0, 4.1, 0]} rotation={[0, Math.PI / 4, 0]} />
        <mesh geometry={G.plane(0.7, 0.9)} material={winMat} position={[-1.3, 1.7, 2.02]} />
        <mesh geometry={G.plane(0.7, 0.9)} material={winMat} position={[1.3, 1.7, 2.02]} />
        <ToonMesh geo={G.box(1.0, 2.0, 0.18)} color={PALETTE.woodDark} position={[0, 1.0, 2.02]} />
        <ToonMesh geo={G.box(0.5, 1.2, 0.5)} color="#8a4a3a" position={[1.5, 4.5, -0.8]} />
      </group>

      {/* Veranda desk — table, laptop with glowing screen, stool */}
      <group position={[-2.2, DESK_BASE, -3.2]} rotation={[0, 0.35, 0]}>
        <ToonMesh geo={G.box(1.8, 0.12, 0.9)} color={PALETTE.wood} position={[0, 0.75, 0]} />
        {TABLE_LEGS.map((p, i) => (
          <ToonMesh key={`tl-${i}`} geo={G.box(0.09, 0.75, 0.09)} color={PALETTE.woodDark} position={[p[0], 0.375, p[1]]} />
        ))}
        <ToonMesh geo={G.box(0.7, 0.06, 0.5)} color="#3a3f4a" position={[0, 0.84, 0.05]} />
        <group position={[0, 0.87, -0.2]} rotation={[-0.17, 0, 0]}>
          <ToonMesh geo={G.box(0.7, 0.5, 0.04)} color="#3a3f4a" position={[0, 0.25, 0]} />
          <ToonMesh geo={G.plane(0.62, 0.42)} color="#0b0f14" emissive="#7dd3fc" emissiveIntensity={1.4} position={[0, 0.25, 0.021]} />
        </group>
        <ToonMesh geo={G.cyl(0.3, 0.3, 0.12, 12)} color={PALETTE.roofRed} position={[1.5, 0.5, 0.4]} />
        {STOOL_LEGS.map((p, i) => (
          <ToonMesh key={`sl-${i}`} geo={G.cyl(0.035, 0.035, 0.44, 8)} color={PALETTE.woodDark} position={[p[0], 0.22, p[1]]} />
        ))}
      </group>

      {/* Yellow taxi looping the house */}
      <Taxi />

      {/* Three crows circling overhead */}
      <Crow r={5} h={8.5} speed={0.5} phase={0} />
      <Crow r={7} h={10} speed={0.4} phase={2.1} />
      <Crow r={9} h={11.5} speed={0.6} phase={4.2} />

      {/* Chai stall */}
      <group position={[6, CHAI_BASE, 3]}>
        {CHAI_POSTS.map((p, i) => (
          <ToonMesh key={`cp-${i}`} geo={G.cyl(0.07, 0.09, 2.6, 8)} color={PALETTE.woodDark} position={[p[0], 1.3, p[1]]} />
        ))}
        <mesh geometry={G.box(3, 0.15, 2.4)} material={canopyMat} position={[0, 2.68, 0]} />
        <ToonMesh geo={G.box(2.6, 1.0, 1.2)} color={PALETTE.wood} position={[0, 0.5, 0]} />
        <ToonMesh geo={G.cyl(0.32, 0.36, 0.5, 12)} color="#b8b0a0" position={[-0.6, 1.25, 0]} />
        <ToonMesh geo={G.sphere(0.32, 12, 8)} color="#8f887a" position={[-0.6, 1.5, 0]} scale={[1, 0.5, 1]} />
        <ToonMesh geo={G.cyl(0.07, 0.05, 0.14, 8)} color={PALETTE.cream} position={[0.2, 1.07, 0.2]} />
        <ToonMesh geo={G.cyl(0.07, 0.05, 0.14, 8)} color={PALETTE.cream} position={[0.5, 1.07, -0.1]} />
        <ToonMesh geo={G.cyl(0.07, 0.05, 0.14, 8)} color={PALETTE.cream} position={[0.8, 1.07, 0.25]} />
      </group>
    </ChapterRoot>
  );
}
