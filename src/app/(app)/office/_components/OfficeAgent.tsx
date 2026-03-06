"use client";

import { useRef, useMemo, useState, useCallback, useEffect } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useGLTF, useAnimations, Html } from "@react-three/drei";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { resolveCollisions } from "../_lib/officeGrid";
import type { AgentActivity } from "./OfficeCanvas";
import { modelIdToUrl } from "@/components/ModelPicker";

function isAgentBusy(activity: AgentActivity | null): boolean {
  return !!(activity?.currentTask || activity?.heartbeat?.status === "running");
}

function activityStatusColor(status: string, activity: AgentActivity | null): string {
  if (isAgentBusy(activity)) return "#3b82f6"; // blue = working
  switch (status) {
    case "active":
      return "#22c55e";
    case "paused":
      return "#f59e0b";
    default:
      return "#6b7280";
  }
}

type AnimState = "idle" | "walking";

const CROSSFADE_DURATION = 0.3;
const WALK_SPEED = 1.8;
const ROTATION_SPEED = 8;
const ARRIVE_THRESHOLD = 0.08;

interface OfficeAgentProps {
  agentId: string;
  name: string;
  icon: string;
  status: string;
  position: [number, number, number];
  selected: boolean;
  onSelect: () => void;
  onPositionChange: (x: number, z: number) => void;
  activity: AgentActivity | null;
  walkTarget: { x: number; z: number } | null;
  onArrived: () => void;
}

export default function OfficeAgent({
  name,
  icon,
  status,
  position,
  selected,
  onSelect,
  onPositionChange,
  activity,
  walkTarget,
  onArrived,
}: OfficeAgentProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const modelUrl = modelIdToUrl(icon);
  const { scene, animations } = useGLTF(modelUrl);

  const hasAnimations = animations.length > 0;

  const clonedScene = useMemo(() => {
    const clone = skeletonClone(scene);
    clone.updateMatrixWorld(true);

    const bbox = new THREE.Box3();
    const _pos = new THREE.Vector3();
    let hasBones = false;

    clone.traverse((child) => {
      if ((child as THREE.Bone).isBone) {
        hasBones = true;
        child.getWorldPosition(_pos);
        bbox.expandByPoint(_pos);
      }
    });

    if (!hasBones) {
      bbox.setFromObject(clone);
    }

    const size = new THREE.Vector3();
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? 1 / maxDim : 1;
    clone.scale.setScalar(scale);

    clone.updateMatrixWorld(true);
    const bbox2 = new THREE.Box3();
    if (hasBones) {
      clone.traverse((child) => {
        if ((child as THREE.Bone).isBone) {
          child.getWorldPosition(_pos);
          bbox2.expandByPoint(_pos);
        }
      });
    } else {
      bbox2.setFromObject(clone);
    }
    const center = new THREE.Vector3();
    bbox2.getCenter(center);
    const groundPad = size.y * 0.12;
    clone.position.set(-center.x, -bbox2.min.y + groundPad, -center.z);

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        const mats = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        mats.forEach((mat) => {
          if ("roughness" in mat) {
            const m = mat as THREE.MeshStandardMaterial;
            m.roughness = 0.8;
            m.metalness = 0.02;
            m.envMapIntensity = 0.4;
            m.needsUpdate = true;
          }
        });
      }
    });

    return clone;
  }, [scene]);

  // ─── Skeletal animation setup ────────────────────────────────────
  const { actions, names } = useAnimations(animations, groupRef);

  const [animState, setAnimState] = useState<AnimState>("idle");
  const prevAnimState = useRef<AnimState>("idle");

  const findAction = useCallback(
    (desired: string): THREE.AnimationAction | null => {
      if (!actions || names.length === 0) return null;
      const lower = desired.toLowerCase();
      const exact = names.find((n) => n.toLowerCase() === lower);
      if (exact && actions[exact]) return actions[exact];
      const partial = names.find((n) => n.toLowerCase().includes(lower));
      if (partial && actions[partial]) return actions[partial];
      if (desired === "idle" && names[0] && actions[names[0]]) {
        return actions[names[0]];
      }
      return null;
    },
    [actions, names]
  );

  useEffect(() => {
    if (!hasAnimations) return;

    const prev = findAction(prevAnimState.current);
    const next = findAction(animState);

    if (!next && animState !== "idle") {
      setAnimState("idle");
      return;
    }

    if (next) {
      if (prev && prev !== next) {
        prev.fadeOut(CROSSFADE_DURATION);
      }
      next.reset().fadeIn(CROSSFADE_DURATION).play();
      next.setLoop(THREE.LoopRepeat, Infinity);
    }

    prevAnimState.current = animState;
  }, [animState, hasAnimations, findAction]);

  useEffect(() => {
    if (!hasAnimations) return;
    const idle = findAction("idle");
    if (idle) {
      idle.reset().fadeIn(0).play();
    }
  }, [hasAnimations, findAction]);

  // ─── Walk-to logic (straight line + collision resolution) ──────
  const currentPos = useRef(new THREE.Vector3(position[0], 0, position[2]));
  const targetPos = useRef<THREE.Vector3 | null>(null);
  const isWalking = useRef(false);

  useEffect(() => {
    if (walkTarget) {
      targetPos.current = new THREE.Vector3(walkTarget.x, 0, walkTarget.z);
      if (!isWalking.current) {
        isWalking.current = true;
        setAnimState("walking");
      }
    }
  }, [walkTarget]);

  const [hovered, setHovered] = useState(false);
  const bobPhase = useRef(Math.random() * Math.PI * 2);

  useFrame((_, rawDelta) => {
    if (!groupRef.current) return;
    const delta = Math.min(rawDelta, 0.05);
    const g = groupRef.current;

    if (isWalking.current && targetPos.current) {
      const target = targetPos.current;
      const dx = target.x - currentPos.current.x;
      const dz = target.z - currentPos.current.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < ARRIVE_THRESHOLD) {
        currentPos.current.set(target.x, 0, target.z);
        isWalking.current = false;
        targetPos.current = null;
        setAnimState("idle");
        onPositionChange(target.x, target.z);
        onArrived();
      } else {
        const targetAngle = Math.atan2(dx, dz);
        const currentAngle = g.rotation.y;
        let angleDiff = targetAngle - currentAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        g.rotation.y += angleDiff * ROTATION_SPEED * delta;

        const step = Math.min(WALK_SPEED * delta, dist);
        const desiredX = currentPos.current.x + (dx / dist) * step;
        const desiredZ = currentPos.current.z + (dz / dist) * step;

        // Resolve collisions with furniture
        const [resolvedX, resolvedZ] = resolveCollisions(desiredX, desiredZ);
        currentPos.current.x = resolvedX;
        currentPos.current.z = resolvedZ;
      }

      g.position.set(currentPos.current.x, 0, currentPos.current.z);
    } else {
      if (!hasAnimations) {
        bobPhase.current += delta * 1.8;
        g.position.y = position[1] + Math.sin(bobPhase.current) * 0.08;
        g.rotation.y = Math.sin(bobPhase.current * 0.7) * 0.06;
        const breathe = 1 + Math.sin(bobPhase.current * 1.2) * 0.015;
        g.scale.set(breathe, breathe, breathe);
      }
    }
  });

  const onClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onSelect();
    },
    [onSelect]
  );

  return (
    <group
      ref={groupRef}
      position={[position[0], position[1], position[2]]}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      {/* Selection ring */}
      {(selected || hovered) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.5, 0.6, 32]} />
          <meshBasicMaterial
            color={selected ? "#3b82f6" : "#ffffff"}
            transparent
            opacity={selected ? 0.6 : 0.3}
          />
        </mesh>
      )}

      {/* Chibi model */}
      <primitive object={clonedScene} />

      {/* Floating label + activity bubble */}
      <Html position={[0, 1.3, 0]} center style={{ pointerEvents: "none" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "3px",
            userSelect: "none",
          }}
        >
          {/* Activity bubble */}
          {activity?.currentTask && (
            <div
              style={{
                background: "rgba(59, 130, 246, 0.15)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                borderRadius: "6px",
                padding: "3px 8px",
                whiteSpace: "nowrap",
                maxWidth: "160px",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <span style={{ color: "#93c5fd", fontSize: "9px", fontWeight: 500 }}>
                {activity.currentTask.progress || activity.currentTask.title}
              </span>
            </div>
          )}
          {!activity?.currentTask && activity?.lastActivity && (
            <div
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "6px",
                padding: "2px 6px",
                whiteSpace: "nowrap",
                maxWidth: "140px",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <span style={{ color: "#71717a", fontSize: "9px" }}>
                {activity.lastActivity.summary.length > 30
                  ? activity.lastActivity.summary.slice(0, 30) + "..."
                  : activity.lastActivity.summary}
              </span>
            </div>
          )}

          {/* Name tag */}
          <div
            style={{
              background: "rgba(10, 10, 20, 0.85)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              padding: "3px 8px",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: activityStatusColor(status, activity),
                display: "inline-block",
                flexShrink: 0,
                boxShadow: isAgentBusy(activity) ? `0 0 6px ${activityStatusColor(status, activity)}` : "none",
              }}
            />
            <span
              style={{ color: "#e4e4e7", fontSize: "11px", fontWeight: 500 }}
            >
              {name}
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
}

// Preload all models
useGLTF.preload("/models/ceo.glb");
useGLTF.preload("/models/marketing.glb");
useGLTF.preload("/models/sales.glb");
useGLTF.preload("/models/dev.glb");
