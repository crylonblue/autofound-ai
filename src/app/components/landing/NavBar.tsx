"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="sm:hidden p-2 text-zinc-400 hover:text-white"
        aria-label="Menu"
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d={open ? "M6 6l12 12M6 18L18 6" : "M4 7h16M4 12h16M4 17h16"} />
        </svg>
      </button>
      {open && (
        <div className="absolute top-16 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/5 p-4 flex flex-col gap-4 sm:hidden z-50">
          <a href="#how" onClick={() => setOpen(false)} className="text-zinc-300 hover:text-white">How it works</a>
          <a href="#skills" onClick={() => setOpen(false)} className="text-zinc-300 hover:text-white">Skills</a>
          <a href="#pricing" onClick={() => setOpen(false)} className="text-zinc-300 hover:text-white">Pricing</a>
          <a href="#faq" onClick={() => setOpen(false)} className="text-zinc-300 hover:text-white">FAQ</a>
          <div className="flex gap-3 pt-2 border-t border-white/10">
            <Link href="/sign-in" className="text-sm text-zinc-400 hover:text-white">Sign in</Link>
            <Link href="/sign-up" className="text-sm px-4 py-2 bg-blue-600 rounded-lg font-medium">Get started</Link>
          </div>
        </div>
      )}
    </>
  );
}

export default function NavBar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <span className="text-lg font-bold tracking-tight">
          autofound<span className="text-blue-500">.ai</span>
        </span>
        <div className="hidden sm:flex gap-8 text-sm text-zinc-400">
          <a href="#how" className="hover:text-white transition">How it works</a>
          <a href="#skills" className="hover:text-white transition">Skills</a>
          <a href="#pricing" className="hover:text-white transition">Pricing</a>
          <a href="#faq" className="hover:text-white transition">FAQ</a>
        </div>
        <div className="hidden sm:flex gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/sign-up">Get started</Link>
          </Button>
        </div>
        <MobileMenu />
      </div>
    </nav>
  );
}
