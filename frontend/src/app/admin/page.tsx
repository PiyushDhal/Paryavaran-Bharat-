"use client";

import { useEffect, useState } from "react";
import { Database, LockKeyhole, ServerCog } from "lucide-react";

import { MetricCard } from "@/components/climate/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

type AdminOverview = Awaited<ReturnType<typeof api.adminOverview>>;

export default function AdminPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.adminOverview().then(setOverview).catch(() => setError("Admin token required. Sign in with admin@bharatclimatetwin.in."));
  }, []);

  return (
    <div className="grid gap-5">
      <div>
        <Badge>Admin Panel</Badge>
        <h1 className="mt-3 text-3xl font-semibold text-white font-orbitron tracking-[0.12em] uppercase">Platform Operations</h1>
        <p className="mt-2 max-w-3xl text-sm text-secondary-foreground">
          Role-protected overview of users, feeds, climate records, predictions, simulations, and integration readiness.
        </p>
      </div>

      {error ? (
        <Card>
          <CardContent className="flex items-center gap-3 p-5 text-amber-100">
            <LockKeyhole className="h-5 w-5" />
            {error}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Users" value={`${overview?.users ?? "--"}`} detail="JWT accounts" icon={LockKeyhole} />
        <MetricCard title="Districts" value={`${overview?.districts ?? "--"}`} detail="PostGIS entities" icon={Database} tone="titanium" />
        <MetricCard title="Risk Scores" value={`${overview?.risk_scores ?? "--"}`} detail="Historical scores" icon={ServerCog} tone="titanium" />
        <MetricCard title="Simulations" value={`${overview?.simulations ?? "--"}`} detail="Scenario runs" icon={ServerCog} tone="blue" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Integration Readiness</CardTitle>
          <CardDescription>Reusable service boundaries for national climate data providers.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {overview?.integrations.map((integration) => (
            <div key={integration.name} className="rounded-md border border-white/[0.08] bg-white/[0.03] p-4">
              <h3 className="text-sm font-semibold text-white">{integration.name}</h3>
              <Badge className="mt-3">{integration.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
