"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  campaigns: { name: string; spend: number }[];
}

export function CampaignSpendChart({ campaigns }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Campaign Spend Comparison</h3>
      <p className="text-xs text-gray-500 mb-4">Ad spend breakdown by individual campaign.</p>
      <ResponsiveContainer width="100%" height={Math.max(200, campaigns.length * 50)}>
        <BarChart data={campaigns} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `R ${v.toLocaleString()}`} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={180} />
          <Tooltip formatter={(v) => `R ${Number(v).toLocaleString("en-ZA")}`} />
          <Bar dataKey="spend" fill="#8B3A62" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
