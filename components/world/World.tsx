"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { SkyRig } from "./Sky";
import { Terrain } from "./Terrain";
import { Path } from "./Path";
import { Character } from "./Character";
import { CameraRig } from "./CameraRig";
import { ChapterGate } from "./ChapterGate";
import { Ambient } from "./Ambient";
import { STATION_T } from "@/lib/stations";
import { tickWind } from "@/lib/shaders";
import { Chapter1 } from "./Chapters/Chapter1";
import { Chapter2 } from "./Chapters/Chapter2";
import { Chapter3 } from "./Chapters/Chapter3";
import { Chapter4 } from "./Chapters/Chapter4";
import { Chapter5 } from "./Chapters/Chapter5";
import { Chapter6 } from "./Chapters/Chapter6";

/** Advances all wind-sway shader clocks once per frame. */
function WindTicker() {
  useFrame(({ clock }) => {
    tickWind(clock.elapsedTime);
  });
  return null;
}

function Effects() {
  return (
    <EffectComposer>
      <Bloom
        mipmapBlur
        luminanceThreshold={0.82}
        luminanceSmoothing={0.2}
        intensity={0.55}
      />
      <Vignette offset={0.22} darkness={0.62} />
    </EffectComposer>
  );
}

export function World({ onReady }: { onReady: () => void }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      shadows
      camera={{ fov: 50, near: 0.1, far: 900, position: [0, 5, 16] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={() => onReady()}
    >
      <SkyRig />
      <CameraRig />
      <Terrain />
      <Path />
      <Character />
      <Ambient />
      <ChapterGate t={STATION_T[0]}>
        <Chapter1 />
      </ChapterGate>
      <ChapterGate t={STATION_T[1]}>
        <Chapter2 />
      </ChapterGate>
      <ChapterGate t={STATION_T[2]}>
        <Chapter3 />
      </ChapterGate>
      <ChapterGate t={STATION_T[3]}>
        <Chapter4 />
      </ChapterGate>
      <ChapterGate t={STATION_T[4]}>
        <Chapter5 />
      </ChapterGate>
      <ChapterGate t={STATION_T[5]}>
        <Chapter6 />
      </ChapterGate>
      <WindTicker />
      <Effects />
    </Canvas>
  );
}
