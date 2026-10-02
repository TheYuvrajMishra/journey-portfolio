"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scrollRef, useUI } from "@/lib/scrollStore";
import { pointAt, sideAt, _p, _side } from "@/lib/spline";
import { toon } from "@/lib/toonMaterial";
import { mergeGeos } from "@/lib/geometry";
import { PUFF_VERT, PUFF_FRAG } from "@/lib/shaders";
import { getEmitters } from "@/lib/emitters";

/* ------------------------------------------------------------------ */
/* clouds                                                               */
/* ------------------------------------------------------------------ */

const CLOUD_N = 9;

function Clouds() {
  const { reducedMotion, isMobile } = useUI();
  const group = useRef<THREE.Group>(null);

  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const blobs: [number, number, number, number][] = [
      [0, 0, 0, 2.6],
      [2.4, -0.3, 0.4, 1.9],
      [-2.4, -0.4, -0.3, 1.8],
      [0.9, 0.9, -0.6, 1.6],
      [-1.1, 0.8, 0.5, 1.5],
    ];
    for (const [x, y, z, r] of blobs) {
      const s = new THREE.SphereGeometry(r, 10, 8);
      s.translate(x, y, z);
      parts.push(s);
    }
    return mergeGeos(parts);
  }, []);
  const mat = useMemo(() => toon("#f4f6f8"), []);

  const seeds = useMemo(() => {
    const arr: { x: number; y: number; z: number; s: number; v: number }[] = [];
    for (let i = 0; i < CLOUD_N; i++) {
      arr.push({
        x: -55 + Math.random() * 110,
        y: 24 + Math.random() * 16,
        z: 25 - Math.random() * 230,
        s: 0.8 + Math.random() * 1.6,
        v: 0.35 + Math.random() * 0.5,
      });
    }
    return arr;
  }, []);

  useFrame(({ clock }, rawDt) => {
    const g = group.current;
    if (!g || reducedMotion) return;
    const dt = Math.min(rawDt, 0.05);
    const t = clock.elapsedTime;
    for (let i = 0; i < g.children.length; i++) {
      const c = g.children[i];
      const sd = seeds[i];
      c.position.x += sd.v * dt;
      if (c.position.x > 65) c.position.x = -65;
      c.position.y = sd.y + Math.sin(t * 0.18 + i * 2.1) * 0.8;
    }
  });

  if (isMobile && reducedMotion) return null;
  return (
    <group ref={group}>
      {seeds.map((sd, i) => (
        <mesh
          key={i}
          geometry={geo}
          material={mat}
          position={[sd.x, sd.y, sd.z]}
          scale={sd.s}
        />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* birds (ambient loops, distinct from chapter-1 crows)                 */
/* ------------------------------------------------------------------ */

const BIRD_N = 5;

function Birds() {
  const { reducedMotion } = useUI();
  const group = useRef<THREE.Group>(null);

  const bodyGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.12, 0.7, 6);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
  const wingGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.85, 0.32);
    g.translate(0.42, 0, 0);
    return g;
  }, []);
  const mat = useMemo(() => toon("#3a3f4a", { side: THREE.DoubleSide }), []);

  const seeds = useMemo(
    () =>
      Array.from({ length: BIRD_N }, () => ({
        cx: -20 + Math.random() * 40,
        cy: 14 + Math.random() * 8,
        cz: -20 - Math.random() * 140,
        rx: 8 + Math.random() * 8,
        rz: 6 + Math.random() * 6,
        sp: 0.25 + Math.random() * 0.2,
        ph: Math.random() * Math.PI * 2,
        fl: 7 + Math.random() * 3,
      })),
    [],
  );
  const wings = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }, rawDt) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(rawDt, 0.05);
    const t = clock.elapsedTime;
    for (let i = 0; i < seeds.length; i++) {
      const sd = seeds[i];
      const bird = g.children[i];
      if (!bird) continue;
      if (!reducedMotion) sd.ph += dt * sd.sp;
      const a = sd.ph;
      const x = sd.cx + Math.cos(a) * sd.rx;
      const z = sd.cz + Math.sin(a) * sd.rz;
      bird.position.set(x, sd.cy + Math.sin(t * 0.6 + i) * 1.2, z);
      // face along travel direction
      const dx = -Math.sin(a) * sd.rx;
      const dz = Math.cos(a) * sd.rz;
      bird.rotation.y = Math.atan2(dx, dz);
      // flap
      const flap = reducedMotion ? 0.25 : Math.sin(t * sd.fl + i * 1.7) * 0.65;
      const wl = wings.current[i * 2];
      const wr = wings.current[i * 2 + 1];
      if (wl) wl.rotation.z = flap;
      if (wr) wr.rotation.z = -flap;
    }
  });

  return (
    <group ref={group}>
      {seeds.map((sd, i) => (
        <group key={i} position={[sd.cx, sd.cy, sd.cz]}>
          <mesh geometry={bodyGeo} material={mat} />
          <mesh
            geometry={wingGeo}
            material={mat}
            ref={(m) => {
              wings.current[i * 2] = m;
            }}
          />
          <mesh
            geometry={wingGeo}
            material={mat}
            rotation={[0, Math.PI, 0]}
            ref={(m) => {
              wings.current[i * 2 + 1] = m;
            }}
          />
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* generic rising-particle column (smoke / steam / embers)              */
/* ------------------------------------------------------------------ */

interface ColumnOpts {
  emitterId: string;
  count: number;
  color: string;
  rise: number;
  size: number;
  alpha: number;
  drift?: number;
  flicker?: boolean;
}

function ParticleColumn(o: ColumnOpts) {
  const { reducedMotion, isMobile } = useUI();
  const pts = useRef<THREE.Points>(null);

  const { geo, mat, seeds } = useMemo(() => {
    const n = isMobile ? Math.ceil(o.count / 2) : o.count;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(n), 1));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(n), 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: PUFF_VERT,
      fragmentShader: PUFF_FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color(o.color) } },
    });
    const s = new Float32Array(n * 3); // phase, speed jitter, sway seed
    for (let i = 0; i < n; i++) {
      s[i * 3] = Math.random();
      s[i * 3 + 1] = 0.75 + Math.random() * 0.5;
      s[i * 3 + 2] = Math.random() * Math.PI * 2;
    }
    return { geo: g, mat: m, seeds: s, n };
  }, [o.count, o.color, isMobile]);

  useFrame(({ clock }) => {
    const p = pts.current;
    const live = getEmitters(o.emitterId);
    if (!p || live.length === 0) return;
    const t = clock.elapsedTime;
    const pa = geo.attributes.position.array as Float32Array;
    const sa = geo.attributes.aSize.array as Float32Array;
    const aa = geo.attributes.aAlpha.array as Float32Array;
    const n = (seeds.length / 3) | 0;
    const per = Math.max(1, Math.floor(n / live.length));
    for (let i = 0; i < n; i++) {
      const e = live[i % live.length];
      const ph = seeds[i * 3];
      const sp = seeds[i * 3 + 1];
      const sw = seeds[i * 3 + 2];
      // staggered continuous loop
      const k = (t * 0.14 * sp + ph) % 1;
      const j = i % per;
      const spread = 0.25 + (j / per) * 0.5;
      pa[i * 3] = e.x + Math.sin(k * 5 + sw) * 0.45 * k * spread + k * (o.drift ?? 1.1);
      pa[i * 3 + 1] = e.y + k * o.rise;
      pa[i * 3 + 2] = e.z + Math.cos(k * 4 + sw) * 0.45 * k * spread;
      sa[i] = o.size * (0.5 + k * 1.6);
      const fade = Math.sin(k * Math.PI);
      aa[i] = o.alpha * fade * (o.flicker ? 0.6 + 0.4 * Math.sin(t * 17 + sw * 9) : 1);
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aSize.needsUpdate = true;
    geo.attributes.aAlpha.needsUpdate = true;
  });

  if (reducedMotion) return null;
  return <points ref={pts} geometry={geo} material={mat} frustumCulled={false} />;
}

/* ------------------------------------------------------------------ */
/* fireflies                                                            */
/* ------------------------------------------------------------------ */

function Fireflies() {
  const { reducedMotion, isMobile } = useUI();
  const pts = useRef<THREE.Points>(null);
  const COUNT = isMobile ? 40 : 90;

  const { geo, mat, seeds } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(COUNT).fill(0.55), 1));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(COUNT), 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: PUFF_VERT,
      fragmentShader: PUFF_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color("#d8ff7a") } },
    });
    const s = new Float32Array(COUNT * 4);
    for (let i = 0; i < COUNT * 4; i++) s[i] = Math.random();
    return { geo: g, mat: m, seeds: s };
  }, [COUNT]);

  useFrame(({ clock }) => {
    const p = pts.current;
    const live = getEmitters("fireflies");
    if (!p || live.length === 0) return;
    const t = clock.elapsedTime;
    const pa = geo.attributes.position.array as Float32Array;
    const aa = geo.attributes.aAlpha.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      const e = live[i % live.length];
      const s0 = seeds[i * 4];
      const s1 = seeds[i * 4 + 1];
      const s2 = seeds[i * 4 + 2];
      const s3 = seeds[i * 4 + 3];
      const r = 2 + s0 * 7;
      pa[i * 3] = e.x + Math.sin(t * (0.25 + s1 * 0.4) + s2 * 12) * r;
      pa[i * 3 + 1] = e.y + Math.sin(t * (0.4 + s2 * 0.5) + s3 * 12) * 2.2;
      pa[i * 3 + 2] = e.z + Math.cos(t * (0.22 + s3 * 0.4) + s1 * 12) * r;
      aa[i] = 0.25 + 0.75 * Math.max(0, Math.sin(t * (1.5 + s0 * 2) + s1 * 20));
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aAlpha.needsUpdate = true;
  });

  if (reducedMotion) return null;
  return <points ref={pts} geometry={geo} material={mat} frustumCulled={false} />;
}

/* ------------------------------------------------------------------ */
/* drifting pollen along the whole path (daytime)                       */
/* ------------------------------------------------------------------ */

function Pollen() {
  const { reducedMotion, isMobile } = useUI();
  const pts = useRef<THREE.Points>(null);
  const COUNT = isMobile ? 50 : 130;

  const { geo, mat, seeds } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    const s = new Float32Array(COUNT * 4);
    for (let i = 0; i < COUNT; i++) {
      const t = Math.random();
      const lat = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random() * 9);
      pointAt(t, _p);
      sideAt(t, _side);
      pos[i * 3] = _p.x + _side.x * lat;
      pos[i * 3 + 1] = _p.y + 0.5 + Math.random() * 3.5;
      pos[i * 3 + 2] = _p.z + _side.z * lat;
      for (let k = 0; k < 4; k++) s[i * 4 + k] = Math.random();
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(COUNT).fill(0.32), 1));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(COUNT).fill(0.5), 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: PUFF_VERT,
      fragmentShader: PUFF_FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color("#fff3c4") } },
    });
    return { geo: g, mat: m, seeds: s };
  }, [COUNT]);

  const base = useMemo(() => {
    const p = geo.attributes.position.array as Float32Array;
    return Float32Array.from(p);
  }, [geo]);

  useFrame(({ clock }) => {
    const p = pts.current;
    if (!p) return;
    const t = clock.elapsedTime;
    // fade pollen out as night falls
    const day = 1 - THREE.MathUtils.smoothstep(scrollRef.current.t, 0.72, 0.9);
    const pa = geo.attributes.position.array as Float32Array;
    const aa = geo.attributes.aAlpha.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      const s0 = seeds[i * 4];
      const s1 = seeds[i * 4 + 1];
      pa[i * 3] = base[i * 3] + Math.sin(t * 0.4 + s0 * 9) * 1.2;
      pa[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.55 + s1 * 9) * 0.7;
      pa[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.33 + s0 * 7) * 1.2;
      aa[i] = 0.45 * day;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aAlpha.needsUpdate = true;
  });

  if (reducedMotion) return null;
  return <points ref={pts} geometry={geo} material={mat} frustumCulled={false} />;
}

/** All ambient life: clouds, birds, smoke/steam, embers, fireflies, pollen. */
export function Ambient() {
  return (
    <group>
      <Clouds />
      <Birds />
      <ParticleColumn emitterId="chimney" count={36} color="#cfc8bd" rise={5} size={1.6} alpha={0.42} drift={1.6} />
      <ParticleColumn emitterId="chai-steam" count={26} color="#ffffff" rise={2.6} size={0.9} alpha={0.5} drift={0.5} />
      <ParticleColumn emitterId="campfire" count={44} color="#ff9a3c" rise={3.4} size={0.5} alpha={0.85} drift={0.35} flicker />
      <Fireflies />
      <Pollen />
    </group>
  );
}
