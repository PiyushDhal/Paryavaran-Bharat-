"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { District } from "@/lib/types";

export function DistrictSelector({
  value,
  onChange
}: {
  value?: number;
  onChange: (districtId: number | undefined) => void;
}) {
  const [districts, setDistricts] = useState<District[]>([]);

  useEffect(() => {
    api.districts().then((items) => {
      setDistricts(items);
    });
  }, []);

  return (
    <select
      value={value ?? ""}
      onChange={(event) => {
        const val = event.target.value;
        onChange(val === "" ? undefined : Number(val));
      }}
      className="h-10 w-full rounded-md border border-input bg-[#0B1220]/70 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
    >
      <option value="">National / All Districts</option>
      {districts.map((district) => (
        <option key={district.id} value={district.id}>
          {district.name}, {district.state_name}
        </option>
      ))}
    </select>
  );
}
