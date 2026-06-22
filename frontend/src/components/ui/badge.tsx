import * as React from "react";

import { cn } from "@/lib/utils";

const toneClass: Record<string, string> = {
  low: "border-border bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  moderate: "border-border bg-emerald-500/10 text-emerald-700 dark:text-emerald-100",
  high: "border-border bg-amber-500/10 text-amber-800 dark:text-amber-100",
  critical: "border-red-500/20 bg-red-500/10 text-red-800 dark:text-red-200",
  default: "border-border bg-slate-500/10 text-slate-800 dark:text-slate-200"
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
