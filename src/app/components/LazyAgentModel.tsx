'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'

const AgentModel = dynamic(() => import('./AgentModel'), {
  ssr: false,
  loading: () => (
    <div className="w-[200px] h-[200px] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
})

export default function LazyAgentModel({ modelUrl, className = '' }: { modelUrl: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { rootMargin: '200px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} className={className}>
      {visible ? (
        <AgentModel modelUrl={modelUrl} />
      ) : (
        <div className="w-[200px] h-[200px]" />
      )}
    </div>
  )
}
