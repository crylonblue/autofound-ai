'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Center, Bounds } from '@react-three/drei'
import { Suspense, useRef } from 'react'
import * as THREE from 'three'

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const groupRef = useRef<THREE.Group>(null)

  // Replace all materials with fully matte (no specular at all)
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mesh.material = materials.map((mat) => {
        const lambert = new THREE.MeshLambertMaterial()
        if ('map' in mat && mat.map) lambert.map = mat.map as THREE.Texture
        if ('color' in mat && mat.color) lambert.color = (mat.color as THREE.Color).clone()
        if ('transparent' in mat) lambert.transparent = mat.transparent
        if ('opacity' in mat) lambert.opacity = mat.opacity as number
        if ('alphaMap' in mat && mat.alphaMap) lambert.alphaMap = mat.alphaMap as THREE.Texture
        if ('side' in mat) lambert.side = mat.side
        return lambert
      })
      if (!Array.isArray(mesh.material) && materials.length === 1) {
        mesh.material = (mesh.material as THREE.MeshLambertMaterial[])[0]
      }
    }
  })

  // Auto-rotate
  useFrame((_, delta) => {
    if (groupRef.current) {
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
