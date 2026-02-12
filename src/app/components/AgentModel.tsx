'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { Suspense, useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'

function Model({ url }: { url: string }) {
  const gltf = useGLTF(url)
  const groupRef = useRef<THREE.Group>(null)
  const { actions, names } = useAnimations(gltf.animations, groupRef)
  const { camera } = useThree()

  const hasAnimation = gltf.animations.length > 0

  // Compute bounding box once
  const { yOffset, centerX, centerZ, height } = useMemo(() => {
    const bbox = new THREE.Box3().setFromObject(gltf.scene)
    return {
      yOffset: -bbox.min.y,
      centerX: -(bbox.min.x + bbox.max.x) / 2,
      centerZ: -(bbox.min.z + bbox.max.z) / 2,
      height: bbox.max.y - bbox.min.y,
    }
  }, [gltf.scene])

  // Play first animation
  useEffect(() => {
    if (names.length > 0 && actions[names[0]]) {
      actions[names[0]]!.reset().fadeIn(0.3).play()
    }
  }, [actions, names])

  // Matte materials
  useEffect(() => {
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((mat) => {
          if ((mat as THREE.MeshStandardMaterial).roughness !== undefined) {
            const m = mat as THREE.MeshStandardMaterial
            m.roughness = 1
            m.metalness = 0
            m.envMapIntensity = 0
          }
        })
      }
    })
  }, [gltf.scene])

  // Auto-fit camera to model
  useEffect(() => {
    const midY = height / 2
    // Position camera to see the full model with some padding
    const distance = height * 1.8
    camera.position.set(0, midY, distance)
    camera.lookAt(0, midY, 0)
    camera.updateProjectionMatrix()
  }, [camera, height])

  // Auto-rotate only if no animation
  useFrame((_, delta) => {
    if (groupRef.current && !hasAnimation) {
      groupRef.current.rotation.y += delta * 0.8
    }
  })

  return (
    <group ref={groupRef} position={[centerX, 0, centerZ]}>
      <primitive object={gltf.scene} position={[0, yOffset, 0]} />
      <gridHelper
        args={[4, 12, '#3b82f6', '#1e3a5f']}
        position={[0, 0, 0]}
      />
    </group>
  )
}

function LoadingSpinner() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

interface AgentModelProps {
  modelUrl: string
  className?: string
}

export default function AgentModel({ modelUrl, className = '' }: AgentModelProps) {
  return (
    <div className={`relative ${className}`} style={{ width: 200, height: 200 }}>
      <Suspense fallback={<LoadingSpinner />}>
        <Canvas
          camera={{ fov: 35 }}
          gl={{ alpha: true }}
          style={{ background: 'transparent', pointerEvents: 'none' }}
        >
          <ambientLight intensity={1.2} />
          <hemisphereLight args={['#ffffff', '#b0b0b0', 0.8]} />
          <directionalLight position={[2, 4, 3]} intensity={0.4} />
          <directionalLight position={[-2, 3, -2]} intensity={0.3} />
          <directionalLight position={[0, -2, 3]} intensity={0.15} />
          <Model url={modelUrl} />
        </Canvas>
      </Suspense>
    </div>
  )
}
