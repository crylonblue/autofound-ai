"use client";

const DESK_COLOR = "#1e1e2a";
const MONITOR_COLOR = "#0d0d14";
const MONITOR_SCREEN = "#1a2a40";
const CHAIR_COLOR = "#1a1a24";
const CHAIR_SEAT = "#252535";
const PLANT_POT = "#2a1a0a";
const PLANT_LEAF = "#1a4a2a";

function Desk({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Desktop surface */}
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.05, 0.7]} />
        <meshStandardMaterial color={DESK_COLOR} roughness={0.8} metalness={0.1} />
      </mesh>
      {/* Legs */}
      {[[-0.6, 0.36, -0.28], [0.6, 0.36, -0.28], [-0.6, 0.36, 0.28], [0.6, 0.36, 0.28]].map(
        (pos, i) => (
          <mesh key={i} position={pos as [number, number, number]} castShadow>
            <boxGeometry args={[0.04, 0.72, 0.04]} />
            <meshStandardMaterial color={DESK_COLOR} roughness={0.9} metalness={0.1} />
          </mesh>
        )
      )}
    </group>
  );
}

function Monitor({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Screen */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[0.5, 0.32, 0.02]} />
        <meshStandardMaterial color={MONITOR_COLOR} roughness={0.5} metalness={0.2} />
      </mesh>
      {/* Screen face */}
      <mesh position={[0, 1.05, 0.011]}>
        <planeGeometry args={[0.44, 0.26]} />
        <meshStandardMaterial color={MONITOR_SCREEN} emissive={MONITOR_SCREEN} emissiveIntensity={0.3} />
      </mesh>
      {/* Stand */}
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[0.04, 0.1, 0.04]} />
        <meshStandardMaterial color={MONITOR_COLOR} roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Base */}
      <mesh position={[0, 0.76, 0]}>
        <boxGeometry args={[0.15, 0.02, 0.1]} />
        <meshStandardMaterial color={MONITOR_COLOR} roughness={0.7} metalness={0.3} />
      </mesh>
    </group>
  );
}

function Chair({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Seat */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[0.4, 0.04, 0.4]} />
        <meshStandardMaterial color={CHAIR_SEAT} roughness={0.9} metalness={0} />
      </mesh>
      {/* Backrest */}
      <mesh position={[0, 0.66, -0.18]} castShadow>
        <boxGeometry args={[0.38, 0.44, 0.03]} />
        <meshStandardMaterial color={CHAIR_COLOR} roughness={0.9} metalness={0} />
      </mesh>
      {/* Pedestal */}
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />
        <meshStandardMaterial color="#333" roughness={0.6} metalness={0.4} />
      </mesh>
      {/* Base */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.03, 8]} />
        <meshStandardMaterial color="#333" roughness={0.6} metalness={0.4} />
      </mesh>
    </group>
  );
}

function Plant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Pot */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.09, 0.3, 8]} />
        <meshStandardMaterial color={PLANT_POT} roughness={1} metalness={0} />
      </mesh>
      {/* Foliage spheres */}
      {[[0, 0.42, 0], [0.06, 0.48, 0.04], [-0.05, 0.46, -0.03]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <sphereGeometry args={[0.1 + i * 0.02, 8, 6]} />
          <meshStandardMaterial color={PLANT_LEAF} roughness={1} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}

// Workstation = desk + monitor + chair
function Workstation({
  position,
  rotation = 0,
}: {
  position: [number, number, number];
  rotation?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Desk position={[0, 0, 0]} />
      <Monitor position={[0, 0, -0.15]} />
      <Chair position={[0, 0, 0.65]} rotation={Math.PI} />
    </group>
  );
}

export default function FurnitureGroup() {
  return (
    <group>
      {/* Strategy zone (top-left quadrant) — 2 workstations */}
      <Workstation position={[-6, 0, -6]} rotation={0} />
      <Workstation position={[-4, 0, -4.5]} rotation={Math.PI / 4} />

      {/* Marketing zone (top-right) — 2 workstations */}
      <Workstation position={[4, 0, -6]} rotation={0} />
      <Workstation position={[6, 0, -4.5]} rotation={-Math.PI / 4} />

      {/* Sales zone (bottom-right) — 2 workstations */}
      <Workstation position={[4, 0, 4.5]} rotation={Math.PI} />
      <Workstation position={[6, 0, 6]} rotation={Math.PI} />

      {/* Operations zone (bottom-left) — 2 workstations */}
      <Workstation position={[-6, 0, 4.5]} rotation={Math.PI} />
      <Workstation position={[-4, 0, 6]} rotation={-Math.PI * 0.75} />

      {/* Plants for decoration */}
      <Plant position={[-2, 0, -2]} />
      <Plant position={[2, 0, -2]} />
      <Plant position={[-2, 0, 2]} />
      <Plant position={[2, 0, 2]} />
      <Plant position={[0, 0, -8]} />
      <Plant position={[0, 0, 8]} />
      <Plant position={[-8, 0, 0]} />
      <Plant position={[8, 0, 0]} />
    </group>
  );
}
