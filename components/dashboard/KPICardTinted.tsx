"use client";

import { DollarSign, TrendingDown, ShoppingCart, RotateCcw, Percent, Camera, ThumbsUp, Globe, Heart, Eye, BarChart3, Mail } from "lucide-react";

const labelIconMap: Record<string, React.ElementType> = {
  "Total Lost Revenue": DollarSign,
  "Failed Payments": TrendingDown,
  "Abandoned Carts": ShoppingCart,
  "Reversed / Chargebacks": RotateCcw,
  "Revenue Recovery Rate": Percent,
  "Instagram Followers": Camera,
  "Facebook Fans": ThumbsUp,
  "FB Organic Reach": Eye,
  "FB Engagements": Heart,
  "IG Monthly Reach": Eye,
  "Engagement Rate": BarChart3,
  "Email Leads": Mail,
};

interface KPICardTintedProps {
  label: string;
  value: string;
  badge?: string;
  tint: "red" | "green";
}

const tintStyles = {
  red: { bg: "#FEF2F2", border: "#FECACA", badgeBg: "#FEF2F2", badgeText: "#DC2626" },
  green: { bg: "#ECFDF5", border: "#A7F3D0", badgeBg: "#ECFDF5", badgeText: "#059669" },
};

export function KPICardTinted({ label, value, badge, tint }: KPICardTintedProps) {
  const s = tintStyles[tint];
  const IconComponent = labelIconMap[label];
  return (
    <div
      className="rounded-xl px-4 py-3 border"
      style={{ backgroundColor: s.bg, borderColor: s.border }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {IconComponent && <IconComponent className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
        <p className="text-[0.65rem] uppercase tracking-wider text-gray-500 font-medium leading-tight">
          {label}
        </p>
      </div>
      <p className="text-xl font-bold text-gray-900 font-sans">{value}</p>
      {badge && (
        <span
          className="inline-block mt-1.5 text-[0.65rem] font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: s.badgeBg, color: s.badgeText }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}
