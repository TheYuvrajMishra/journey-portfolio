import * as THREE from "three";

/**
 * Day-night grading: t 0→1 maps dawn → morning → day → dusk → night.
 * `sampleDayNight` writes every value into the reusable `DayNight` object —
 * call it once per frame from the Sky rig, never allocate.
 */

export interface DayNight {
  skyTop: THREE.Color;
  skyMid: THREE.Color;
  skyBottom: THREE.Color;
  fog: THREE.Color;
  fogDensity: number;
  sunColor: THREE.Color;
  sunIntensity: number;
  sunDir: THREE.Vector3;
  moonIntensity: number;
  moonDir: THREE.Vector3;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  starOpacity: number;
  ambient: number;
}

export const dayNight: DayNight = {
  skyTop: new THREE.Color(),
  skyMid: new THREE.Color(),
  skyBottom: new THREE.Color(),
  fog: new THREE.Color(),
  fogDensity: 0.004,
  sunColor: new THREE.Color(),
  sunIntensity: 1,
  sunDir: new THREE.Vector3(),
  moonIntensity: 0,
  moonDir: new THREE.Vector3(),
  hemiSky: new THREE.Color(),
  hemiGround: new THREE.Color(),
  hemiIntensity: 0.5,
  starOpacity: 0,
  ambient: 0.25,
};

interface Stop {
  t: number;
  top: string;
  mid: string;
  bottom: string;
  fog: string;
  sun: string;
  sunI: number;
  sunElev: number; // degrees above horizon
  sunAzim: number; // degrees around
  hemiI: number;
  hemiSky: string;
  hemiGround: string;
  stars: number;
  moon: number;
  fogD: number;
  ambient: number;
}

const STOPS: Stop[] = [
  {
    // dawn — warm pink, low sun
    t: 0.0, top: "#7fb2e5", mid: "#f7c873", bottom: "#e8956b",
    fog: "#f2c186", sun: "#ffd9a0", sunI: 1.15, sunElev: 9, sunAzim: 115,
    hemiI: 0.55, hemiSky: "#ffd9b0", hemiGround: "#7a5a44", stars: 0.06, moon: 0.0,
    fogD: 0.0052, ambient: 0.3,
  },
  {
    // morning — fresh blue
    t: 0.22, top: "#4f9be0", mid: "#a8d4f0", bottom: "#e8d9b8",
    fog: "#cfe0ea", sun: "#fff3d6", sunI: 1.6, sunElev: 38, sunAzim: 95,
    hemiI: 0.75, hemiSky: "#bcd9f2", hemiGround: "#6f7a55", stars: 0, moon: 0,
    fogD: 0.0038, ambient: 0.38,
  },
  {
    // midday — saturated cartoon blue
    t: 0.45, top: "#3d8fe0", mid: "#9fd0f2", bottom: "#f2e3c2",
    fog: "#cfe3ef", sun: "#fff8e8", sunI: 1.85, sunElev: 62, sunAzim: 70,
    hemiI: 0.85, hemiSky: "#c4e0f5", hemiGround: "#75805c", stars: 0, moon: 0,
    fogD: 0.0032, ambient: 0.42,
  },
  {
    // golden afternoon
    t: 0.62, top: "#5a8fd0", mid: "#f0b46a", bottom: "#e08a5a",
    fog: "#eec088", sun: "#ffcf90", sunI: 1.5, sunElev: 30, sunAzim: 40,
    hemiI: 0.7, hemiSky: "#f2c890", hemiGround: "#6e5a48", stars: 0, moon: 0,
    fogD: 0.0042, ambient: 0.36,
  },
  {
    // dusk — purple embers
    t: 0.78, top: "#3a3f7a", mid: "#c65f7e", bottom: "#e8935c",
    fog: "#9a6a86", sun: "#ff9a5c", sunI: 0.85, sunElev: 7, sunAzim: 15,
    hemiI: 0.5, hemiSky: "#8a5f8a", hemiGround: "#4a3a44", stars: 0.35, moon: 0.15,
    fogD: 0.005, ambient: 0.28,
  },
  {
    // night — deep blue, moon up
    t: 1.0, top: "#060a18", mid: "#101a38", bottom: "#1c2a4e",
    fog: "#0d1626", sun: "#8fb0ff", sunI: 0.12, sunElev: -20, sunAzim: -30,
    hemiI: 0.32, hemiSky: "#2a3a66", hemiGround: "#141a28", stars: 1, moon: 1,
    fogD: 0.006, ambient: 0.18,
  },
];

const _ca = new THREE.Color();
const _cb = new THREE.Color();

function mixInto(out: THREE.Color, a: string, b: string, k: number): void {
  _ca.set(a);
  _cb.set(b);
  out.copy(_ca).lerp(_cb, k);
}

/** Sample the day-night gradient at t; writes into the shared `dayNight`. */
export function sampleDayNight(t: number): DayNight {
  const tt = THREE.MathUtils.clamp(t, 0, 1);
  let i = 0;
  while (i < STOPS.length - 2 && tt > STOPS[i + 1].t) i++;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const k = THREE.MathUtils.smoothstep(tt, a.t, b.t);

  const d = dayNight;
  mixInto(d.skyTop, a.top, b.top, k);
  mixInto(d.skyMid, a.mid, b.mid, k);
  mixInto(d.skyBottom, a.bottom, b.bottom, k);
  mixInto(d.fog, a.fog, b.fog, k);
  mixInto(d.sunColor, a.sun, b.sun, k);
  mixInto(d.hemiSky, a.hemiSky, b.hemiSky, k);
  mixInto(d.hemiGround, a.hemiGround, b.hemiGround, k);

  d.sunIntensity = THREE.MathUtils.lerp(a.sunI, b.sunI, k);
  d.hemiIntensity = THREE.MathUtils.lerp(a.hemiI, b.hemiI, k);
  d.starOpacity = THREE.MathUtils.lerp(a.stars, b.stars, k);
  d.moonIntensity = THREE.MathUtils.lerp(a.moon, b.moon, k);
  d.fogDensity = THREE.MathUtils.lerp(a.fogD, b.fogD, k);
  d.ambient = THREE.MathUtils.lerp(a.ambient, b.ambient, k);

  const elev = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(a.sunElev, b.sunElev, k));
  const azim = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(a.sunAzim, b.sunAzim, k));
  d.sunDir.set(Math.cos(elev) * Math.sin(azim), Math.sin(elev), Math.cos(elev) * Math.cos(azim)).normalize();
  // moon roughly opposite the sun's path
  d.moonDir.set(-d.sunDir.x, Math.max(0.25, -d.sunDir.y + 0.55), -d.sunDir.z).normalize();

  return d;
}
