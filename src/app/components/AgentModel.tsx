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

  // Compute bounding box to center model
  const { centerX, centerY, centerZ, size } = useMemo(() => {
    const bbox = new THREE.Box3().setFromObject(gltf.scene)
    const center = new THREE.Vector3()
    bbox.getCenter(center)
    const s = new THREE.Vector3()
    bbox.getSize(s)
    return {
      centerX: -center.x,
      centerY: -center.y,
      centerZ: -center.z,
      size: Math.max(s.x, s.y, s.z),
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

  // Auto-fit camera
  useEffect(() => {
    const distance = size * 2
    camera.position.set(0, 0, distance)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [camera, size])

  // Auto-rotate only if no animation
  useFrame((_, delta) => {
    if (groupRef.current && !hasAnimation) {
      groupRef.current.rotation.y += delta * 0.8
    }
  })

  return (
    <group ref={groupRef}>
      <primitive object={gltf.scene} position={[centerX, centerY, centerZ]} />
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
