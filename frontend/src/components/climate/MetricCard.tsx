import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone = "titanium",
  delta,
  source
}: {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "titanium" | "blue" | "red";
  delta?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  source?: string;
}) {
  const toneMap = {
    titanium: {
      text: "text-brand-titanium bg-brand-titanium/10 border-border",
      glow: "glow-titanium text-brand-titanium",
      delta: "text-brand-titanium"
    },
    blue: {
      text: "text-brand-highlight bg-brand-blue/10 border-brand-blue/20",
      glow: "glow-blue text-brand-highlight",
      delta: "text-brand-blue"
    },
    red: {
      text: "text-red-600 dark:text-rose-200 bg-red-500/10 dark:bg-rose-400/10 border-red-500/20 dark:border-rose-300/20",
      glow: "text-red-600 dark:glow-rose dark:text-rose-300",
      delta: "text-red-600 dark:text-rose-400"
    }
  };

  return (
    <Card className="glass-card overflow-hidden group relative">
      {/* Background Icon Watermark with Hover Opacity Transition */}
      <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none transition-all duration-500 group-hover:scale-110 group-hover:opacity-10 text-white">
        <Icon className="h-28 w-28" />
      </div>

      <CardContent className="flex items-center justify-between gap-4 p-5 relative z-10">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-muted-foreground">{title}</p>
          <p className={cn("mt-1.5 text-3xl font-bold tracking-normal", toneMap[tone].glow)}>
            {value}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {delta && (
              <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded bg-slate-500/5 dark:bg-white/5 border border-border", toneMap[tone].delta)}>
                {delta.value}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{detail}</span>
            {source && (
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground bg-surface-elevated/50 px-1.5 py-0.5 rounded border border-border">Source: {source}</span>
            )}
          </div>
        </div>
        <div className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-lg border backdrop-blur-sm transition-transform duration-300 group-hover:scale-105", toneMap[tone].text)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
