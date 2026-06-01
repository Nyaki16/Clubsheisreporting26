import type { Fatigue } from "@/lib/meta/types";

const COLOR: Record<Fatigue, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
};

const LABEL: Record<Fatigue, string> = {
  green: "Healthy frequency",
  amber: "Approaching fatigue",
  red: "Fatigued — frequency above 4",
};

export function FatigueDot({ level }: { level: Fatigue }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${COLOR[level]}`}
      title={LABEL[level]}
      aria-label={LABEL[level]}
    />
  );
}
