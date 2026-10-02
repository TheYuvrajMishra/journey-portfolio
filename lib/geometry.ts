import * as THREE from "three";

/** Merge simple non-indexed/indexed geometries (position/normal/uv). */
export function mergeGeos(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let vCount = 0;
  let iCount = 0;
  for (const g of geos) {
    vCount += g.attributes.position.count;
    iCount += g.index ? g.index.count : g.attributes.position.count;
  }
  const pos = new Float32Array(vCount * 3);
  const nor = new Float32Array(vCount * 3);
  const uv = new Float32Array(vCount * 2);
  const idx = new Uint32Array(iCount);
  let vo = 0;
  let io = 0;
  for (const g of geos) {
    const p = g.attributes.position as THREE.BufferAttribute;
    const n = g.attributes.normal as THREE.BufferAttribute;
    const u = g.attributes.uv as THREE.BufferAttribute;
    pos.set(p.array as unknown as Float32Array, vo * 3);
    nor.set(n.array as unknown as Float32Array, vo * 3);
    if (u) uv.set(u.array as unknown as Float32Array, vo * 2);
    if (g.index) {
      const gi = g.index.array as unknown as Uint32Array;
      for (let k = 0; k < gi.length; k++) idx[io + k] = gi[k] + vo;
      io += gi.length;
    } else {
      for (let k = 0; k < p.count; k++) idx[io + k] = vo + k;
      io += p.count;
    }
    vo += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

/** Faceted (flat-normal) copy of a geometry — the low-poly cartoon look. */
const _facetCache = new Map<string, THREE.BufferGeometry>();
export function faceted(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  let g = _facetCache.get(geo.uuid);
  if (!g) {
    g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.computeVertexNormals();
    _facetCache.set(geo.uuid, g);
  }
  return g;
}

const _geoCache = new Map<string, THREE.BufferGeometry>();

function cached(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = _geoCache.get(key);
  if (!g) {
    g = make();
    _geoCache.set(key, g);
  }
  return g;
}

/** Shared primitive geometries (cached, never dispose). */
export const G = {
  box: (w = 1, h = 1, d = 1) =>
    cached(`box:${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)),
  sphere: (r = 0.5, w = 12, h = 10) =>
    cached(`sph:${r},${w},${h}`, () => new THREE.SphereGeometry(r, w, h)),
  cyl: (rt = 0.5, rb = 0.5, h = 1, s = 10) =>
    cached(`cyl:${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s)),
  cone: (r = 0.5, h = 1, s = 10) =>
    cached(`cone:${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s)),
  plane: (w = 1, h = 1) =>
    cached(`plane:${w},${h}`, () => new THREE.PlaneGeometry(w, h)),
  torus: (r = 0.5, t = 0.15, rs = 8, ts = 16) =>
    cached(`torus:${r},${t},${rs},${ts}`, () => new THREE.TorusGeometry(r, t, rs, ts)),
  ico: (r = 0.5, d = 0) =>
    cached(`ico:${r},${d}`, () => new THREE.IcosahedronGeometry(r, d)),
};
