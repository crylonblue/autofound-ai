'use client'

export default function Error() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold">500</h1>
        <p className="mt-4 text-zinc-400">Something went wrong</p>
      </div>
    </div>
  )
}
