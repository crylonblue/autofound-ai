"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Users,
  GitBranchPlus,
  ListTodo,
  Settings,
  Zap,
  Menu,
  X,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agents", label: "Agents", icon: Users },
  { href: "/org-chart", label: "Org Chart", icon: GitBranchPlus },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/settings", label: "Settings", icon: Settings },
];

function UserSync() {
  const { user, isLoaded } = useUser();
  const createOrGetUser = useMutation(api.users.createOrGetUser);
  const synced = useRef(false);

  useEffect(() => {
    if (isLoaded && user && !synced.current) {
      synced.current = true;
      createOrGetUser({
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? "",
        name: user.fullName ?? undefined,
        imageUrl: user.imageUrl ?? undefined,
      }).catch(() => {});
    }
  }, [isLoaded, user, createOrGetUser]);

  return null;
}

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      <div className="p-6 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={onNavigate}>
          <Zap className="w-6 h-6 text-blue-500" />
          <span className="font-bold text-lg">autofound.ai</span>
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-500/10 text-blue-400"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="text-xs text-zinc-600">Free Plan · 3 agents</div>
      </div>
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white">
      <UserSync />

      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 h-14 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/10 flex items-center px-4 md:hidden">
        <button onClick={() => setSidebarOpen(true)} className="p-2 text-zinc-400 hover:text-white">
          <Menu className="w-5 h-5" />
        </button>
        <span className="ml-2 font-bold text-sm">autofound<span className="text-blue-500">.ai</span></span>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 h-full bg-[#0a0a0a] border-r border-white/10 flex flex-col">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <SidebarContent pathname={pathname} onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 border-r border-white/10 flex-col">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">{children}</main>
    </div>
  );
}
