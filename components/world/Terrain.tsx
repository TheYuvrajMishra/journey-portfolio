import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { pointAt, sideAt, _p, _side } from "@/lib/spline";
import { terrainHeight, noise2, TERRAIN_HALF_WIDTH } from "@/lib/terrain";
import { toon, PALETTE } from "@/lib/toonMaterial";
import { addWindSway } from "@/lib/shaders";
import { mergeGeos } from "@/lib/geometry";
import { useUI } from "@/lib/scrollStore";

const SEGMENTS = 420;

/** Winding terrain ribbon following the spline, with vertex-color variation. */
function Ground() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1, SEGMENTS, 10);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const cA = new THREE.Color(PALETTE.grass);
    const cB = new THREE.Color(PALETTE.grassDark);
    const c = new THREE.Color();
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      // plane local: x in [-0.5, 0.5] across, y in [-0.5, 0.5] along
      const ix = pos.getX(i);
      const iy = pos.getY(i);
      const t = iy + 0.5;
      const lateral = ix * TERRAIN_HALF_WIDTH * 2;
      pointAt(t, _p);
      sideAt(t, _side);
      const y = terrainHeight(t, lateral);
      v.set(
        _p.x + _side.x * lateral,
        y,
        _p.z + _side.z * lateral,
      );
      pos.setXYZ(i, v.x, v.y, v.z);
      const n = noise2(v.x * 0.35, v.z * 0.35);
      c.copy(cA).lerp(cB, n * 0.85);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);

  const mat = useMemo(() => toon("#ffffff", { vertexColors: true }), []);

  return <mesh geometry={geo} material={mat} receiveShadow />;
}

/** Instanced grass tufts with wind sway. Scattered near (not on) the path. */
function Grass() {
  const { isMobile } = useUI();
  const COUNT = isMobile ? 900 : 2600;
  const ref = useRef<THREE.InstancedMesh>(null);

  const { geo, mat } = useMemo(() => {
    // crossed-quad tuft: two planes rotated 90°, pivot at bottom
    const p1 = new THREE.PlaneGeometry(0.55, 0.75);
    p1.translate(0, 0.375, 0);
    const p2 = p1.clone();
    p2.rotateY(Math.PI / 2);
    const merged = mergeGeos([p1, p2]);
    const m = toon("#69b455", { side: THREE.DoubleSide });
    addWindSway(m, 0.09, 1.9);
    return { geo: merged, mat: m };
  }, []);

  useLayoutEffect(() => {
    const im = ref.current;
    if (!im) return;
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      const t = Math.random();
      const lateral = (Math.random() < 0.5 ? -1 : 1) * (2.6 + Math.random() * 17);
      pointAt(t, _p);
      sideAt(t, _side);
      dummy.position.set(
        _p.x + _side.x * lateral,
        terrainHeight(t, lateral),
        _p.z + _side.z * lateral,
      );
      dummy.rotation.y = Math.random() * Math.PI;
      const s = 0.7 + Math.random() * 0.9;
      dummy.scale.set(s, s * (0.8 + Math.random() * 0.6), s);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
      col.setHSL(0.29 + Math.random() * 0.05, 0.55, 0.32 + Math.random() * 0.14);
      im.setColorAt(i, col);
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }, [COUNT]);

  return (
    <instancedMesh
      ref={ref}
      args={[geo, mat, COUNT]}
      frustumCulled={false}
      castShadow={false}
      receiveShadow
    />
  );
}

/** Instanced low-poly trees (trunk + canopy as two instanced meshes). */
function Trees() {
  const { isMobile } = useUI();
  const COUNT = isMobile ? 40 : 110;
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const canopyRef = useRef<THREE.InstancedMesh>(null);

  const { trunkGeo, canopyGeo, trunkMat, canopyMat } = useMemo(() => {
    const tg = new THREE.CylinderGeometry(0.16, 0.24, 1.4, 6);
    tg.translate(0, 0.7, 0);
    const cg = new THREE.IcosahedronGeometry(1.15, 0);
    cg.translate(0, 2.1, 0);
    const tm = toon(PALETTE.woodDark);
    const cm = toon("#4d8f3e");
    addWindSway(cm, 0.05, 1.1);
    return { trunkGeo: tg, canopyGeo: cg, trunkMat: tm, canopyMat: cm };
  }, []);

  useLayoutEffect(() => {
    const trunks = trunkRef.current;
    const canopies = canopyRef.current;
    if (!trunks || !canopies) return;
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      const t = Math.random();
      const lateral = (Math.random() < 0.5 ? -1 : 1) * (7 + Math.random() * 15);
      pointAt(t, _p);
      sideAt(t, _side);
      const x = _p.x + _side.x * lateral;
      const z = _p.z + _side.z * lateral;
      const y = terrainHeight(t, lateral);
      const s = 0.8 + Math.random() * 1.3;
      dummy.position.set(x, y - 0.1, z);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      canopies.setMatrixAt(i, dummy.matrix);
      col.setHSL(0.3 + Math.random() * 0.06, 0.5, 0.3 + Math.random() * 0.12);
      canopies.setColorAt(i, col);
    }
    trunks.instanceMatrix.needsUpdate = true;
    canopies.instanceMatrix.needsUpdate = true;
    if (canopies.instanceColor) canopies.instanceColor.needsUpdate = true;
  }, [COUNT]);

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[trunkGeo, trunkMat, COUNT]} frustumCulled={false} castShadow />
      <instancedMesh ref={canopyRef} args={[canopyGeo, canopyMat, COUNT]} frustumCulled={false} castShadow />
    </group>
  );
}

/** Scattered instanced flowers for color pops. */
function Flowers() {
  const { isMobile } = useUI();
  const COUNT = isMobile ? 120 : 420;
  const ref = useRef<THREE.InstancedMesh>(null);

  const { geo, mat } = useMemo(() => {
    const stem = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 5);
    stem.translate(0, 0.175, 0);
    const head = new THREE.IcosahedronGeometry(0.09, 0);
    head.translate(0, 0.4, 0);
    return { geo: mergeGeos([stem, head]), mat: toon("#ffffff") };
  }, []);

  const petalColors = useMemo(
    () => ["#ff6b8a", "#ffd166", "#f7f7f7", "#c084fc", "#ff8c42"].map((c) => new THREE.Color(c)),
    [],
  );

  useLayoutEffect(() => {
    const im = ref.current;
    if (!im) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < COUNT; i++) {
      const t = Math.random();
      const lateral = (Math.random() < 0.5 ? -1 : 1) * (2.2 + Math.random() * 12);
      pointAt(t, _p);
      sideAt(t, _side);
      dummy.position.set(
        _p.x + _side.x * lateral,
        terrainHeight(t, lateral),
        _p.z + _side.z * lateral,
      );
      dummy.rotation.y = Math.random() * Math.PI;
      const s = 0.8 + Math.random() * 0.8;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
      im.setColorAt(i, petalColors[i % petalColors.length]);
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }, [COUNT, petalColors]);

  return <instancedMesh ref={ref} args={[geo, mat, COUNT]} frustumCulled={false} castShadow={false} />;
}

export function Terrain() {
  return (
    <group>
      <Ground />
      <Grass />
      <Trees />
      <Flowers />
    </group>
  );
}
