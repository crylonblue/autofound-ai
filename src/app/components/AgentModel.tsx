'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, Center, Bounds } from '@react-three/drei'
import { Suspense, useRef, useEffect } from 'react'
import * as THREE from 'three'

function Model({ url }: { url: string }) {
  const { scene, animations } = useGLTF(url)
  const groupRef = useRef<THREE.Group>(null)
  const { actions } = useAnimations(animations, groupRef)

  // Play the first animation if available
  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      const firstAction = Object.values(actions)[0]
      if (firstAction) {
        firstAction.reset().fadeIn(0.5).play()
      }
    }
  }, [actions])

  // Matte materials
  scene.traverse((child) => {
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

  // Auto-rotate only if no animation
  const hasAnimation = animations.length > 0
  useFrame((_, delta) => {
    if (groupRef.current && !hasAnimation) {
      groupRef.current.rotation.y += delta * 0.8
    }
  })

  return (
    <Bounds fit clip observe margin={1.2}>
      <Center>
        <group ref={groupRef}>
          <primitive object={scene} />
        </group>
      </Center>
    </Bounds>
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
          camera={{ position: [0, 0.3, 3], fov: 35 }}
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
