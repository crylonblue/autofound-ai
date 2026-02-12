'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useAnimations, useFBX } from '@react-three/drei'
import { Suspense, useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'

function GLTFModel({ url }: { url: string }) {
  const group = useRef<THREE.Group>(null!)
  const { scene, animations } = useGLTF(url)
  const clonedScene = useMemo(() => skeletonClone(scene), [scene])
  const { actions } = useAnimations(animations, group)
  const { camera } = useThree()
  const fitted = useRef(false)

  useEffect(() => {
    const names = Object.keys(actions)
    if (names.length > 0 && actions[names[0]]) {
      actions[names[0]]!.reset().fadeIn(0.3).play()
    }
  }, [actions])

  useEffect(() => {
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((mat) => {
          if ('roughness' in mat) {
            ;(mat as THREE.MeshStandardMaterial).roughness = 1
            ;(mat as THREE.MeshStandardMaterial).metalness = 0
            ;(mat as THREE.MeshStandardMaterial).envMapIntensity = 0
          }
        })
      }
    })
  }, [clonedScene])

  useFrame((_, delta) => {
    if (!group.current) return
    if (!fitted.current) {
      const bbox = new THREE.Box3().setFromObject(group.current)
      if (bbox.isEmpty()) return
      const center = new THREE.Vector3()
      const size = new THREE.Vector3()
      bbox.getCenter(center)
      bbox.getSize(size)
      const maxDim = Math.max(size.x, size.y, size.z)
      camera.position.set(0, center.y, maxDim * 2.2)
      camera.lookAt(center)
      camera.updateProjectionMatrix()
      fitted.current = true
    }
    if (Object.keys(actions).length === 0) {
      group.current.rotation.y += delta * 0.8
    }
  })

  return (
    <group ref={group}>
      <primitive object={clonedScene} />
    </group>
  )
}

function FBXModel({ url }: { url: string }) {
  const group = useRef<THREE.Group>(null!)
  const fbx = useFBX(url)
  const clonedScene = useMemo(() => skeletonClone(fbx), [fbx])
  const { actions } = useAnimations(fbx.animations, group)
  const { camera } = useThree()
  const fitted = useRef(false)

  useEffect(() => {
    const names = Object.keys(actions)
    if (names.length > 0 && actions[names[0]]) {
      actions[names[0]]!.reset().fadeIn(0.3).play()
    }
  }, [actions])

  useEffect(() => {
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((mat) => {
          if ('roughness' in mat) {
            ;(mat as THREE.MeshStandardMaterial).roughness = 1
            ;(mat as THREE.MeshStandardMaterial).metalness = 0
            ;(mat as THREE.MeshStandardMaterial).envMapIntensity = 0
          }
        })
      }
    })
  }, [clonedScene])

  useFrame((_, delta) => {
    if (!group.current) return
    if (!fitted.current) {
      const bbox = new THREE.Box3().setFromObject(group.current)
      if (bbox.isEmpty()) return
      const center = new THREE.Vector3()
      const size = new THREE.Vector3()
      bbox.getCenter(center)
      bbox.getSize(size)
      const maxDim = Math.max(size.x, size.y, size.z)
      camera.position.set(0, center.y, maxDim * 2.2)
      camera.lookAt(center)
      camera.updateProjectionMatrix()
      fitted.current = true
    }
    if (Object.keys(actions).length === 0) {
      group.current.rotation.y += delta * 0.8
    }
  })

  return (
    <group ref={group}>
      <primitive object={clonedScene} />
    </group>
  )
}

function ModelSwitch({ url }: { url: string }) {
  const isFBX = url.toLowerCase().endsWith('.fbx')
  return isFBX ? <FBXModel url={url} /> : <GLTFModel url={url} />
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
          <ModelSwitch url={modelUrl} />
        </Canvas>
      </Suspense>
    </div>
  )
}
