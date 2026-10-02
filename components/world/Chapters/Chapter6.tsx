"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { links, type ContactLink } from "@/lib/content";
import { useUI } from "@/lib/scrollStore";
import { addEmitter } from "@/lib/emitters";
import { G } from "@/lib/geometry";
import { ToonMesh } from "../ToonMesh";
import {
  ChapterRoot,
  Bob,
  Hoverable,
  WavingFlag,
  groundY,
  makeLabelTexture,
  stationLocalToWorld,
  useFlickerMaterial,
} from "../chapterKit";

/* ------------------------------------------------------------------ */
/* config (module scope — stable references, no per-render churn)        */
/* ------------------------------------------------------------------ */

const POSTS: { x: number; z: number }[] = [
  { x: -4.5, z: -4 },
  { x: -1.5, z: -5.5 },
  { x: 1.5, z: -5.5 },
  { x: 4.5, z: -4 },
];

/* ------------------------------------------------------------------ */
/* campfire                                                             */
/* ------------------------------------------------------------------ */

function FirePit() {
  const { reducedMotion } = useUI((s) => s);
  const fireRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const f = fireRef.current;
    if (f && !reducedMotion) {
      f.scale.set(
        1 - Math.sin(t * 13) * 0.06,
        1 + Math.sin(t * 13) * 0.14 + Math.sin(t * 29) * 0.06,
        1 - Math.sin(t * 13) * 0.06,
      );
    }
    const l = lightRef.current;
    if (l) {
      l.intensity = reducedMotion
        ? 6
        : 6 + (Math.sin(t * 11) * 0.5 + Math.sin(t * 23 + 1) * 0.3 + Math.sin(t * 5) * 0.2) * 2;
    }
  });

  return (
    <group position={[0, groundY(0), 0]}>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <ToonMesh
            key={i}
            geo={G.sphere(0.28, 8, 6)}
            color="#6b7280"
            flat
            position={[Math.cos(a) * 1.1, 0.1, Math.sin(a) * 1.1]}
          />
        );
      })}
      {[0, 1, 2].map((i) => (
        <group key={i} rotation={[0, (i * Math.PI * 2) / 3, 0]}>
          <ToonMesh
            geo={G.cyl(0.16, 0.16, 1.6, 8)}
            color="#7a4a2b"
            position={[0, 0.35, 0]}
            rotation={[0, 0, i % 2 === 0 ? 0.5 : -0.5]}
          />
        </group>
      ))}
      <group ref={fireRef}>
        <ToonMesh
          geo={G.cone(0.55, 1.4, 10)}
          color="#7a2d12"
          emissive="#ff7a1a"
          emissiveIntensity={2.4}
          position={[0, 0.7, 0]}
          castShadow={false}
        />
        <ToonMesh
          geo={G.cone(0.3, 0.9, 10)}
          color="#7a4a12"
          emissive="#ffd166"
          emissiveIntensity={3.2}
          position={[0, 0.45, 0]}
          castShadow={false}
        />
      </group>
      <pointLight
        ref={lightRef}
        color="#ff9a3c"
        intensity={6}
        distance={20}
        position={[0, 1.5, 0]}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* log bench                                                            */
/* ------------------------------------------------------------------ */

function Bench() {
  return (
    <group position={[-3, groundY(-3), 2.5]} rotation={[0, 0.5, 0]}>
      <ToonMesh
        geo={G.cyl(0.3, 0.3, 2.4, 10)}
        color="#7a4a2b"
        position={[0, 0.45, 0]}
        rotation={[0, 0, Math.PI / 2]}
      />
      <ToonMesh geo={G.box(0.4, 0.45, 0.5)} color="#5d3820" position={[-0.8, 0.225, 0]} />
      <ToonMesh geo={G.box(0.4, 0.45, 0.5)} color="#5d3820" position={[0.8, 0.225, 0]} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* flag                                                                 */
/* ------------------------------------------------------------------ */

function Flag() {
  return (
    <group position={[3.5, groundY(3.5), -2]}>
      <ToonMesh geo={G.cyl(0.07, 0.09, 4.6, 8)} color="#5d3820" position={[0, 2.3, 0]} />
      <WavingFlag color="#e4572e" width={1.7} position={[0, 4.2, 0]} />
      <ToonMesh
        geo={G.sphere(0.12, 10, 8)}
        color="#3a2c1c"
        emissive="#ffd166"
        emissiveIntensity={2}
        position={[0, 4.62, 0]}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* lantern signpost                                                     */
/* ------------------------------------------------------------------ */

function Signpost({ link, x, z }: { link: ContactLink; x: number; z: number }) {
  const lanternMat = useFlickerMaterial("#3a2c1c", "#ffca7a", 1.6, 0.5);
  const labelTex = useMemo(
    () =>
      makeLabelTexture({
        text: link.label,
        sub: link.hint,
        fontSize: 56,
        w: 512,
        h: 170,
      }),
    [link],
  );
  const labelMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: labelTex, side: THREE.DoubleSide }),
    [labelTex],
  );

  return (
    <group position={[x, groundY(x), z]}>
      <ToonMesh geo={G.cyl(0.08, 0.1, 3, 8)} color="#5d3820" position={[0, 1.5, 0]} />
      <ToonMesh geo={G.box(0.9, 0.12, 0.12)} color="#5d3820" position={[0.4, 2.8, 0]} />
      <mesh geometry={G.plane(1.5, 0.5)} material={labelMat} position={[0, 1.85, 0.12]} />
      <Bob amp={0.08} position={[0.8, 0, 0]}>
        <Hoverable tip={link.hint} onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}>
          <mesh geometry={G.box(0.42, 0.42, 0.42)} material={lanternMat} position={[0, 2.42, 0]} />
          <ToonMesh geo={G.cone(0.3, 0.22, 8)} color="#2a1d16" position={[0, 2.72, 0]} />
        </Hoverable>
      </Bob>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* chapter                                                              */
/* ------------------------------------------------------------------ */

export function Chapter6() {
  useMemo(() => {
    addEmitter("campfire", stationLocalToWorld(5, 0, 1.2, 0, new THREE.Vector3()));
    addEmitter("fireflies", stationLocalToWorld(5, 0, 2.5, 0, new THREE.Vector3()));
  }, []);

  return (
    <ChapterRoot index={5}>
      <FirePit />
      <Bench />
      <Flag />
      {links.map((link, i) => (
        <Signpost key={link.label} link={link} x={POSTS[i].x} z={POSTS[i].z} />
      ))}
    </ChapterRoot>
  );
}
