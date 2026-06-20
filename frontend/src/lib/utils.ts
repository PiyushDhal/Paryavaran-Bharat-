import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function riskColor(value: number) {
  if (value >= 80) return "text-red-300";
  if (value >= 60) return "text-amber-300";
  if (value >= 35) return "text-emerald-200";
  return "text-emerald-300";
}

export function riskFill(value: number) {
  if (value >= 80) return "#f87171";
  if (value >= 60) return "#fbbf24";
  if (value >= 35) return "#34D399";
  return "#34d399";
}

export function formatNumber(value: number, suffix = "") {
  return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value)}${suffix}`;
}
