"use client";

import { ArrowRight } from "lucide-react";

interface StrategyItem {
  title: string;
  insight: string;
  action: string;
  impact: "high" | "medium" | "low";
}

interface Props {
  title: string;
  emoji: string;
  items: StrategyItem[];
  color: "emerald" | "blue" | "purple" | "red";
}

const colorStyles = {
  emerald: { border: "#059669", bg: "#ECFDF5", badge: { high: "#059669", medium: "#10B981", low: "#6EE7B7" } },
  blue: { border: "#2563EB", bg: "#EFF6FF", badge: { high: "#2563EB", medium: "#3B82F6", low: "#93C5FD" } },
  purple: { border: "#7C3AED", bg: "#F5F3FF", badge: { high: "#7C3AED", medium: "#8B5CF6", low: "#C4B5FD" } },
  red: { border: "#DC2626", bg: "#FEF2F2", badge: { high: "#DC2626", medium: "#EF4444", low: "#FCA5A5" } },
};

export function StrategySection({ title, emoji, items, color }: Props) {
  const styles = colorStyles[color];

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
        <span>{emoji}</span> {title}
      </h3>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="bg-white border border-gray-200 rounded-xl px-5 py-4"
            style={{ borderLeftWidth: 4, borderLeftColor: styles.border }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-gray-900">{item.title}</h4>
                  <span
                    className="text-[0.6rem] font-bold uppercase px-1.5 py-0.5 rounded text-white"
                    style={{ backgroundColor: styles.badge[item.impact] }}
                  >
                    {item.impact}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{item.insight}</p>
                <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: styles.border }}>
                  <ArrowRight size={14} />
                  <span>{item.action}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
