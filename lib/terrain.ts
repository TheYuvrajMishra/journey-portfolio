import { pointAt, sideAt, _p, _side } from "./spline";

/** Half-width of the terrain ribbon. */
export const TERRAIN_HALF_WIDTH = 26;

/** Deterministic pseudo-noise from two coordinates (no allocation). */
export function noise2(x: number, z: number): number {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Terrain surface height at scroll t and lateral offset from the path.
 * The ribbon dips toward its edges so the world feels like a floating
 * island strip fading into fog. Must match Terrain.tsx geometry exactly.
 */
export function terrainHeight(t: number, lateral: number): number {
  pointAt(t, _p);
  sideAt(t, _side);
  const wx = _p.x + _side.x * lateral;
  const wz = _p.z + _side.z * lateral;
  const edge = Math.min(1, Math.abs(lateral) / TERRAIN_HALF_WIDTH);
  const dip = edge * edge * 7.0;
  const n =
    (noise2(wx * 0.15, wz * 0.15) - 0.5) * 1.6 * edge +
    (noise2(wx * 0.5, wz * 0.5) - 0.5) * 0.5;
  return _p.y - 0.3 - dip + n;
}
