import { useMemo } from "react";
import * as THREE from "three";
import { pointAt, sideAt, _p, _side } from "@/lib/spline";
import { terrainHeight } from "@/lib/terrain";
import { toon, PALETTE } from "@/lib/toonMaterial";

const SEGMENTS = 500;
const PATH_HALF = 1.7;
const EDGE_W = 0.35;

/** Build a ribbon strip along the curve at a lateral offset range. */
function ribbonGeo(inner: number, outer: number, lift: number): THREE.BufferGeometry {
  const verts: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    pointAt(t, _p);
    sideAt(t, _side);
    const base = i * 2;
    for (const lat of [inner, outer]) {
      const x = _p.x + _side.x * lat;
      const z = _p.z + _side.z * lat;
      const y = terrainHeight(t, lat) + lift;
      verts.push(x, y, z);
    }
    if (i < SEGMENTS) idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** The walking path: warm ribbon with darker edge borders. */
export function Path() {
  const { main, edgeL, edgeR } = useMemo(
    () => ({
      main: ribbonGeo(-PATH_HALF, PATH_HALF, 0.07),
      edgeL: ribbonGeo(-PATH_HALF - EDGE_W, -PATH_HALF, 0.05),
      edgeR: ribbonGeo(PATH_HALF, PATH_HALF + EDGE_W, 0.05),
    }),
    [],
  );
  const mainMat = useMemo(() => toon(PALETTE.path), []);
  const edgeMat = useMemo(() => toon(PALETTE.pathEdge), []);
  return (
    <group>
      <mesh geometry={main} material={mainMat} receiveShadow />
      <mesh geometry={edgeL} material={edgeMat} receiveShadow />
      <mesh geometry={edgeR} material={edgeMat} receiveShadow />
    </group>
  );
}

/** Y of the path surface at scroll t (for placing the character's feet). */
export function pathY(t: number): number {
  return terrainHeight(t, 0) + 0.07;
}
