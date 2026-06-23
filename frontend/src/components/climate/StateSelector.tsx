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

  useEffect(() => {
    api.states()
      .then((items) => {
        setStates(items);
      })
      .catch(() => undefined);
  }, []);

  return (
    <select
      value={value}
      onChange={(event) => {
        const val = event.target.value;
        onChange(val === "" ? "" : Number(val));
      }}
      className="h-10 w-full rounded-md border border-input bg-background/70 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
    >
      <option value="">National / All States</option>
      {states.map((state) => (
        <option key={state.id} value={state.id}>
          {state.name}
        </option>
      ))}
    </select>
  );
}
