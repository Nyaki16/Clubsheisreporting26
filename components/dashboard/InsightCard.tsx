"use client";

import { TrendingUp, DollarSign, Users, AlertTriangle, AlertCircle } from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  "trending-up": TrendingUp,
  "dollar-sign": DollarSign,
  "users": Users,
  "alert-triangle": AlertTriangle,
  "alert-circle": AlertCircle,
};

interface Props {
  icon: string;
  text: string;
  type: "win" | "alert";
}

export function InsightCard({ icon, text, type }: Props) {
  const Icon = iconMap[icon] || TrendingUp;
  const borderColor = type === "win" ? "#059669" : "#DC2626";
  const iconColor = type === "win" ? "#059669" : "#DC2626";

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-start gap-3" style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}>
      <Icon size={20} style={{ color: iconColor, flexShrink: 0, marginTop: 2 }} />
      <p className="text-sm font-medium text-gray-900">{text}</p>
    </div>
  );
}
