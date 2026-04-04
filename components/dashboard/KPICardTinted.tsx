"use client";

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
  return (
    <div
      className="rounded-xl px-5 py-4 border"
      style={{ backgroundColor: s.bg, borderColor: s.border }}
    >
      <p className="text-[0.7rem] uppercase tracking-wider text-gray-500 font-medium mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900 font-sans">{value}</p>
      {badge && (
        <span
          className="inline-block mt-2 text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ backgroundColor: s.badgeBg, color: s.badgeText }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}
