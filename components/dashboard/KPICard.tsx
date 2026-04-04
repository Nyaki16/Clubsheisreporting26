"use client";

import { isInverseMetric, getBadgeColor } from "@/lib/calculations";

interface KPICardProps {
  label: string;
  value: string;
  badge?: string;
  direction?: "up" | "down" | "neutral";
  icon?: string;
}

export function KPICard({ label, value, badge, direction = "neutral" }: KPICardProps) {
  const inverse = isInverseMetric(label);
  const colors = getBadgeColor(direction, inverse);

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
      <p className="text-[0.7rem] uppercase tracking-wider text-gray-500 font-medium mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900 font-sans">{value}</p>
      {badge && (
        <span
          className="inline-block mt-2 text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}
