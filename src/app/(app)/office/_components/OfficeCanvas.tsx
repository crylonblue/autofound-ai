"use client";

import { Suspense, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { Canvas, useThree, useFrame, type ThreeEvent } from "@react-three/fiber";
import { MapControls } from "@react-three/drei";
import SceneLighting from "./SceneLighting";
import Floor from "./Floor";
import ZoneMarkers from "./ZoneMarkers";
import FurnitureGroup from "./FurnitureGroup";
import OfficeAgent from "./OfficeAgent";
import { resolveCollisions } from "../_lib/officeGrid";

interface AgentData {
  _id: string;
  name: string;
  role: string;
  status: string;
  icon: string;
  color: string;
  systemPrompt: string;
}

export interface AgentActivity {
  currentTask: { title: string; status: string; progress?: string } | null;
  lastActivity: { type: string; summary: string; createdAt: number } | null;
  heartbeat: { status: string; lastRun?: number; runCount: number } | null;
}

interface OfficeCanvasProps {
  agents: AgentData[];
  positions: Record<string, { x: number; z: number }>;
  activity: Record<string, AgentActivity>;
  selectedId: string | null;
  onSelectAgent: (id: string | null) => void;
  onPositionChange: (agentId: string, x: number, z: number) => void;
}

const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

// Invisible floor mesh that captures clicks for walk targets
function FloorClickTarget({
  selectedId,
  onFloorClick,
}: {
  selectedId: string | null;
  onFloorClick: (x: number, z: number) => void;
}) {
  const { raycaster, pointer, camera } = useThree();

  const handleContextMenu = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.nativeEvent.preventDefault();
      if (!selectedId) return;
      raycaster.setFromCamera(pointer, camera);
      const target = new THREE.Vector3();
      const hit = raycaster.ray.intersectPlane(floorPlane, target);
      if (hit) {
        onFloorClick(target.x, target.z);
      }
    },
    [selectedId, raycaster, pointer, camera, onFloorClick]
  );

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      onContextMenu={handleContextMenu}
      visible={false}
    >
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial />
    </mesh>
  );
}

// Pulsing ring that marks the walk destination
function WalkMarker({ x, z }: { x: number; z: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.MeshBasicMaterial>(null!);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const t = performance.now() * 0.004;
    const s = 1 + Math.sin(t) * 0.2;
    ref.current.scale.set(s, s, 1);
    if (matRef.current) {
      matRef.current.opacity = Math.max(0, matRef.current.opacity - delta * 0.3);
    }
  });

  return (
    <mesh
      ref={ref}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[x, 0.03, z]}
    >
      <ringGeometry args={[0.15, 0.22, 32]} />
      <meshBasicMaterial
        ref={matRef}
        color="#3b82f6"
        transparent
        opacity={0.7}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function OfficeCanvas({
  agents,
  positions,
  activity,
  selectedId,
  onSelectAgent,
  onPositionChange,
}: OfficeCanvasProps) {
  const [walkTargets, setWalkTargets] = useState<
    Record<string, { x: number; z: number }>
  >({});

  const handleFloorClick = useCallback(
    (x: number, z: number) => {
      if (!selectedId) return;
      // Snap to nearest walkable spot if clicking on an obstacle
      const [rx, rz] = resolveCollisions(x, z);
      setWalkTargets((prev) => ({ ...prev, [selectedId]: { x: rx, z: rz } }));
    },
    [selectedId]
  );

  const handleArrived = useCallback((agentId: string) => {
    setWalkTargets((prev) => {
      const next = { ...prev };
      delete next[agentId];
      return next;
    });
  }, []);

  return (
    <Canvas
      camera={{ position: [12, 12, 12], fov: 35 }}
      shadows
      gl={{ antialias: true }}
      onPointerMissed={() => onSelectAgent(null)}
      onContextMenu={(e) => e.preventDefault()}
      style={{ background: "#121220" }}
    >
      <SceneLighting />

      <Suspense fallback={null}>
        <Floor />
        <ZoneMarkers />
        <FurnitureGroup />
        {Object.entries(walkTargets).map(([id, target]) => (
          <WalkMarker key={id} x={target.x} z={target.z} />
        ))}
        <FloorClickTarget
          selectedId={selectedId}
          onFloorClick={handleFloorClick}
        />

        {agents.map((agent) => {
          const pos = positions[agent._id] ?? { x: 0, z: 0 };
          return (
            <OfficeAgent
              key={agent._id}
              agentId={agent._id}
              name={agent.name}
              icon={agent.icon}
              status={agent.status}
              position={[pos.x, 0, pos.z]}
              selected={selectedId === agent._id}
              onSelect={() => onSelectAgent(agent._id)}
              onPositionChange={(x, z) => onPositionChange(agent._id, x, z)}
              activity={activity[agent._id] ?? null}
              walkTarget={walkTargets[agent._id] ?? null}
              onArrived={() => handleArrived(agent._id)}
            />
          );
        })}
      </Suspense>

      <MapControls
        maxPolarAngle={Math.PI / 2.5}
        minDistance={5}
        maxDistance={30}
        enableRotate={false}
        makeDefault
      />
    </Canvas>
  );
}
