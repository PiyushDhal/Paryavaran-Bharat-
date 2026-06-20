import * as React from "react";

import { cn } from "@/lib/utils";

const toneClass: Record<string, string> = {
  low: "border-white/[0.08] bg-brand-blue/10 text-emerald-200",
  moderate: "border-white/[0.08] bg-brand-blue/10 text-emerald-100",
  high: "border-brand-blue/20 bg-brand-blue/10 text-amber-100",
  critical: "border-red-300/40 bg-red-400/12 text-red-100",
  default: "border-white/[0.08] bg-white/5 text-emerald-100"
};

export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold",
        toneClass[tone] ?? toneClass.default,
        className
      )}
      {...props}
    />
  );
}
