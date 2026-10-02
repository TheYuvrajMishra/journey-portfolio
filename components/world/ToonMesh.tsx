import * as THREE from "three";
import { toon, toonEmissive, getGradientMap, OUTLINE_COLOR } from "@/lib/toonMaterial";
import { faceted } from "@/lib/geometry";

interface ToonMeshProps {
  geo: THREE.BufferGeometry;
  color: string;
  /** inverted-hull outline (hero props / character only) */
  outline?: boolean;
  outlineScale?: number;
  /** faceted flat-normal geometry (crisp low-poly look) */
  flat?: boolean;
  emissive?: string;
  emissiveIntensity?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  onClick?: (e: unknown) => void;
  onPointerOver?: (e: unknown) => void;
  onPointerOut?: (e: unknown) => void;
  name?: string;
}

/**
 * One cartoon mesh: shared toon material + optional inverted-hull outline.
 * Pass a cached geometry; materials come from the shared cache.
 */
export function ToonMesh({
  geo,
  color,
  outline = false,
  outlineScale = 1.04,
  flat = false,
  emissive,
  emissiveIntensity = 1,
  position,
  rotation,
  scale,
  castShadow = true,
  receiveShadow = false,
  onClick,
  onPointerOver,
  onPointerOut,
  name,
}: ToonMeshProps) {
  const mat = emissive
    ? toonEmissive(color, emissive, emissiveIntensity)
    : toon(color);
  // ensure gradient map is created
  getGradientMap();
  const finalGeo = flat ? faceted(geo) : geo;
  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
      name={name}
      onClick={onClick as never}
      onPointerOver={onPointerOver as never}
      onPointerOut={onPointerOut as never}
    >
      <mesh geometry={finalGeo} material={mat} castShadow={castShadow} receiveShadow={receiveShadow} />
      {outline && (
        <mesh geometry={finalGeo} scale={outlineScale} castShadow={false} receiveShadow={false}>
          <meshBasicMaterial color={OUTLINE_COLOR} side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  );
}
