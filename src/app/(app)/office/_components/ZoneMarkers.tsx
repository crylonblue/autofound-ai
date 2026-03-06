"use client";

import * as THREE from "three";
import { Html } from "@react-three/drei";

const zones = [
  { name: "Strategy", color: "#3b82f6", position: [-5, 0.01, -5] as const },
  { name: "Marketing", color: "#a855f7", position: [5, 0.01, -5] as const },
  { name: "Sales", color: "#22c55e", position: [5, 0.01, 5] as const },
  { name: "Operations", color: "#f59e0b", position: [-5, 0.01, 5] as const },
];

export default function ZoneMarkers() {
  return (
    <>
      {zones.map((zone) => (
        <group key={zone.name} position={[zone.position[0], zone.position[1], zone.position[2]]}>
          {/* Semi-transparent colored floor region */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[8, 8]} />
            <meshStandardMaterial
              color={zone.color}
              transparent
              opacity={0.1}
              roughness={1}
              metalness={0}
            />
          </mesh>

          {/* Border outline */}
          <lineSegments rotation={[-Math.PI / 2, 0, 0]}>
            <edgesGeometry args={[new THREE.PlaneGeometry(8, 8)]} />
            <lineBasicMaterial color={zone.color} transparent opacity={0.25} />
          </lineSegments>

          {/* Label */}
          <Html
            position={[0, 0.1, -3.5]}
            center
            style={{ pointerEvents: "none" }}
          >
            <div
              style={{
                color: zone.color,
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                opacity: 0.5,
                whiteSpace: "nowrap",
                userSelect: "none",
              }}
            >
              {zone.name}
            </div>
          </Html>
        </group>
      ))}
    </>
  );
}
