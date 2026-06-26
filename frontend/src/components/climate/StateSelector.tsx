"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { State } from "@/lib/types";

export function StateSelector({
  value,
  onChange
}: {
  value: number | "";
  onChange: (stateId: number | "") => void;
}) {
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    api.states()
      .then((items) => {
        if (!cancelled) {
          setStates(items);
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
  }, []);

  return (
    <select
      value={value}
      disabled={loading}
      onChange={(event) => {
        const val = event.target.value;
        onChange(val === "" ? "" : Number(val));
      }}
      className="h-10 w-full rounded-md border border-input bg-background/70 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-50 disabled:cursor-wait"
    >
      {loading ? (
        <option value="">Loading states...</option>
      ) : error ? (
        <option value="">Error loading states — retry</option>
      ) : (
        <>
          <option value="">National / All States</option>
          {states.map((state) => (
            <option key={state.id} value={state.id}>
              {state.name}
            </option>
          ))}
        </>
      )}
    </select>
  );
}
