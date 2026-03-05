export default function GradientMeshBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-500/10 blur-[120px] animate-blob-drift-1" />
      <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full bg-violet-500/10 blur-[120px] animate-blob-drift-2" />
      <div className="absolute bottom-1/4 left-1/3 w-72 h-72 rounded-full bg-cyan-500/8 blur-[120px] animate-blob-drift-3" />
    </div>
  );
}
