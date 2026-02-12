'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { Suspense, useRef, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'

function Model({ url }: { url: string }) {
  const gltf = useGLTF(url)
  const groupRef = useRef<THREE.Group>(null)
  const { actions, names, ref: animRef } = useAnimations(gltf.animations)
  const { camera } = useThree()
  const [ready, setReady] = useState(false)

  const hasAnimation = gltf.animations.length > 0

  // Clone scene to avoid shared state issues
  const clonedScene = useMemo(() => gltf.scene.clone(true), [gltf.scene])

  // Play first animation
  useEffect(() => {
    if (names.length > 0 && actions[names[0]]) {
      actions[names[0]]!.reset().fadeIn(0.3).play()
    }
  }, [actions, names])

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

  // Auto-fit camera after scene is added
  useEffect(() => {
    if (!groupRef.current) return
    const bbox = new THREE.Box3().setFromObject(groupRef.current)
    const center = new THREE.Vector3()
    const size = new THREE.Vector3()
    bbox.getCenter(center)
    bbox.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    const distance = maxDim * 2
    camera.position.set(0, center.y, distance)
    camera.lookAt(0, center.y, 0)
    camera.updateProjectionMatrix()
    setReady(true)
  }, [camera, clonedScene])

  // Auto-rotate only if no animation
  useFrame((_, delta) => {
    if (groupRef.current && !hasAnimation) {
      groupRef.current.rotation.y += delta * 0.8
    }
  })

  return (
    <group ref={groupRef} visible={ready}>
      <primitive ref={animRef} object={clonedScene} />
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
