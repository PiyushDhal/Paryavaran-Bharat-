import { riskFill } from "@/lib/utils";

export function RiskGauge({
  value,
  label,
  size = "md"
}: {
  value: number;
  label: string;
  size?: "sm" | "md";
}) {
  const radius = size === "sm" ? 38 : 55;
  const strokeWidth = size === "sm" ? 8 : 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(Math.max(value, 0), 100) / 100);
  const color = riskFill(value);

  // Determine severity label
  const getSeverity = (val: number) => {
    if (val >= 75) return { text: "CRITICAL", class: "text-rose-400 glow-rose" };
    if (val >= 50) return { text: "HIGH", class: "text-amber-400 glow-amber" };
    if (val >= 35) return { text: "MODERATE", class: "text-brand-emerald glow-emerald" };
    return { text: "LOW", class: "text-brand-emerald glow-emerald" };
  };
  const severity = getSeverity(value);

  const dimensionClass = size === "sm" ? "w-28 h-28" : "w-42 h-42";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`relative ${dimensionClass} flex items-center justify-center`}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 130 130">
          <circle
            cx="65"
            cy="65"
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx="65"
            cy="65"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-white">{Math.round(value)}</span>
          <span className={`text-[10px] font-bold tracking-widest mt-0.5 ${severity.class}`}>
            {severity.text}
          </span>
        </div>
      </div>
      <p className="text-center text-sm font-semibold tracking-wide text-secondary-foreground">{label}</p>
    </div>
  );
}
