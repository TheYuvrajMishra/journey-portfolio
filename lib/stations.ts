import * as THREE from "three";
import { pointAt, tangentAt, sideAt } from "./spline";

export interface Station {
  /** chapter index 0..5 */
  index: number;
  /** scroll t at the station heart */
  t: number;
  /** world position of the station anchor */
  pos: THREE.Vector3;
  /** walking direction at the station */
  dir: THREE.Vector3;
  /** horizontal side vector at the station */
  side: THREE.Vector3;
  /** half-extent of the chapter's prop field */
  radius: number;
}

export const STATION_T = [0.055, 0.235, 0.415, 0.595, 0.775, 0.945];

let _stations: Station[] | null = null;

/** Precomputed station anchors (built once at module init). */
export function getStations(): Station[] {
  if (!_stations) {
    _stations = STATION_T.map((t, index) => {
      const pos = pointAt(t, new THREE.Vector3());
      const dir = tangentAt(t, new THREE.Vector3());
      const side = sideAt(t, new THREE.Vector3());
      return { index, t, pos, dir, side, radius: 16 };
    });
  }
  return _stations;
}

/** Anchor point offset from a station: forward/back along dir, sideways. */
export function stationOffset(
  station: Station,
  forward: number,
  lateral: number,
  up: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  out
    .copy(station.pos)
    .addScaledVector(station.dir, forward)
    .addScaledVector(station.side, lateral);
  out.y += up;
  return out;
}
