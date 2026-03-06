"use client";

import { Grid } from "@react-three/drei";

export default function Floor() {
  return (
    <>
      {/* Solid floor plane that receives shadows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#252538" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Grid overlay */}
      <Grid
        position={[0, 0, 0]}
        args={[40, 40]}
        cellSize={0.1}
        cellThickness={0.2}
        cellColor="#3a3a5c"
        sectionSize={0.5}
        sectionThickness={0.6}
        sectionColor="#4a4a72"
        fadeDistance={30}
        infiniteGrid={false}
      />
    </>
  );
}
