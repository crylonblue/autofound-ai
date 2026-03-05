import { Separator } from "@/components/ui/separator";

export default function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <Separator className="mb-8 bg-white/5" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-zinc-600">
          <span>
            &copy; {new Date().getFullYear()} autofound.ai &mdash; All rights reserved.
          </span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-zinc-400 transition">Twitter</a>
            <a href="#" className="hover:text-zinc-400 transition">GitHub</a>
            <a href="#" className="hover:text-zinc-400 transition">Discord</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
