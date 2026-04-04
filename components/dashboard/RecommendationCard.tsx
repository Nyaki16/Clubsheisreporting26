"use client";

import { FocusArea } from "@/types/dashboard";

const priorityColors = {
  high: { bg: "#FEF2F2", border: "#DC2626", text: "#DC2626" },
  medium: { bg: "#FFF7ED", border: "#F59E0B", text: "#D97706" },
  low: { bg: "#ECFDF5", border: "#059669", text: "#059669" },
};

export function RecommendationCard({ priority, area, recommendation }: FocusArea) {
  const colors = priorityColors[priority];

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4" style={{ borderLeftWidth: 4, borderLeftColor: colors.border }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold uppercase px-2 py-0.5 rounded" style={{ backgroundColor: colors.bg, color: colors.text }}>
          {priority}
        </span>
        <span className="text-sm font-semibold text-gray-900">{area}</span>
      </div>
      <p className="text-sm text-gray-600">{recommendation}</p>
    </div>
  );
}
