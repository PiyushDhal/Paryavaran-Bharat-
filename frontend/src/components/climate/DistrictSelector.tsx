"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { District } from "@/lib/types";

export function DistrictSelector({
  value,
  onChange,
  stateId
}: {
  value?: number;
  onChange: (districtId: number | undefined) => void;
  stateId?: number | "";
}) {
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    api.districts(stateId || undefined)
      .then((items) => {
        if (!cancelled) {
          setDistricts(items);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [stateId]);

  return (
    <select
      value={value ?? ""}
      disabled={loading}
      onChange={(event) => {
        const val = event.target.value;
        onChange(val === "" ? undefined : Number(val));
      }}
      className="h-10 w-full rounded-md border border-input bg-background/70 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-50 disabled:cursor-wait"
    >
      {loading ? (
        <option value="">Loading districts...</option>
      ) : error ? (
        <option value="">Error loading districts — retry</option>
      ) : (
        <>
          <option value="">National / All Districts</option>
          {districts.map((district) => (
            <option key={district.id} value={district.id}>
              {district.name}{!stateId ? `, ${district.state_name}` : ""}
            </option>
          ))}
        </>
      )}
    </select>
  );
}
