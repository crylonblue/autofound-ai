import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="mt-4 text-zinc-400">Page not found</p>
        <Link href="/" className="mt-6 inline-block text-blue-500 hover:text-blue-400">← Back home</Link>
      </div>
    </div>
  )
}
