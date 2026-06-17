"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export function TrendAreaChart({
  data,
  dataKey,
  color,
  unit = ""
}: {
  data: Array<Record<string, number | string>>;
  dataKey: string;
  color: string;
  unit?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`${dataKey}-gradient`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.48} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
        <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: "#07111f",
            border: "1px solid rgba(103,232,249,0.25)",
            borderRadius: 8,
            color: "#e0f2fe"
          }}
          formatter={(value) => [`${value}${unit}`, dataKey]}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          fill={`url(#${dataKey}-gradient)`}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RiskLineChart({ data }: { data: Array<Record<string, number | string>> }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
        <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: "#07111f",
            border: "1px solid rgba(103,232,249,0.25)",
            borderRadius: 8,
            color: "#e0f2fe"
          }}
        />
        <Legend
          wrapperStyle={{ paddingTop: 12, fontSize: 11, color: "#94a3b8" }}
          formatter={(value) => <span className="capitalize text-slate-300">{value.replace("_", " ")}</span>}
        />
        <Line type="monotone" name="flood" dataKey="flood" stroke="#38bdf8" strokeWidth={2} dot={false} />
        <Line type="monotone" name="drought" dataKey="drought" stroke="#fbbf24" strokeWidth={2} dot={false} />
        <Line type="monotone" name="heatwave" dataKey="heatwave" stroke="#f87171" strokeWidth={2} dot={false} />
        <Line type="monotone" name="water_stress" dataKey="water_stress" stroke="#34d399" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function RankingBarChart({ data }: { data: Array<{ district: string; risk: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
        <XAxis dataKey="district" stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: "#07111f",
            border: "1px solid rgba(103,232,249,0.25)",
            borderRadius: 8,
            color: "#e0f2fe"
          }}
        />
        <Bar dataKey="risk" fill="#22d3ee" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
