'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, Center, Bounds } from '@react-three/drei'
import { Suspense, useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'

function Model({ url }: { url: string }) {
  const { scene, animations } = useGLTF(url)
  const clonedScene = useMemo(() => scene.clone(true), [scene])
  const groupRef = useRef<THREE.Group>(null)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)

  const hasAnimation = animations.length > 0

  // Set up animation mixer manually for better control
  useEffect(() => {
    if (hasAnimation && clonedScene) {
      const mixer = new THREE.AnimationMixer(clonedScene)
      mixerRef.current = mixer
      const clip = animations[0]
      const action = mixer.clipAction(clip)
      action.reset().play()
      return () => { mixer.stopAllAction() }
    }
  }, [hasAnimation, animations, clonedScene])

  // Matte materials
  useEffect(() => {
    clonedScene.traverse((child) => {
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
  }, [clonedScene])

  useFrame((_, delta) => {
    // Update animation mixer
    if (mixerRef.current) {
      mixerRef.current.update(delta)
    }
    // Auto-rotate only if no animation
    if (groupRef.current && !hasAnimation) {
      groupRef.current.rotation.y += delta * 0.8
    }
  })

  return (
    <Bounds fit clip observe margin={1.1}>
      <Center>
        <group ref={groupRef}>
          <primitive object={clonedScene} />
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
          camera={{ position: [0, 0, 4], fov: 30 }}
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
