"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
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
  PanelLeftOpen,
  Sun,
  Moon
} from "lucide-react";

import {
  FilledDashboard,
  FilledDigitalTwin,
  FilledAnalytics,
  FilledRiskCenter,
  FilledComparison,
  FilledSimulator,
  FilledTimeline,
  FilledCopilot,
  FilledReport,
  FilledDataSources,
  FilledSettings,
  FilledProfile
} from "@/components/icons/FilledIcons";

import { cn } from "@/lib/utils";
import { useClimate } from "@/store/useClimateStore";
import { DistrictSelector } from "@/components/climate/DistrictSelector";
import { StateSelector } from "@/components/climate/StateSelector";

const navSections = [
  {
    label: "Intelligence",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: FilledDashboard },
      { href: "/map", label: "Digital Twin", icon: FilledDigitalTwin },
      { href: "/analytics", label: "Climate Analytics", icon: FilledAnalytics },
      { href: "/risk-center", label: "Risk Center", icon: FilledRiskCenter },
      { href: "/compare", label: "District Comparison", icon: FilledComparison }
    ]
  },
  {
    label: "Operations",
    items: [
      { href: "/simulator", label: "Scenario Simulator", icon: FilledSimulator },
      { href: "/timeline", label: "Climate Timeline", icon: FilledTimeline },
      { href: "/copilot", label: "Bharat Climate Intelligence", icon: FilledCopilot },
      { href: "/reports", label: "AI Report", icon: FilledReport }
    ]
  },
  {
    label: "System",
    items: [
      { href: "/data-sources", label: "Data Sources", icon: FilledDataSources },
      { href: "/admin", label: "Settings", icon: FilledSettings },
      { href: "/register", label: "Profile", icon: FilledProfile }
    ]
  }
];

function URLSyncHandler() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const {
    activeYear,
    setActiveYear,
    selectedDistrictId,
    setSelectedDistrictId,
    activeLayer,
    setActiveLayer,
    activeRisk,
    setActiveRisk,
    selectedStateId,
    setSelectedStateId
  } = useClimate();

  // 1. Sync from URL to Store on mount / query param change
  useEffect(() => {
    const qDistrictId = searchParams.get("district_id");
    const qStateId = searchParams.get("state_id");
    const qYear = searchParams.get("year");
    const qLayer = searchParams.get("layer");
    const qRisk = searchParams.get("risk");

    if (qDistrictId) {
      const parsed = Number(qDistrictId);
      if (!isNaN(parsed) && parsed !== selectedDistrictId) {
        setSelectedDistrictId(parsed);
      }
    }
    if (qStateId) {
      const parsed = Number(qStateId);
      if (!isNaN(parsed) && parsed !== selectedStateId) {
        setSelectedStateId(parsed);
      }
    }
    if (qYear) {
      const parsed = Number(qYear);
      if (!isNaN(parsed) && parsed !== activeYear) {
        setActiveYear(parsed);
      }
    }
    if (qLayer && qLayer !== activeLayer) {
      setActiveLayer(qLayer);
    }
    if (qRisk && qRisk !== activeRisk) {
      setActiveRisk(qRisk);
    }
  }, [searchParams]);

  // 2. Sync from Store to URL to persist state across page transitions
  useEffect(() => {
    if (pathname === "/") return;
    
    const params = new URLSearchParams(window.location.search);
    let changed = false;

    const setOrDelete = (key: string, val: string | number | undefined | null) => {
      if (val !== undefined && val !== null && val !== "") {
        if (params.get(key) !== String(val)) {
          params.set(key, String(val));
          changed = true;
        }
      } else {
        if (params.has(key)) {
          params.delete(key);
          changed = true;
        }
      }
    };

    setOrDelete("district_id", selectedDistrictId);
    setOrDelete("state_id", selectedStateId);
    setOrDelete("year", activeYear);
    setOrDelete("layer", activeLayer);
    setOrDelete("risk", activeRisk);

    if (changed) {
      const newSearch = params.toString();
      const newUrl = `${pathname}${newSearch ? "?" + newSearch : ""}`;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, "", newUrl);
    }
  }, [selectedDistrictId, selectedStateId, activeYear, activeLayer, activeRisk, pathname]);

  return null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("Dr. Amit Sharma");
  const [userRole, setUserRole] = useState("Director (Operations)");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTheme = window.localStorage.getItem("theme") as "light" | "dark" | null;
      if (storedTheme) {
        setTheme(storedTheme);
        if (storedTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } else {
        const isDark = document.documentElement.classList.contains("dark");
        setTheme(isDark ? "dark" : "light");
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("theme", nextTheme);
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("bct_sidebar_collapsed", String(newState));
    }
  };

  const { 
    activeYear, 
    setActiveYear, 
    selectedDistrictId, 
    setSelectedDistrictId,
    selectedStateId,
    setSelectedStateId
  } = useClimate();

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
      <Suspense fallback={null}>
        <URLSyncHandler />
      </Suspense>
      {/* ── Desktop sidebar ────────────────────────────────────── */}
      <aside className={cn("fixed left-0 top-0 z-40 hidden h-screen border-r border-border bg-background py-5 lg:flex lg:flex-col transition-all duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.2)]", isCollapsed ? "w-[88px] px-2" : "w-72 px-4")}>
        <div className="flex items-center justify-between px-2 mb-6">
          <Link href="/" className={cn("flex items-center gap-3", isCollapsed && "justify-center w-full")}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-brand-blue shadow-[0_4px_14px_0_rgba(77,168,218,0.25)] overflow-hidden">
              <Image src="/logo.jpg" alt="Logo" width={40} height={40} className="object-cover" />
            </span>
            {!isCollapsed && (
              <span className="whitespace-nowrap overflow-hidden font-orbitron">
                <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-brand-titanium leading-none mb-1">
                  Bharat
                </span>
                <span className="block text-sm font-bold tracking-[0.08em] text-white leading-none">
                  Climate Twin
                </span>
              </span>
            )}
          </Link>
          {!isCollapsed && (
            <button onClick={toggleSidebar} className="text-muted-foreground hover:text-white transition ml-2 shrink-0">
              <PanelLeftClose className="h-5 w-5" />
            </button>
          )}
        </div>
        {isCollapsed && (
          <div className="flex justify-center mb-2">
            <button onClick={toggleSidebar} className="text-muted-foreground hover:text-white transition">
              <PanelLeftOpen className="h-5 w-5" />
            </button>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
          {navSections.map((section) => (
            <div key={section.label} className="mb-6">
              {!isCollapsed ? (
                <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground whitespace-nowrap overflow-hidden">
                  {section.label}
                </p>
              ) : (
                <div className="h-px bg-white/5 mb-4 mx-4" />
              )}
              <div className="grid gap-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={isCollapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-4 text-sm transition-all duration-200 whitespace-nowrap overflow-hidden group p-2 rounded-[16px]",
                        active ? "bg-card-bg shadow-md border border-border" : "hover:bg-surface-elevated",
                        isCollapsed ? "justify-center" : "px-3"
                      )}
                    >
                      <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] transition-all duration-300 relative overflow-hidden",
                        active 
                          ? "bg-transparent text-brand-blue" 
                          : "bg-surface text-brand-titanium group-hover:bg-surface-elevated group-hover:text-brand-blue shadow-sm"
                      )}>
                        {active && (
                          <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-brand-blue rounded-r-md opacity-80" />
                        )}
                        <Icon className="h-5 w-5" />
                      </div>
                      {!isCollapsed && <span className={cn(active ? "text-white font-semibold" : "text-muted-foreground group-hover:text-white font-medium")}>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border pt-4 mt-2 text-center overflow-hidden">
          {!isCollapsed ? (
            <p className="text-[10px] uppercase tracking-[0.15em] text-brand-blue/50 font-bold whitespace-nowrap">
              IMD & ISRO Connected
            </p>
          ) : (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] overflow-hidden mx-auto opacity-50">
              <Image src="/logo.jpg" alt="Logo" width={20} height={20} className="object-cover grayscale" />
            </span>
          )}
        </div>
      </aside>

      {/* ── Mobile drawer overlay ──────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-white/[0.08] bg-background px-4 py-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <Link href="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 border border-brand-blue/20 overflow-hidden">
                  <Image src="/logo.jpg" alt="Logo" width={48} height={48} className="object-cover" />
                </span>
                <span className="font-semibold text-white">Bharat Climate Twin</span>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav>
              {navSections.map((section) => (
                <div key={section.label} className="mb-5">
                  <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
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
                          "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-secondary-foreground transition",
                          pathname === item.href && "bg-brand-blue/10 text-white",
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
      <header className={cn("sticky top-0 z-30 border-b border-border bg-background/84 px-4 py-3 backdrop-blur-2xl transition-all duration-300", isCollapsed ? "lg:ml-20" : "lg:ml-72")}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setMobileOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-md border border-white/[0.08] bg-white/5 text-emerald-100 lg:hidden shrink-0"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/" className="flex items-center gap-2 lg:hidden shrink-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 border border-brand-blue/20 overflow-hidden">
                <Image src="/logo.jpg" alt="Logo" width={40} height={40} className="object-cover" />
              </span>
              <span className="font-semibold text-sm">Bharat Climate Twin</span>
            </Link>
            
            {/* ── Global Context Command Bar ── */}
            <div className="hidden lg:flex items-center gap-3 flex-1">
              <div className="w-[180px]">
                <StateSelector 
                  value={selectedStateId} 
                  onChange={(stateId) => {
                    setSelectedStateId(stateId);
                    setSelectedDistrictId(undefined);
                  }}
                />
              </div>
              <div className="w-[180px]">
                <DistrictSelector 
                  value={selectedDistrictId} 
                  onChange={setSelectedDistrictId} 
                  stateId={selectedStateId}
                />
              </div>
              <div className="w-[120px]">
                <select
                  value={activeYear}
                  onChange={(e) => setActiveYear(Number(e.target.value))}
                  className="h-10 w-full rounded-md border border-white/[0.08] bg-background/70 px-3 text-sm font-medium text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                >
                  <option value={2026}>2026 (Current)</option>
                  <option value={2030}>2030 (Projected)</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden rounded-md border border-white/[0.08] bg-brand-blue/10 px-3 py-1.5 text-xs text-emerald-100 sm:flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-blue animate-pulse" />
              Live feeds active
            </div>


            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="grid h-9 w-9 place-items-center rounded-md border border-border bg-surface/40 hover:bg-surface-elevated text-secondary-foreground transition-all duration-200 cursor-pointer"
              title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {theme === "dark" ? (
                <Sun className="h-4.5 w-4.5 text-amber-400" />
              ) : (
                <Moon className="h-4.5 w-4.5 text-indigo-600" />
              )}
            </button>

            {/* Profile / Auth Relocation */}
            <div className="h-8 w-px bg-surface-elevated" />
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <div className="hidden text-right md:block">
                  <p className="text-xs font-semibold text-white">{userName}</p>
                  <p className="text-[10px] text-muted-foreground">{userRole}</p>
                </div>
                <div className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.08] bg-brand-blue/10 text-emerald-200" title={`${userName} (${userRole})`}>
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
                className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-brand-blue/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-brand-blue/10 transition-all shadow-glow"
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
