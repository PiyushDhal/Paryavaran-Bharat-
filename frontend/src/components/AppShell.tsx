"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  Gauge,
  Home,
  Layers3,
  LockKeyhole,
  Map,
  Orbit,
  Settings,
  SlidersHorizontal,
  Workflow,
  CheckCircle,
  AlertOctagon
} from "lucide-react";

import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Mission Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/map", label: "Digital Twin Map", icon: Map },
  { href: "/risk-center", label: "Risk Center", icon: Activity },
  { href: "/simulator", label: "Scenario Simulator", icon: SlidersHorizontal },
  { href: "/analytics", label: "National Analytics", icon: BarChart3 },
  { href: "/architecture", label: "AI Architecture", icon: Workflow },
  { href: "/validation", label: "Model Validation", icon: CheckCircle },
  { href: "/alerts", label: "Emergency Alerts", icon: AlertOctagon },
  { href: "/copilot", label: "AI Copilot", icon: Bot },
  { href: "/login", label: "Sign In", icon: LockKeyhole }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  if (isLanding) return <>{children}</>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 bg-radar-grid bg-[size:24px_24px]">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 border-r border-cyan-300/15 bg-slate-950/80 px-4 py-5 backdrop-blur-2xl lg:block">
        <Link href="/" className="flex items-center gap-3 px-2">
          <span className="grid h-11 w-11 place-items-center rounded-md border border-cyan-300/30 bg-cyan-400/10 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <Orbit className="h-6 w-6 text-cyan-200 animate-spin-slow" />
          </span>
          <span>
            <span className="block text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Bharat
            </span>
            <span className="block text-lg font-semibold tracking-normal text-white">
              Climate Twin
            </span>
          </span>
        </Link>

        <nav className="mt-8 grid gap-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-300 transition",
                  active && "bg-cyan-400/12 text-white border-l-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.1)]",
                  !active && "hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className={`h-4 w-4 ${active ? "text-cyan-400" : "text-slate-400"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <header className="sticky top-0 z-30 border-b border-cyan-300/15 bg-slate-950/80 px-4 py-3 backdrop-blur-2xl lg:ml-72">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <Orbit className="h-6 w-6 text-cyan-200" />
            <span className="font-semibold text-white">Bharat Climate Twin</span>
          </Link>
          <div className="hidden text-sm text-cyan-200/80 lg:block font-medium">
            National Climate Digital Twin Command Layer
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-md border border-emerald-300/25 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-100 sm:block">
              Live mock feeds synced
            </div>
            <Link
              href="/alerts"
              className="grid h-10 w-10 place-items-center rounded-md border border-cyan-300/20 bg-white/5 text-cyan-100 hover:bg-white/10 transition"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {nav.slice(1, 10).map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex min-w-max items-center gap-2 rounded-md border border-cyan-300/15 px-3 py-2 text-xs text-slate-300",
                  active && "bg-cyan-400/12 text-white border-cyan-400"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="px-4 py-5 lg:ml-72 lg:px-8">{children}</main>
    </div>
  );
}
