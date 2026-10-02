import * as THREE from "three";

/**
 * The world path: one CatmullRomCurve3 winding through all 6 chapter
 * stations. Weaves in X, progresses in -Z, gentle Y variation so the
 * camera ride has rhythm (valleys, rises, final hilltop).
 *
 * Chapters sit near t = 0.06 / 0.24 / 0.42 / 0.60 / 0.78 / 0.94.
 */

const CONTROL: [number, number, number][] = [
  [0, 0, 6],
  [-7, 0.4, -6],
  [6, 0, -18],
  [13, 1.2, -32],
  [2, 0.6, -46],
  [-11, 0, -60],
  [-14, 1.6, -76],
  [-3, 1.0, -90],
  [9, 0.2, -102],
  [14, 1.4, -116],
  [4, 2.2, -130],
  [-8, 3.0, -144],
  [-4, 4.2, -158],
  [3, 5.5, -172],
  [0, 7.0, -186],
];

let _curve: THREE.CatmullRomCurve3 | null = null;

/** Lazily-built singleton curve (built once, reused every frame). */
export function getCurve(): THREE.CatmullRomCurve3 {
  if (!_curve) {
    const pts = CONTROL.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    _curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.6);
    _curve.arcLengthDivisions = 600;
  }
  return _curve;
}

/** Total arc length, cached. */
export function getCurveLength(): number {
  return getCurve().getLength();
}

// ---- scratch objects: NEVER allocate in the frame loop, reuse these ----
export const _p = new THREE.Vector3();
export const _p2 = new THREE.Vector3();
export const _tan = new THREE.Vector3();
export const _side = new THREE.Vector3();
export const _up = new THREE.Vector3(0, 1, 0);
export const _c = new THREE.Color();
export const _c2 = new THREE.Color();

/** Point on the curve at t (0..1), written into `out`. */
export function pointAt(t: number, out: THREE.Vector3): THREE.Vector3 {
  return getCurve().getPointAt(THREE.MathUtils.clamp(t, 0, 1), out);
}

/** Tangent on the curve at t (0..1), written into `out`. */
export function tangentAt(t: number, out: THREE.Vector3): THREE.Vector3 {
  return getCurve().getTangentAt(THREE.MathUtils.clamp(t, 0, 1), out);
}

/** Horizontal side vector (perpendicular to tangent in XZ), into `out`. */
export function sideAt(t: number, out: THREE.Vector3): THREE.Vector3 {
  tangentAt(t, _tan);
  out.crossVectors(_tan, _up).normalize();
  // keep it horizontal even on slopes
  out.y = 0;
  return out.normalize();
}
