'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment } from '@react-three/drei'
import { Suspense } from 'react'

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} scale={1} position={[0, -0.8, 0]} />
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
          camera={{ position: [0, 0.5, 2.5], fov: 40 }}
          gl={{ alpha: true }}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <Model url={modelUrl} />
          <OrbitControls
            autoRotate
            autoRotateSpeed={2}
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI / 2}
          />
          <Environment preset="city" />
        </Canvas>
      </Suspense>
    </div>
  )
}
