import * as THREE from "three";

/**
 * Shared toon pipeline: one 4-step gradient map reused by every
 * MeshToonMaterial, plus a small material cache so we don't create
 * hundreds of duplicate materials. Material flags are part of the cache
 * key — never mutate a cached material after creation.
 */

let _gradientMap: THREE.DataTexture | null = null;

/** 4-step toon gradient map (NearestFilter — hard cel bands). */
export function getGradientMap(): THREE.DataTexture {
  if (!_gradientMap) {
    // 4 luminance steps: deep shadow, shadow, lit, highlight
    const data = new Uint8Array([90, 150, 210, 255]);
    const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    _gradientMap = tex;
  }
  return _gradientMap;
}

export interface ToonOpts {
  side?: THREE.Side;
  vertexColors?: boolean;
}

const _matCache = new Map<string, THREE.MeshToonMaterial>();

function keyOf(color: string | number, o: ToonOpts, extra = ""): string {
  return `${String(color)}|${o.side ?? "f"}|${o.vertexColors ? 1 : 0}|${extra}`;
}

/** Cached MeshToonMaterial — safe to call anywhere, even in render. */
export function toon(color: string | number, opts: ToonOpts = {}): THREE.MeshToonMaterial {
  const key = keyOf(color, opts);
  let m = _matCache.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial({
      color,
      gradientMap: getGradientMap(),
      side: opts.side ?? THREE.FrontSide,
      vertexColors: opts.vertexColors ?? false,
    });
    _matCache.set(key, m);
  }
  return m;
}

/** Emissive toon material (glowing screens, windows, stickers...). */
export function toonEmissive(
  color: string | number,
  emissive: string | number,
  intensity = 1,
  opts: ToonOpts = {},
): THREE.MeshToonMaterial {
  const key = keyOf(color, opts, `${emissive}|${intensity}`);
  let m = _matCache.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial({
      color,
      emissive,
      emissiveIntensity: intensity,
      gradientMap: getGradientMap(),
      side: opts.side ?? THREE.FrontSide,
      vertexColors: opts.vertexColors ?? false,
    });
    _matCache.set(key, m);
  }
  return m;
}

export const OUTLINE_COLOR = "#2a1d16";

/** Palette shared across the world — warm, saturated, cartoon. */
export const PALETTE = {
  grass: "#5da24a",
  grassDark: "#3f7a34",
  path: "#e8b04b",
  pathEdge: "#c98f33",
  dirt: "#8a5a33",
  wood: "#7a4a2b",
  woodDark: "#5d3820",
  brick: "#c96f4a",
  cream: "#f7ead7",
  roofRed: "#c0392b",
  taxiYellow: "#f5b301",
  water: "#3fa7c4",
  night: "#0d1420",
  ink: "#2a1d16",
} as const;
