import * as THREE from "three";

/** Sky dome: vertical gradient + sun disc + moon disc + horizon haze. */
export const SKY_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const SKY_FRAG = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uBottom;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uMoonDir;
  uniform float uSunI;
  uniform float uMoonI;
  uniform float uHaze;
  varying vec3 vWorld;
  void main() {
    vec3 d = normalize(vWorld);
    float h = clamp(d.y, -1.0, 1.0);
    vec3 col;
    if (h > 0.0) {
      col = mix(uMid, uTop, pow(h, 0.65));
    } else {
      col = mix(uMid, uBottom, pow(clamp(-h * 2.5, 0.0, 1.0), 0.7));
    }
    // sun disc + halo
    float sunD = dot(d, normalize(uSunDir));
    float disc = smoothstep(0.9992, 0.9997, sunD);
    float halo = pow(max(sunD, 0.0), 24.0) * 0.35;
    col += uSunColor * (disc * 2.2 + halo) * uSunI;
    // moon disc + halo
    float moonD = dot(d, normalize(uMoonDir));
    float mdisc = smoothstep(0.99955, 0.99985, moonD);
    float mhalo = pow(max(moonD, 0.0), 90.0) * 0.5;
    col += vec3(0.92, 0.95, 1.0) * (mdisc * 1.6 + mhalo) * uMoonI;
    // horizon haze
    col = mix(col, uMid, (1.0 - abs(h)) * uHaze * 0.35);
    gl_FragColor = vec4(col, 1.0);
  }
`;

/**
 * Inject wind sway into a material's vertex shader.
 * `strength` scales the sway; sway grows with uv.y (top of the blade).
 */
export function addWindSway(
  material: THREE.Material,
  strength: number,
  speed = 1.6,
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uSway = { value: strength };
    shader.vertexShader = `
      uniform float uTime;
      uniform float uSway;
    ` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
       #ifdef USE_INSTANCING
         vec4 wpos = instanceMatrix * vec4(transformed, 1.0);
         float ph = wpos.x * 0.35 + wpos.z * 0.5;
         float swayAmt = (sin(uTime * ${speed.toFixed(2)} + ph) + sin(uTime * ${(speed * 2.3).toFixed(2)} + ph * 1.7) * 0.5);
         transformed.x += swayAmt * uSway * uv.y * 0.5;
         transformed.z += swayAmt * uSway * uv.y * 0.28;
       #endif
      `,
    );
    (material as THREE.Material & { userData: Record<string, unknown> }).userData.shader =
      shader;
  };
  // keep a tick list so one useFrame can advance all wind materials
  windMaterials.push(material);
}

/** Every material with wind injected — ticked by World once per frame. */
export const windMaterials: THREE.Material[] = [];

export function tickWind(time: number): void {
  for (const m of windMaterials) {
    const sh = (m as THREE.Material & { userData: Record<string, unknown> })
      .userData.shader as { uniforms: { uTime: { value: number } } } | undefined;
    if (sh) sh.uniforms.uTime.value = time;
  }
}

/** Soft round sprite for points (smoke / dust / fireflies / embers). */
export const PUFF_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (180.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

export const PUFF_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.12, d) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

/** Twinkling star points. */
export const STAR_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime;
  varying float vTw;
  void main() {
    vTw = 0.55 + 0.45 * sin(uTime * 1.8 + aPhase);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (140.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

export const STAR_FRAG = /* glsl */ `
  varying float vTw;
  uniform float uOpacity;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.05, d) * vTw * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(0.95, 0.96, 1.0, a);
  }
`;
