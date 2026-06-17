"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  Cpu,
  Gauge,
  History,
  Home,
  Layers3,
  LockKeyhole,
  Map,
  Menu,
  Orbit,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  UserPlus,
  X,
  BookOpen,
  FileText,
  Scale,
  CalendarRange,
  Leaf,
  LogOut,
  UserCheck
} from "lucide-react";

import { cn } from "@/lib/utils";

const navSections = [
  {
    label: "Intelligence",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Gauge },
      { href: "/map", label: "Digital Twin Map", icon: Map },
      { href: "/analytics", label: "Climate Analytics", icon: BarChart3 },
      { href: "/risk-center", label: "Risk Center", icon: Activity },
      { href: "/compare", label: "District Comparison", icon: Scale },
      { href: "/sustainability", label: "Sustainability Index", icon: Leaf }
    ]
  },
  {
    label: "Operations",
    items: [
      { href: "/simulator", label: "Scenario Simulator", icon: SlidersHorizontal },
      { href: "/timeline", label: "Climate Timeline", icon: CalendarRange },
      { href: "/copilot", label: "AI Copilot", icon: Bot },
      { href: "/reports", label: "AI Report Generator", icon: FileText },
      { href: "/story", label: "Story Mode", icon: BookOpen },
      { href: "/history", label: "Explorer", icon: History }
    ]
  },
  {
    label: "System",
    items: [
      { href: "/admin", label: "Admin Panel", icon: Settings },
      { href: "/register", label: "Register Operator", icon: UserPlus }
    ]
  }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("Dr. Amit Sharma");
  const [userRole, setUserRole] = useState("Director (Operations)");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("bct_token");
      setIsLoggedIn(!!token);
      if (token) {
        setUserName("Dr. Amit Sharma");
        setUserRole("Director (Ops)");
      }
    }
  }, [pathname]);

  if (isLanding) return <>{children}</>;

  return (
    <div className="min-h-screen bg-radar-grid bg-[size:44px_44px]">
      {/* ── Desktop sidebar ────────────────────────────────────── */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 border-r border-cyan-300/15 bg-slate-950/82 px-4 py-5 backdrop-blur-2xl lg:flex lg:flex-col">
        <Link href="/" className="flex items-center gap-3 px-2">
          <span className="grid h-11 w-11 place-items-center rounded-md border border-cyan-300/30 bg-cyan-400/10">
            <Orbit className="h-6 w-6 animate-spin-slow text-cyan-200" />
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

        <nav className="mt-8 flex-1 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.label} className="mb-5">
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                {section.label}
              </p>
              <div className="grid gap-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-300 transition",
                        active && "border-l-2 border-cyan-400 bg-cyan-400/12 text-white shadow-glow",
                        !active && "border-l-2 border-transparent hover:bg-white/6 hover:text-white"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-cyan-300/10 pt-4 pb-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-bold">
            IMD & ISRO Connected
          </p>
        </div>
      </aside>

      {/* ── Mobile drawer overlay ──────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-cyan-300/15 bg-slate-950 px-4 py-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <Link href="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
                <Orbit className="h-6 w-6 text-cyan-200" />
                <span className="font-semibold text-white">Bharat Climate Twin</span>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav>
              {navSections.map((section) => (
                <div key={section.label} className="mb-5">
                  <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    {section.label}
                  </p>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-300 transition",
                          pathname === item.href && "bg-cyan-400/12 text-white",
                          pathname !== item.href && "hover:bg-white/6"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* ── Top header bar ─────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-cyan-300/15 bg-slate-950/84 px-4 py-3 backdrop-blur-2xl lg:ml-72">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-md border border-cyan-300/20 bg-white/5 text-cyan-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <Orbit className="h-5 w-5 text-cyan-200" />
              <span className="font-semibold text-sm">Bharat Climate Twin</span>
            </Link>
            <div className="hidden text-sm text-muted-foreground lg:block">
              National Climate Digital Twin Command Layer
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-md border border-emerald-300/25 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-100 sm:flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live feeds active
            </div>
            <Link
              href="/alerts"
              className="relative grid h-10 w-10 place-items-center rounded-md border border-cyan-300/20 bg-white/5 text-cyan-100 hover:bg-white/10 transition"
              aria-label="Alerts"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                3
              </span>
            </Link>

            {/* Profile / Auth Relocation */}
            <div className="h-8 w-px bg-slate-800" />
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <div className="hidden text-right md:block">
                  <p className="text-xs font-semibold text-white">{userName}</p>
                  <p className="text-[10px] text-slate-400">{userRole}</p>
                </div>
                <div className="grid h-9 w-9 place-items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-200" title={`${userName} (${userRole})`}>
                  <UserCheck className="h-4 w-4" />
                </div>
                <button
                  onClick={() => {
                    window.localStorage.removeItem("bct_token");
                    setIsLoggedIn(false);
                    window.location.href = "/login";
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-all"
                  title="Sign Out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-md border border-cyan-300/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/20 transition-all shadow-glow"
              >
                <LockKeyhole className="h-3.5 w-3.5" />
                Operator Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="px-4 py-5 lg:ml-72 lg:px-8">{children}</main>
    </div>
  );
}
