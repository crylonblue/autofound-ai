"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";

const MODEL_OPTIONS = [
  { id: "ceo", label: "Executive", url: "/models/ceo.glb" },
  { id: "marketing", label: "Creative", url: "/models/marketing.glb" },
  { id: "sales", label: "Professional", url: "/models/sales.glb" },
  { id: "dev", label: "Technical", url: "/models/dev.glb" },
] as const;

export type ModelId = (typeof MODEL_OPTIONS)[number]["id"];

export function modelIdToUrl(id: string): string {
  const found = MODEL_OPTIONS.find((m) => m.id === id);
  return found ? found.url : "/models/dev.glb";
}

export { MODEL_OPTIONS };

// Normalize a cloned scene: scale to unit height, center, and place feet at y=0
function normalizeScene(scene: THREE.Object3D) {
  const clone = skeletonClone(scene);
  clone.updateMatrixWorld(true);

  // Use mesh bounding box (more reliable than bone-only)
  const bbox = new THREE.Box3().setFromObject(clone);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const center = new THREE.Vector3();
  bbox.getCenter(center);

  // Scale so height = 0.75 (leaves room for camera framing)
  const scale = size.y > 0 ? 0.75 / size.y : 1;
  clone.scale.setScalar(scale);

  // Recompute after scaling
  clone.updateMatrixWorld(true);
  const bbox2 = new THREE.Box3().setFromObject(clone);
  const center2 = new THREE.Vector3();
  bbox2.getCenter(center2);

  // Center on all axes (model centered vertically for preview framing)
  clone.position.set(-center2.x, -center2.y, -center2.z);

  return clone;
}

// 3D model that spins and plays idle animation
function ModelPreview({ url }: { url: string }) {
  const { scene, animations } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null!);

  const clonedScene = useMemo(() => normalizeScene(scene), [scene]);

  const mixer = useMemo(() => {
    if (animations.length === 0) return null;
    const m = new THREE.AnimationMixer(clonedScene);
    const idle =
      animations.find((a) => a.name.toLowerCase().includes("idle")) ??
      animations[0];
    if (idle) m.clipAction(idle).play();
    return m;
  }, [animations, clonedScene]);

  useFrame((_, delta) => {
    mixer?.update(delta);
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} />
    </group>
  );
}

// ─── Standalone preview canvas (for agent cards, detail panels, etc.) ───

interface ModelPreviewCanvasProps {
  modelId: string;
  className?: string;
}

export function ModelPreviewCanvas({ modelId, className }: ModelPreviewCanvasProps) {
  const url = modelIdToUrl(modelId);
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0.05, 1.8], fov: 30 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[2, 3, 2]} intensity={1} />
        <directionalLight position={[-2, 2, -1]} intensity={0.4} />
        <Suspense fallback={null}>
          <ModelPreview url={url} />
        </Suspense>
      </Canvas>
    </div>
  );
}

// ─── Picker grid ────────────────────────────────────────────────────

interface ModelPickerProps {
  value: string;
  onChange: (modelId: string) => void;
}

export function ModelPicker({ value, onChange }: ModelPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {MODEL_OPTIONS.map((model) => {
        const selected = value === model.id;
        return (
          <button
            key={model.id}
            type="button"
            onClick={() => onChange(model.id)}
            className={`
              relative flex flex-col items-center rounded-lg border p-1 transition-all cursor-pointer
              ${
                selected
                  ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/30"
                  : "border-white/10 hover:border-white/20 hover:bg-white/5"
              }
            `}
          >
            <div className="w-full aspect-square rounded-md overflow-hidden bg-[#1a1a2e]">
              <Canvas
                camera={{ position: [0, 0.05, 1.8], fov: 30 }}
                gl={{ antialias: true, alpha: true }}
                style={{ background: "transparent" }}
              >
                <ambientLight intensity={1.2} />
                <directionalLight position={[2, 3, 2]} intensity={1} />
                <directionalLight position={[-2, 2, -1]} intensity={0.4} />
                <Suspense fallback={null}>
                  <ModelPreview url={model.url} />
                </Suspense>
              </Canvas>
            </div>
            <span
              className={`text-[10px] mt-1 font-medium ${
                selected ? "text-blue-400" : "text-zinc-400"
              }`}
            >
              {model.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
