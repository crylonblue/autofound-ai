"use client";

export default function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.8} />
      {/* Warm orange ambient wash */}
      <ambientLight intensity={0.4} color="#ff9055" />

      {/* Main sun — warm white */}
      <directionalLight
        position={[8, 14, 8]}
        intensity={1.6}
        color="#fff4e6"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      {/* Cool fill from opposite side */}
      <directionalLight position={[-6, 10, -6]} intensity={0.6} color="#8ab4ff" />

      {/* ─── Gradient: warm orange → cool blue across the floor ─── */}
      {/* Warm side */}
      <pointLight position={[-10, 3, -6]} intensity={1.2} color="#ff7b3a" distance={22} decay={2} />
      <pointLight position={[-6, 2, 0]} intensity={0.8} color="#ffaa55" distance={18} decay={2} />
      {/* Mid / neutral */}
      <pointLight position={[0, 3, 0]} intensity={0.6} color="#e8c8ff" distance={16} decay={2} />
      {/* Cool side */}
      <pointLight position={[6, 2, 0]} intensity={0.8} color="#7aa8ff" distance={18} decay={2} />
      <pointLight position={[10, 3, 6]} intensity={1.2} color="#5588ee" distance={22} decay={2} />

      {/* Overhead cool */}
      <pointLight position={[0, 10, 0]} intensity={0.6} color="#99bbff" />

      {/* Hemisphere: bright warm ground, cool sky */}
      <hemisphereLight args={["#8899ee", "#4a3525", 0.6]} />
    </>
  );
}
