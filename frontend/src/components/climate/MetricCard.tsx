import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone = "cyan",
  delta,
  source
}: {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "cyan" | "emerald" | "amber" | "red";
  delta?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  source?: string;
}) {
  const toneMap = {
    cyan: {
      text: "text-cyan-200 bg-cyan-400/10 border-cyan-300/20",
      glow: "glow-cyan text-cyan-300",
      delta: "text-cyan-400"
    },
    emerald: {
      text: "text-emerald-200 bg-emerald-400/10 border-emerald-300/20",
      glow: "glow-emerald text-emerald-300",
      delta: "text-emerald-400"
    },
    amber: {
      text: "text-amber-200 bg-amber-400/10 border-amber-300/20",
      glow: "glow-amber text-amber-300",
      delta: "text-amber-400"
    },
    red: {
      text: "text-rose-200 bg-rose-400/10 border-rose-300/20",
      glow: "glow-rose text-rose-300",
      delta: "text-rose-400"
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
          <p className="truncate text-sm font-medium text-slate-400">{title}</p>
          <p className={cn("mt-1.5 text-3xl font-bold tracking-normal", toneMap[tone].glow)}>
            {value}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {delta && (
              <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10", toneMap[tone].delta)}>
                {delta.value}
              </span>
            )}
            <span className="text-xs text-slate-500">{detail}</span>
            {source && (
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-600 bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-700/50">Source: {source}</span>
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
