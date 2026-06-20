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
  FileText,
  Scale,
  CalendarRange,
  LogOut,
  UserCheck,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useClimate } from "@/store/useClimateStore";
import { DistrictSelector } from "@/components/climate/DistrictSelector";

const navSections = [
  {
    label: "Intelligence",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Gauge },
      { href: "/map", label: "Digital Twin Map", icon: Map },
      { href: "/analytics", label: "Climate Analytics", icon: BarChart3 },
      { href: "/risk-center", label: "Risk Center", icon: Activity },
      { href: "/compare", label: "District Comparison", icon: Scale }
    ]
  },
  {
    label: "Operations",
    items: [
      { href: "/simulator", label: "Scenario Simulator", icon: SlidersHorizontal },
      { href: "/timeline", label: "Climate Timeline", icon: CalendarRange },
      { href: "/copilot", label: "AI Copilot", icon: Bot },
      { href: "/reports", label: "AI Report Generator", icon: FileText }
    ]
  },
  {
    label: "System",
    items: [
      { href: "/data-sources", label: "Data Sources", icon: Layers3 },
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("bct_sidebar_collapsed", String(newState));
    }
  };

  const { activeYear, setActiveYear, selectedDistrictId, setSelectedDistrictId } = useClimate();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("bct_sidebar_collapsed");
      if (stored) setIsCollapsed(stored === "true");

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
      <aside className={cn("fixed left-0 top-0 z-40 hidden h-screen border-r border-cyan-300/15 bg-slate-950/82 py-5 backdrop-blur-2xl lg:flex lg:flex-col transition-all duration-300", isCollapsed ? "w-20 px-2" : "w-72 px-4")}>
        <div className="flex items-center justify-between px-2">
          <Link href="/" className={cn("flex items-center gap-3", isCollapsed && "justify-center w-full")}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-cyan-300/30 bg-cyan-400/10">
              <Orbit className="h-6 w-6 animate-spin-slow text-cyan-200" />
            </span>
            {!isCollapsed && (
              <span className="whitespace-nowrap overflow-hidden">
                <span className="block text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
                  Bharat
                </span>
                <span className="block text-lg font-semibold tracking-normal text-white">
                  Climate Twin
                </span>
              </span>
            )}
          </Link>
          {!isCollapsed && (
            <button onClick={toggleSidebar} className="text-slate-400 hover:text-white transition ml-2">
              <PanelLeftClose className="h-5 w-5" />
            </button>
          )}
        </div>
        {isCollapsed && (
          <div className="mt-4 flex justify-center">
            <button onClick={toggleSidebar} className="text-slate-400 hover:text-white transition">
              <PanelLeftOpen className="h-5 w-5" />
            </button>
          </div>
        )}

        <nav className="mt-8 flex-1 overflow-y-auto overflow-x-hidden">
          {navSections.map((section) => (
            <div key={section.label} className="mb-5">
              {!isCollapsed ? (
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap overflow-hidden">
                  {section.label}
                </p>
              ) : (
                <div className="h-4 border-b border-white/5 mb-4 mx-2" />
              )}
              <div className="grid gap-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={isCollapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-md py-2.5 text-sm font-medium text-slate-300 transition whitespace-nowrap overflow-hidden",
                        isCollapsed ? "justify-center px-0" : "px-3",
                        active && "border-l-2 border-cyan-400 bg-cyan-400/12 text-white shadow-glow",
                        !active && "border-l-2 border-transparent hover:bg-white/6 hover:text-white"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-cyan-300/10 pt-4 pb-2 text-center overflow-hidden">
          {!isCollapsed ? (
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-bold whitespace-nowrap">
              IMD & ISRO Connected
            </p>
          ) : (
            <Orbit className="h-4 w-4 text-slate-500 mx-auto" />
          )}
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
      <header className={cn("sticky top-0 z-30 border-b border-cyan-300/15 bg-slate-950/84 px-4 py-3 backdrop-blur-2xl transition-all duration-300", isCollapsed ? "lg:ml-20" : "lg:ml-72")}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setMobileOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-md border border-cyan-300/20 bg-white/5 text-cyan-100 lg:hidden shrink-0"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/" className="flex items-center gap-2 lg:hidden shrink-0">
              <Orbit className="h-5 w-5 text-cyan-200" />
              <span className="font-semibold text-sm">Bharat Climate Twin</span>
            </Link>
            
            {/* ── Global Context Command Bar ── */}
            <div className="hidden lg:flex items-center gap-3 flex-1">
              <div className="w-[240px]">
                <DistrictSelector 
                  value={selectedDistrictId} 
                  onChange={setSelectedDistrictId} 
                />
              </div>
              <div className="w-[140px]">
                <select
                  value={activeYear}
                  onChange={(e) => setActiveYear(Number(e.target.value))}
                  className="h-10 w-full rounded-md border border-cyan-500/20 bg-slate-950/70 px-3 text-sm font-medium text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                >
                  <option value={2025}>2025 (Current)</option>
                  <option value={2030}>2030 (Projected)</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden rounded-md border border-emerald-300/25 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-100 sm:flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live feeds active
            </div>


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

      <main className={cn("px-4 py-5 lg:px-8 transition-all duration-300", isCollapsed ? "lg:ml-20" : "lg:ml-72")}>{children}</main>
    </div>
  );
}
