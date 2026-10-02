import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { scrollRef, useUI } from "@/lib/scrollStore";
import { pointAt, tangentAt, sideAt, _p, _tan, _side } from "@/lib/spline";

/** Normalized cursor position (-1..1), updated by a window listener. */
export const cursor = { x: 0, y: 0, tx: 0, ty: 0 };

if (typeof window !== "undefined") {
  window.addEventListener("pointermove", (e) => {
    cursor.tx = (e.clientX / window.innerWidth) * 2 - 1;
    cursor.ty = -((e.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });
}

const _desired = new THREE.Vector3();
const _look = new THREE.Vector3();
const _smoothLook = new THREE.Vector3();
const _tmp = new THREE.Vector3();
let _init = false;

/**
 * Third-person follow rig: trails the character with a slight lead along the
 * tangent, gentle vertical bob, and lerped cursor parallax. Reduced-motion
 * gets a fixed offset; mobile a tighter, calmer framing.
 */
export function CameraRig() {
  const { camera } = useThree();
  const { reducedMotion, isMobile } = useUI();
  const dist = useMemo(() => (isMobile ? 7.2 : 8.6), [isMobile]);
  const height = useMemo(() => (isMobile ? 3.9 : 4.6), [isMobile]);
  const lead = useMemo(() => (isMobile ? 3.0 : 3.8), [isMobile]);
  const side = useRef(0);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = scrollRef.current.t;
    const time = clock.elapsedTime;

    pointAt(t, _p);
    tangentAt(t, _tan);
    sideAt(t, _side);

    // look target: character + lead along tangent + eye height
    _look.copy(_p).addScaledVector(_tan, lead);
    _look.y += 1.9;

    // camera: behind + above + slight side offset
    _desired.copy(_p).addScaledVector(_tan, -dist);
    _desired.y += height;
    _desired.addScaledVector(_side, 2.1);

    if (!reducedMotion) {
      // gentle bob
      _desired.y += Math.sin(time * 1.25) * 0.14;
      // cursor parallax (heavily smoothed)
      const k = 1 - Math.exp(-dt * 2.2);
      cursor.x += (cursor.tx - cursor.x) * k;
      cursor.y += (cursor.ty - cursor.y) * k;
      _desired.addScaledVector(_side, cursor.x * 1.4);
      _desired.y += cursor.y * 0.8;
      // subtle roll toward the turn
      side.current = THREE.MathUtils.lerp(side.current, cursor.x * 0.02, k);
    } else {
      side.current = 0;
    }

    const pk = 1 - Math.exp(-dt * 3.2);
    const lk = 1 - Math.exp(-dt * 4.2);
    if (!_init) {
      camera.position.copy(_desired);
      _smoothLook.copy(_look);
      _init = true;
    } else {
      camera.position.lerp(_desired, pk);
      _smoothLook.lerp(_look, lk);
    }
    _tmp.copy(_smoothLook);
    camera.lookAt(_tmp);
    camera.rotation.z += side.current;
  });

  return null;
}
