import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scrollRef, useUI } from "@/lib/scrollStore";
import { pointAt, tangentAt, getCurveLength, _p, _tan } from "@/lib/spline";
import { pathY } from "./Path";
import { ToonMesh } from "./ToonMesh";
import { G } from "@/lib/geometry";
import { toonEmissive } from "@/lib/toonMaterial";
import { PUFF_VERT, PUFF_FRAG } from "@/lib/shaders";
import { ambientAudio } from "@/lib/audio";
import { getStations } from "@/lib/stations";

const DUST_N = 26;

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();

/** Tiny laptop glyph drawn on a canvas → emissive backpack sticker. */
function useStickerTexture(): THREE.CanvasTexture | null {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 96;
    const x = c.getContext("2d");
    if (!x) return null;
    x.fillStyle = "#0b0f14";
    x.beginPath();
    x.roundRect(4, 4, 120, 88, 10);
    x.fill();
    x.fillStyle = "#67e8f9";
    x.fillRect(16, 16, 96, 52);
    x.fillStyle = "#0ea5b7";
    x.fillRect(16, 16, 96, 10);
    x.fillStyle = "#e2f4f8";
    for (let i = 0; i < 4; i++) x.fillRect(24, 36 + i * 9, 80 - i * 14, 4);
    x.fillStyle = "#334155";
    x.fillRect(48, 74, 32, 8);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/**
 * Procedural low-poly dev: hoodie, backpack with glowing laptop sticker.
 * Walk cycle driven by scroll velocity; idles (breathes) when scroll stops.
 * Scrolling back walks him backward. Reacts at landmarks.
 */
export function Character() {
  const { reducedMotion, isMobile } = useUI();
  const root = useRef<THREE.Group>(null);
  const hips = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const headG = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const pack = useRef<THREE.Group>(null);

  const sticker = useStickerTexture();
  const stations = useMemo(() => getStations(), []);

  // walk state (refs, not state — no re-renders)
  const st = useRef({
    phase: 0,
    blend: 0,
    breath: Math.random() * 10,
    prevSin: 0,
    prevT: 0,
    jump: -1,
    yaw: 0,
    pitch: 0,
  });

  // ---- dust pool ----
  const dust = useMemo(() => {
    const pos = new Float32Array(DUST_N * 3);
    const size = new Float32Array(DUST_N);
    const alpha = new Float32Array(DUST_N);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: PUFF_VERT,
      fragmentShader: PUFF_FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color("#d9c9a8") } },
    });
    const vel = new Float32Array(DUST_N * 3);
    const life = new Float32Array(DUST_N);
    const maxLife = new Float32Array(DUST_N);
    return { geo, mat, vel, life, maxLife, cursor: 0 };
  }, []);

  const packBaseY = 1.28;

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const time = clock.elapsedTime;
    const { t, vel } = scrollRef.current;
    const s = st.current;
    const r = root.current;
    if (!r) return;

    // ---- position + orientation on the spline ----
    pointAt(t, _p);
    tangentAt(t, _tan);
    const groundY = pathY(t);
    // jump offset (chapter 6 arrival celebration)
    let jumpY = 0;
    if (s.jump >= 0) {
      s.jump += dt;
      const k = s.jump / 0.65;
      if (k >= 1) s.jump = -1;
      else jumpY = Math.sin(k * Math.PI) * 0.85;
    } else if (s.prevT < 0.935 && t >= 0.935) {
      s.jump = 0;
    }
    s.prevT = t;
    _v1.copy(_p).add(_tan);
    r.position.set(_p.x, groundY + jumpY, _p.z);
    r.lookAt(_v1.x, groundY + jumpY, _v1.z);

    // ---- walk cycle ----
    const curveLen = getCurveLength();
    const speed = Math.abs(vel); // t units per second
    const targetBlend = THREE.MathUtils.clamp(speed / 0.015, 0, 1);
    s.blend += (targetBlend - s.blend) * (1 - Math.exp(-dt * 8));
    const blend = reducedMotion ? Math.min(s.blend, 0.6) : s.blend;

    const dist = speed * dt * curveLen;
    const dirSign = vel >= 0 ? 1 : -1;
    s.phase += dist * 3.4 * dirSign;

    const swing = Math.sin(s.phase);
    const swingB = Math.sin(s.phase + Math.PI);
    const legAmp = 0.72 * blend;
    const armAmp = 0.6 * blend;

    if (legL.current) legL.current.rotation.x = swing * legAmp;
    if (legR.current) legR.current.rotation.x = swingB * legAmp;

    // chapter-4 wave overrides the right arm near the beacon
    const waving = t > 0.56 && t < 0.64;
    if (armL.current) armL.current.rotation.x = swingB * armAmp + blend * 0.08;
    if (armR.current) {
      if (waving) {
        armR.current.rotation.x = 0.15;
        armR.current.rotation.z = -2.35 + Math.sin(time * 11) * 0.32;
      } else if (s.jump >= 0) {
        armR.current.rotation.z = -2.7;
        armR.current.rotation.x = -0.4;
        if (armL.current) {
          armL.current.rotation.z = 2.7;
          armL.current.rotation.x = -0.4;
        }
      } else {
        armR.current.rotation.x = swing * armAmp + blend * 0.08;
        armR.current.rotation.z = -0.12;
      }
      if (!waving && s.jump < 0 && armL.current) armL.current.rotation.z = 0.12;
    }

    // torso bob + lean + breathing
    const bob = Math.abs(Math.cos(s.phase)) * 0.075 * blend;
    if (hips.current) hips.current.position.y = bob;
    if (torso.current) {
      torso.current.rotation.x = blend * 0.07 * dirSign;
      s.breath += dt * (1 + blend * 0.6);
      const br = Math.sin(s.breath * 2.1) * 0.018 * (1 - blend * 0.5);
      torso.current.scale.set(1 + br * 0.6, 1 + br, 1 + br * 0.6);
    }
    // backpack bounce (slight lag)
    if (pack.current) {
      pack.current.position.y = packBaseY + Math.abs(Math.sin(s.phase - 0.6)) * 0.06 * blend;
      pack.current.rotation.x = Math.sin(s.phase - 0.6) * 0.06 * blend;
    }

    // ---- head: look toward the next landmark ----
    if (headG.current) {
      const nextIdx = Math.min(5, Math.floor(t * 6));
      const stn = stations[nextIdx];
      headG.current.getWorldPosition(_v2);
      // express in character-local space (root faces +z along tangent)
      _v3.copy(stn.pos).sub(_v2);
      r.worldToLocal(_v3);
      const local = _v3;
      const desiredYaw = THREE.MathUtils.clamp(Math.atan2(local.x, local.z), -0.65, 0.65);
      let desiredPitch = THREE.MathUtils.clamp(-Math.atan2(local.y, Math.hypot(local.x, local.z)), -0.5, 0.4);
      // chapter 5: tilt head up at the lighthouse
      if (t > 0.72 && t < 0.83) desiredPitch = -0.5;
      const k = 1 - Math.exp(-dt * 4);
      s.yaw += (desiredYaw - s.yaw) * k;
      s.pitch += (desiredPitch - s.pitch) * k;
      headG.current.rotation.y = s.yaw;
      headG.current.rotation.x = s.pitch + Math.sin(s.breath * 2.1 + 1) * 0.02;
    }

    // ---- footstep dust on stride zero-crossings ----
    if (!reducedMotion) {
      const crossed = s.prevSin <= 0 && swing > 0 ? 1 : s.prevSin >= 0 && swing < 0 ? -1 : 0;
      if (crossed !== 0 && blend > 0.35) {
        for (let n = 0; n < 2; n++) {
          const i = dust.cursor;
          dust.cursor = (dust.cursor + 1) % DUST_N;
          const i3 = i * 3;
          dust.geo.attributes.position.array[i3] = r.position.x + (Math.random() - 0.5) * 0.5;
          dust.geo.attributes.position.array[i3 + 1] = groundY + 0.08;
          dust.geo.attributes.position.array[i3 + 2] = r.position.z + (Math.random() - 0.5) * 0.5;
          dust.vel[i3] = (Math.random() - 0.5) * 0.7;
          dust.vel[i3 + 1] = 0.5 + Math.random() * 0.5;
          dust.vel[i3 + 2] = (Math.random() - 0.5) * 0.7;
          dust.life[i] = dust.maxLife[i] = 0.55 + Math.random() * 0.25;
          dust.geo.attributes.aSize.array[i] = 0.5 + Math.random() * 0.4;
        }
        dust.geo.attributes.position.needsUpdate = true;
        if (blend > 0.5) ambientAudio.footstep(blend);
      }
      s.prevSin = swing;
      // integrate dust
      const pa = dust.geo.attributes.position.array as Float32Array;
      const sa = dust.geo.attributes.aSize.array as Float32Array;
      const aa = dust.geo.attributes.aAlpha.array as Float32Array;
      let any = false;
      for (let i = 0; i < DUST_N; i++) {
        if (dust.life[i] <= 0) {
          if (aa[i] !== 0) { aa[i] = 0; any = true; }
          continue;
        }
        dust.life[i] -= dt;
        const i3 = i * 3;
        pa[i3] += dust.vel[i3] * dt;
        pa[i3 + 1] += dust.vel[i3 + 1] * dt;
        pa[i3 + 2] += dust.vel[i3 + 2] * dt;
        dust.vel[i3 + 1] *= 1 - dt * 1.4;
        const k = Math.max(dust.life[i] / dust.maxLife[i], 0);
        aa[i] = k * 0.65;
        sa[i] += dt * 1.1;
        any = true;
      }
      if (any) {
        dust.geo.attributes.position.needsUpdate = true;
        dust.geo.attributes.aSize.needsUpdate = true;
        dust.geo.attributes.aAlpha.needsUpdate = true;
      }
    }
  });

  const stickerMat = useMemo(() => {
    const m = toonEmissive("#0b0f14", "#67e8f9", 1.6);
    if (sticker) {
      m.map = sticker;
      m.emissiveMap = sticker;
      m.emissive = new THREE.Color("#9beaff");
    }
    return m;
  }, [sticker]);

  return (
    <group>
      <group ref={root}>
        {/* hips */}
        <group ref={hips}>
          {/* legs */}
          <group ref={legL} position={[-0.17, 0.92, 0]}>
            <ToonMesh geo={G.box(0.17, 0.72, 0.18)} color="#33415c" outline position={[0, -0.36, 0]} />
            <ToonMesh geo={G.box(0.19, 0.13, 0.32)} color="#e8e2d4" position={[0, -0.76, 0.05]} />
          </group>
          <group ref={legR} position={[0.17, 0.92, 0]}>
            <ToonMesh geo={G.box(0.17, 0.72, 0.18)} color="#33415c" outline position={[0, -0.36, 0]} />
            <ToonMesh geo={G.box(0.19, 0.13, 0.32)} color="#e8e2d4" position={[0, -0.76, 0.05]} />
          </group>
          {/* torso: hoodie */}
          <group ref={torso}>
            <ToonMesh geo={G.box(0.62, 0.72, 0.4)} color="#1f8a80" outline position={[0, 1.28, 0]} />
            {/* hoodie pocket */}
            <ToonMesh geo={G.box(0.4, 0.22, 0.06)} color="#17746c" position={[0, 1.02, 0.21]} />
            {/* hood resting behind neck */}
            <ToonMesh geo={G.sphere(0.24, 10, 8)} color="#17746c" outline position={[0, 1.62, -0.22]} scale={[1, 0.75, 0.7]} />
            {/* arms */}
            <group ref={armL} position={[-0.4, 1.55, 0]}>
              <ToonMesh geo={G.box(0.15, 0.58, 0.16)} color="#1f8a80" outline position={[0, -0.29, 0]} />
              <ToonMesh geo={G.sphere(0.09, 8, 8)} color="#c98d64" position={[0, -0.62, 0]} />
            </group>
            <group ref={armR} position={[0.4, 1.55, 0]}>
              <ToonMesh geo={G.box(0.15, 0.58, 0.16)} color="#1f8a80" outline position={[0, -0.29, 0]} />
              <ToonMesh geo={G.sphere(0.09, 8, 8)} color="#c98d64" position={[0, -0.62, 0]} />
            </group>
            {/* head */}
            <group ref={headG} position={[0, 1.86, 0]}>
              <ToonMesh geo={G.sphere(0.24, 14, 12)} color="#c98d64" outline />
              {/* hair cap */}
              <ToonMesh geo={G.sphere(0.25, 14, 12)} color="#2b2118" position={[0, 0.07, -0.03]} scale={[1, 0.82, 1]} />
              {/* eyes */}
              <ToonMesh geo={G.box(0.055, 0.07, 0.02)} color="#ffffff" position={[-0.09, 0.02, 0.225]} castShadow={false} />
              <ToonMesh geo={G.box(0.055, 0.07, 0.02)} color="#ffffff" position={[0.09, 0.02, 0.225]} castShadow={false} />
              <ToonMesh geo={G.box(0.025, 0.035, 0.015)} color="#1a1a1a" position={[-0.09, 0.02, 0.238]} castShadow={false} />
              <ToonMesh geo={G.box(0.025, 0.035, 0.015)} color="#1a1a1a" position={[0.09, 0.02, 0.238]} castShadow={false} />
            </group>
            {/* backpack */}
            <group ref={pack} position={[0, packBaseY, -0.32]}>
              <ToonMesh geo={G.box(0.46, 0.56, 0.26)} color="#e8a13c" outline />
              <ToonMesh geo={G.box(0.46, 0.14, 0.27)} color="#c77f22" position={[0, 0.22, 0]} />
              {/* glowing laptop sticker */}
              <mesh position={[0, 0.02, -0.135]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[0.3, 0.225]} />
                <primitive object={stickerMat} attach="material" />
              </mesh>
              {/* straps */}
              <ToonMesh geo={G.box(0.08, 0.5, 0.05)} color="#8a5a1e" position={[-0.14, 0.05, 0.16]} castShadow={false} />
              <ToonMesh geo={G.box(0.08, 0.5, 0.05)} color="#8a5a1e" position={[0.14, 0.05, 0.16]} castShadow={false} />
            </group>
          </group>
        </group>
      </group>
      {/* footstep dust */}
      {!reducedMotion && !isMobile ? (
        <points geometry={dust.geo} material={dust.mat} frustumCulled={false} />
      ) : null}
    </group>
  );
}
