import * as THREE from "three";

/** Named world-space emitter points (chimney smoke, chai steam, embers...). */
const _emitters = new Map<string, THREE.Vector3[]>();

/** Register a static emitter position (call once per chapter, e.g. in useMemo). */
export function addEmitter(id: string, pos: THREE.Vector3): void {
  let arr = _emitters.get(id);
  if (!arr) {
    arr = [];
    _emitters.set(id, arr);
  }
  arr.push(pos.clone());
}

export function getEmitters(id: string): THREE.Vector3[] {
  return _emitters.get(id) ?? [];
}
