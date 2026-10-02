import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { scrollRef, useUI } from "@/lib/scrollStore";
import { sampleDayNight } from "@/lib/daynight";
import { pointAt, _p } from "@/lib/spline";
import { SKY_VERT, SKY_FRAG, STAR_VERT, STAR_FRAG } from "@/lib/shaders";

const STAR_COUNT = 420;

/** Sky dome, stars, sun/moon lights, fog — all graded by scroll t. */
export function SkyRig() {
  const { scene } = useThree();
  const { reducedMotion } = useUI();

  const sunRef = useRef<THREE.DirectionalLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const ambRef = useRef<THREE.AmbientLight>(null);

  const skyMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: new THREE.Color() },
          uMid: { value: new THREE.Color() },
          uBottom: { value: new THREE.Color() },
          uSunDir: { value: new THREE.Vector3(0, 1, 0) },
          uSunColor: { value: new THREE.Color() },
          uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
          uSunI: { value: 1 },
          uMoonI: { value: 0 },
          uHaze: { value: 0.6 },
        },
      }),
    [],
  );

  const starMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: STAR_VERT,
        fragmentShader: STAR_FRAG,
        transparent: true,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 0 },
        },
      }),
    [],
  );

  const starGeo = useMemo(() => {
    const pos = new Float32Array(STAR_COUNT * 3);
    const size = new Float32Array(STAR_COUNT);
    const phase = new Float32Array(STAR_COUNT);
    for (let i = 0; i < STAR_COUNT; i++) {
      // random point on upper hemisphere shell
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(Math.random() * 0.92);
      const r = 380;
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph) + 10;
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      size[i] = 1.2 + Math.random() * 2.4;
      phase[i] = Math.random() * Math.PI * 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    return g;
  }, []);

  const skyGeo = useMemo(() => new THREE.SphereGeometry(400, 32, 20), []);

  const fog = useMemo(() => new THREE.FogExp2("#cfe0ea", 0.004), []);
  const target = useMemo(() => new THREE.Object3D(), []);
  const charPos = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const t = scrollRef.current.t;
    const d = sampleDayNight(t);
    const time = clock.elapsedTime;

    // sky uniforms
    const u = skyMat.uniforms;
    (u.uTop.value as THREE.Color).copy(d.skyTop);
    (u.uMid.value as THREE.Color).copy(d.skyMid);
    (u.uBottom.value as THREE.Color).copy(d.skyBottom);
    (u.uSunDir.value as THREE.Vector3).copy(d.sunDir);
    (u.uSunColor.value as THREE.Color).copy(d.sunColor);
    (u.uMoonDir.value as THREE.Vector3).copy(d.moonDir);
    u.uSunI.value = d.sunIntensity;
    u.uMoonI.value = d.moonIntensity;

    // stars
    starMat.uniforms.uOpacity.value = reducedMotion ? d.starOpacity * 0.7 : d.starOpacity;
    starMat.uniforms.uTime.value = time;

    // fog
    fog.color.copy(d.fog);
    fog.density = d.fogDensity;
    if (scene.fog !== fog) scene.fog = fog;

    // sun light follows the character so shadows stay crisp
    pointAt(t, _p);
    charPos.copy(_p);
    const sun = sunRef.current;
    if (sun) {
      sun.position.copy(charPos).addScaledVector(d.sunDir, 55);
      target.position.copy(charPos);
      target.updateMatrixWorld();
      sun.target = target;
      sun.color.copy(d.sunColor);
      // at night the "sun" becomes cool moonlight
      sun.intensity = Math.max(d.sunIntensity, d.moonIntensity * 0.55);
    }
    const hemi = hemiRef.current;
    if (hemi) {
      hemi.color.copy(d.hemiSky);
      hemi.groundColor.copy(d.hemiGround);
      hemi.intensity = d.hemiIntensity;
    }
    const amb = ambRef.current;
    if (amb) amb.intensity = d.ambient;
  });

  return (
    <group>
      <mesh geometry={skyGeo} material={skyMat} frustumCulled={false} />
      <points geometry={starGeo} material={starMat} frustumCulled={false} />
      <directionalLight
        ref={sunRef}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={5}
        shadow-camera-far={140}
        shadow-bias={-0.0004}
      />
      <primitive object={target} />
      <hemisphereLight ref={hemiRef} />
      <ambientLight ref={ambRef} />
    </group>
  );
}
