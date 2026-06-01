"use client";

import { useState, useEffect } from "react";

export type RangePreset = "7d" | "14d" | "30d" | "mtd" | "last_month" | "custom";

export interface DateRangeValue {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  preset: RangePreset;
}

function fmt(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function rangeFromPreset(preset: RangePreset, today: Date = new Date()): DateRangeValue {
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  let start = new Date(end);

  if (preset === "7d") start.setUTCDate(end.getUTCDate() - 6);
  else if (preset === "14d") start.setUTCDate(end.getUTCDate() - 13);
  else if (preset === "30d") start.setUTCDate(end.getUTCDate() - 29);
  else if (preset === "mtd") start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  else if (preset === "last_month") {
    start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, 1));
    const endLast = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 0));
    return { start: fmt(start), end: fmt(endLast), preset };
  }
  return { start: fmt(start), end: fmt(end), preset };
}

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "14d", label: "Last 14 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "mtd", label: "Month to date" },
  { value: "last_month", label: "Last month" },
  { value: "custom", label: "Custom range" },
];

interface Props {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
}

export function DateRangePicker({ value, onChange }: Props) {
  const [customStart, setCustomStart] = useState(value.start);
  const [customEnd, setCustomEnd] = useState(value.end);

  useEffect(() => {
    setCustomStart(value.start);
    setCustomEnd(value.end);
  }, [value.start, value.end]);

  function handlePresetChange(preset: RangePreset) {
    if (preset === "custom") {
      onChange({ ...value, preset });
    } else {
      onChange(rangeFromPreset(preset));
    }
  }

  function commitCustom() {
    if (customStart && customEnd && customStart <= customEnd) {
      onChange({ start: customStart, end: customEnd, preset: "custom" });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={value.preset}
        onChange={(e) => handlePresetChange(e.target.value as RangePreset)}
        className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
      >
        {PRESETS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      {value.preset === "custom" ? (
        <>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            onBlur={commitCustom}
            className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            onBlur={commitCustom}
            className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900"
          />
        </>
      ) : (
        <span className="text-xs text-gray-500">
          {value.start} → {value.end}
        </span>
      )}
    </div>
  );
}
