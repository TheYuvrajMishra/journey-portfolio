"use client";

import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getStations } from "@/lib/stations";
import { scrollRef, useUI, localChapterT } from "@/lib/scrollStore";
import { PUFF_VERT, PUFF_FRAG } from "@/lib/shaders";

/* ------------------------------------------------------------------ */
/* layout                                                               */
/* ------------------------------------------------------------------ */

/** Positions children around the chapter's station anchor (origin = path point). */
export function ChapterRoot({ index, children }: { index: number; children: ReactNode }) {
  const st = getStations()[index];
  const { pos, quat } = stationFrame(index);
  void st;
  return (
    <group position={pos} quaternion={quat}>
      {children}
    </group>
  );
}

interface Frame {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
}
const _frames = new Map<number, Frame>();

/**
 * Station frame: origin at the path point, local +z = walking direction
 * (yaw only), local +x = right side. Cached per station.
 */
export function stationFrame(index: number): Frame {
  let f = _frames.get(index);
  if (!f) {
    const st = getStations()[index];
    const dir = st.dir.clone();
    dir.y = 0;
    dir.normalize();
    const m = new THREE.Matrix4().lookAt(dir, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));
    f = { pos: st.pos.clone(), quat: new THREE.Quaternion().setFromRotationMatrix(m) };
    _frames.set(index, f);
  }
  return f;
}

/** Convert station-local coords to world coords (for emitter registration). */
export function stationLocalToWorld(
  index: number,
  x: number,
  y: number,
  z: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const f = stationFrame(index);
  return out.set(x, y, z).applyQuaternion(f.quat).add(f.pos);
}

/** Approximate ground height (station-local) at a lateral offset. Sinks slightly. */
export function groundY(lateral: number): number {
  const e = Math.min(1, Math.abs(lateral) / 26);
  return -0.5 - e * e * 7;
}


/**
 * Per-frame callback with chapter-local progress (0 = entering, 1 = leaving).
 * Use for enter/exit timelines. No React state involved.
 */
export function useChapterFrame(
  index: number,
  span: number,
  fn: (lt: number, dt: number, time: number) => void,
): void {
  const fnRef = useRef(fn);
  const stationT = getStations()[index].t;
  useFrame(({ clock }, rawDt) => {
    fnRef.current = fn;
    fnRef.current(
      localChapterT(scrollRef.current.t, stationT, span),
      Math.min(rawDt, 0.05),
      clock.elapsedTime,
    );
  });
}

/** Gentle bobbing wrapper (disabled under reduced motion). */
export function Bob({
  amp = 0.15,
  speed = 1.6,
  phase = 0,
  children,
  position,
  rotation,
}: {
  amp?: number;
  speed?: number;
  phase?: number;
  children: ReactNode;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const ref = useRef<THREE.Group>(null);
  const { reducedMotion } = useUI();
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g || reducedMotion) return;
    g.position.y = Math.sin(clock.elapsedTime * speed + phase) * amp;
  });
  return (
    <group position={position} rotation={rotation}>
      <group ref={ref}>{children}</group>
    </group>
  );
}

/** Continuous Y spin (disabled under reduced motion). */
export function Spin({
  speed = 1,
  children,
  position,
}: {
  speed?: number;
  children: ReactNode;
  position?: [number, number, number];
}) {
  const ref = useRef<THREE.Group>(null);
  const { reducedMotion } = useUI();
  useFrame((_, rawDt) => {
    if (reducedMotion || !ref.current) return;
    ref.current.rotation.y += Math.min(rawDt, 0.05) * speed;
  });
  return (
    <group position={position}>
      <group ref={ref}>{children}</group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* interaction                                                          */
/* ------------------------------------------------------------------ */

/**
 * Hoverable prop: tooltip on hover, scale pop + wobble, pointer cursor,
 * optional click. ONE shared pattern for every interactive prop.
 */
export function Hoverable({
  tip,
  onClick,
  children,
  position,
  rotation,
}: {
  tip: string;
  onClick?: () => void;
  children: ReactNode;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const ref = useRef<THREE.Group>(null);
  const setTooltip = useUI((s) => s.setTooltip);
  const hov = useRef(0);
  const wob = useRef(0);

  useFrame((_, rawDt) => {
    const g = ref.current;
    if (!g) return;
    const dt = Math.min(rawDt, 0.05);
    const target = hov.current > 0.5 ? 1 : 0;
    hov.current += (target - hov.current) * (1 - Math.exp(-dt * 10));
    wob.current += dt;
    const s = 1 + hov.current * 0.14 + Math.sin(wob.current * 9) * 0.03 * hov.current;
    g.scale.setScalar(s);
  });

  return (
    <group position={position} rotation={rotation}>
      <group
        ref={ref}
        onPointerOver={(e) => {
          e.stopPropagation();
          hov.current = 1;
          const ne = e.nativeEvent as PointerEvent;
          setTooltip({ x: ne.clientX, y: ne.clientY, text: tip });
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          hov.current = 0;
          setTooltip(null);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          if (onClick) {
            e.stopPropagation();
            onClick();
          }
        }}
      >
        {children}
      </group>
    </group>
  );
}

/** Unique flickering emissive material (windows, lamps, fire). */
export function useFlickerMaterial(
  color: string,
  emissive: string,
  base = 1,
  amp = 0.35,
  speed = 7,
): THREE.MeshToonMaterial {
  const { reducedMotion } = useUI();
  const mat = useMemo(
    () =>
      new THREE.MeshToonMaterial({
        color,
        emissive,
        emissiveIntensity: base,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const seed = useMemo(() => Math.random() * 100, []);
  useFrame(({ clock }) => {
    if (reducedMotion) {
      mat.emissiveIntensity = base;
      return;
    }
    const t = clock.elapsedTime * speed + seed;
    mat.emissiveIntensity =
      base + (Math.sin(t) * 0.5 + Math.sin(t * 2.7 + 1.3) * 0.3 + Math.sin(t * 6.1) * 0.2) * amp;
  });
  return mat;
}

/* ------------------------------------------------------------------ */
/* canvas textures                                                      */
/* ------------------------------------------------------------------ */

export interface LabelOpts {
  text: string;
  sub?: string;
  w?: number;
  h?: number;
  bg?: string;
  fg?: string;
  subFg?: string;
  fontSize?: number;
  pad?: number;
}

/** Canvas texture with centered text (+ optional sub-line). */
export function makeLabelTexture(o: LabelOpts): THREE.CanvasTexture {
  const w = o.w ?? 512;
  const h = o.h ?? 256;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d")!;
  x.fillStyle = o.bg ?? "#f7ead7";
  x.fillRect(0, 0, w, h);
  x.textAlign = "center";
  x.textBaseline = "middle";
  const fs = o.fontSize ?? 64;
  x.fillStyle = o.fg ?? "#2a1d16";
  x.font = `800 ${fs}px "Bricolage Grotesk", Arial, sans-serif`;
  const cy = o.sub ? h / 2 - 24 : h / 2;
  // simple word-wrap
  const words = o.text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const wd of words) {
    const test = line ? `${line} ${wd}` : wd;
    if (x.measureText(test).width > w - (o.pad ?? 48) * 2 && line) {
      lines.push(line);
      line = wd;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const lh = fs * 1.12;
  const startY = cy - ((lines.length - 1) * lh) / 2;
  lines.forEach((ln, i) => x.fillText(ln, w / 2, startY + i * lh));
  if (o.sub) {
    x.font = `700 ${Math.round(fs * 0.42)}px "Space Mono", monospace`;
    x.fillStyle = o.subFg ?? "#7a4a2b";
    x.fillText(o.sub, w / 2, h / 2 + 56);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Vertical stripe texture (awnings, lighthouse bands). */
export function makeStripeTexture(c1: string, c2: string, stripes = 8): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const x = c.getContext("2d")!;
  const sw = 256 / stripes;
  for (let i = 0; i < stripes; i++) {
    x.fillStyle = i % 2 === 0 ? c1 : c2;
    x.fillRect(i * sw, 0, sw + 1, 64);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/* ------------------------------------------------------------------ */
/* water                                                                */
/* ------------------------------------------------------------------ */

const WATER_VERT = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;
  void main() {
    vUv = uv;
    vec3 p = position;
    float w = sin(uv.x * 24.0 + uTime * 2.2) * 0.5 + sin(uv.y * 18.0 - uTime * 1.7) * 0.5;
    p.z += w * 0.08;
    vWave = w;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const WATER_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  varying vec2 vUv;
  varying float vWave;
  void main() {
    float rip = sin(vUv.x * 60.0 + uTime * 3.0) * sin(vUv.y * 44.0 - uTime * 2.2);
    vec3 col = mix(uDeep, uShallow, 0.5 + vWave * 0.28 + rip * 0.12);
    float sparkle = smoothstep(0.965, 1.0, sin(vUv.x * 90.0 + uTime * 4.0) * sin(vUv.y * 70.0 - uTime * 3.0));
    col += vec3(1.0, 0.98, 0.9) * sparkle * 0.55;
    gl_FragColor = vec4(col, 0.94);
  }
`;

/** Animated cartoon water material. */
export function useWaterMaterial(deep = "#1f7a9e", shallow = "#5fc4dd"): THREE.ShaderMaterial {
  const { reducedMotion } = useUI();
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: WATER_VERT,
        fragmentShader: WATER_FRAG,
        transparent: true,
        uniforms: {
          uTime: { value: 0 },
          uDeep: { value: new THREE.Color(deep) },
          uShallow: { value: new THREE.Color(shallow) },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useFrame(({ clock }) => {
    if (!reducedMotion) mat.uniforms.uTime.value = clock.elapsedTime;
  });
  return mat;
}

/* ------------------------------------------------------------------ */
/* waving flag                                                          */
/* ------------------------------------------------------------------ */

/** Cloth flag waving in the wind (CPU wave on a segmented plane). */
export function WavingFlag({
  color,
  width = 1.6,
  height = 1,
  position,
}: {
  color: string;
  width?: number;
  height?: number;
  position?: [number, number, number];
}) {
  const ref = useRef<THREE.Mesh>(null);
  const { reducedMotion } = useUI();
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, height, 8, 1);
    g.translate(width / 2, 0, 0); // pivot at the pole edge
    return g;
  }, [width, height]);
  const base = useMemo(() => {
    const p = geo.attributes.position as THREE.BufferAttribute;
    return Float32Array.from(p.array as Float32Array);
  }, [geo]);

  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m || reducedMotion) return;
    const p = geo.attributes.position as THREE.BufferAttribute;
    const arr = p.array as Float32Array;
    const t = clock.elapsedTime * 6;
    for (let i = 0; i < p.count; i++) {
      const bx = base[i * 3];
      const k = bx / width; // 0 at pole → 1 at tip
      arr[i * 3 + 2] = Math.sin(t + k * 5) * 0.16 * k;
      arr[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.7 + k * 3) * 0.05 * k;
    }
    p.needsUpdate = true;
    geo.computeVertexNormals();
  });

  return (
    <mesh ref={ref} geometry={geo} position={position} castShadow>
      <meshToonMaterial color={color} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* confetti                                                             */
/* ------------------------------------------------------------------ */

export interface ConfettiApi {
  burst: () => void;
}

const CONFETTI_COLORS = ["#ff6b8a", "#ffd166", "#67e8f9", "#a3e635", "#c084fc", "#ffffff"];

/** One-shot instanced confetti burst. Call burst() via the api ref. */
export function ConfettiBurst({
  apiRef,
  count = 70,
}: {
  apiRef: RefObject<ConfettiApi | null>;
  count?: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { reducedMotion } = useUI();

  const sim = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const rot = new Float32Array(count * 2); // angle, angular vel
    const life = new Float32Array(count);
    const col = CONFETTI_COLORS.map((c) => new THREE.Color(c));
    return { pos, vel, rot, life, col, t: -1 };
  }, [count]);

  const geo = useMemo(() => new THREE.PlaneGeometry(0.16, 0.24), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    [],
  );

  useEffect(() => {
    apiRef.current = {
      burst: () => {
        if (reducedMotion) return;
        sim.t = 0;
        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          sim.pos[i3] = (Math.random() - 0.5) * 0.4;
          sim.pos[i3 + 1] = 0;
          sim.pos[i3 + 2] = (Math.random() - 0.5) * 0.4;
          const a = Math.random() * Math.PI * 2;
          const sp = 2.5 + Math.random() * 4;
          sim.vel[i3] = Math.cos(a) * sp;
          sim.vel[i3 + 1] = 4 + Math.random() * 4.5;
          sim.vel[i3 + 2] = Math.sin(a) * sp;
          sim.rot[i * 2] = Math.random() * Math.PI * 2;
          sim.rot[i * 2 + 1] = (Math.random() - 0.5) * 14;
          sim.life[i] = 1.4 + Math.random() * 0.6;
        }
      },
    };
  }, [apiRef, sim, count, reducedMotion]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  useFrame((_, rawDt) => {
    const im = meshRef.current;
    if (!im || sim.t < 0) return;
    const dt = Math.min(rawDt, 0.05);
    sim.t += dt;
    let alive = false;
    for (let i = 0; i < count; i++) {
      const k = 1 - sim.t / sim.life[i];
      const i3 = i * 3;
      if (k > 0) {
        alive = true;
        sim.vel[i3 + 1] -= 7.5 * dt;
        sim.vel[i3] *= 1 - dt * 0.9;
        sim.vel[i3 + 2] *= 1 - dt * 0.9;
        sim.pos[i3] += sim.vel[i3] * dt;
        sim.pos[i3 + 1] += sim.vel[i3 + 1] * dt;
        sim.pos[i3 + 2] += sim.vel[i3 + 2] * dt;
        sim.rot[i * 2] += sim.rot[i * 2 + 1] * dt;
        dummy.position.set(sim.pos[i3], sim.pos[i3 + 1], sim.pos[i3 + 2]);
        dummy.rotation.set(sim.rot[i * 2], sim.rot[i * 2] * 0.7, 0);
        const s = Math.min(1, k * 3);
        dummy.scale.setScalar(Math.max(s, 0.001));
      } else {
        dummy.position.set(0, -100, 0);
        dummy.scale.setScalar(0.001);
      }
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
      tmpColor.copy(sim.col[i % sim.col.length]);
      im.setColorAt(i, tmpColor);
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    if (!alive) sim.t = -1;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geo, mat, count]}
      frustumCulled={false}
    />
  );
}

/* ------------------------------------------------------------------ */
/* generic point puffs (reused by chapters for bespoke bursts)          */
/* ------------------------------------------------------------------ */

export interface PuffApi {
  puff: (x: number, y: number, z: number, n?: number) => void;
}

/** Small reusable puff pool (dust-like soft sprites). */
export function PuffPool({
  apiRef,
  count = 40,
  color = "#e8dcc2",
  size = 1,
}: {
  apiRef: RefObject<PuffApi | null>;
  count?: number;
  color?: string;
  size?: number;
}) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(count), 1));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(count), 1));
    return g;
  }, [count]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: PUFF_VERT,
        fragmentShader: PUFF_FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: { uColor: { value: new THREE.Color(color) } },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const sim = useMemo(
    () => ({
      vel: new Float32Array(count * 3),
      life: new Float32Array(count),
      max: new Float32Array(count),
      cursor: 0,
    }),
    [count],
  );
  const { reducedMotion } = useUI();

  useEffect(() => {
    apiRef.current = {
      puff: (x, y, z, n = 6) => {
        if (reducedMotion) return;
        const pa = geo.attributes.position.array as Float32Array;
        const sa = geo.attributes.aSize.array as Float32Array;
        for (let k = 0; k < n; k++) {
          const i = sim.cursor;
          sim.cursor = (sim.cursor + 1) % count;
          const i3 = i * 3;
          pa[i3] = x + (Math.random() - 0.5) * 0.5;
          pa[i3 + 1] = y;
          pa[i3 + 2] = z + (Math.random() - 0.5) * 0.5;
          sim.vel[i3] = (Math.random() - 0.5) * 1.2;
          sim.vel[i3 + 1] = 0.8 + Math.random() * 1.2;
          sim.vel[i3 + 2] = (Math.random() - 0.5) * 1.2;
          sim.life[i] = sim.max[i] = 0.7 + Math.random() * 0.5;
          sa[i] = size * (0.7 + Math.random() * 0.7);
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.aSize.needsUpdate = true;
      },
    };
  }, [apiRef, geo, sim, count, reducedMotion, size]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const pa = geo.attributes.position.array as Float32Array;
    const sa = geo.attributes.aSize.array as Float32Array;
    const aa = geo.attributes.aAlpha.array as Float32Array;
    let any = false;
    for (let i = 0; i < count; i++) {
      if (sim.life[i] <= 0) {
        if (aa[i] !== 0) {
          aa[i] = 0;
          any = true;
        }
        continue;
      }
      sim.life[i] -= dt;
      const i3 = i * 3;
      pa[i3] += sim.vel[i3] * dt;
      pa[i3 + 1] += sim.vel[i3 + 1] * dt;
      pa[i3 + 2] += sim.vel[i3 + 2] * dt;
      const k = Math.max(sim.life[i] / sim.max[i], 0);
      aa[i] = k * 0.7;
      sa[i] += dt * 1.4;
      any = true;
    }
    if (any) {
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aSize.needsUpdate = true;
      geo.attributes.aAlpha.needsUpdate = true;
    }
  });

  if (reducedMotion) return null;
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}
