"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  successful: number;
  failed: number;
  abandoned: number;
}

export function RevenueVsFailedChart({ successful, failed, abandoned }: Props) {
  const data = [
    { name: "Successful", value: successful, fill: "#059669" },
    { name: "Failed", value: failed, fill: "#DC2626" },
    { name: "Abandoned", value: abandoned, fill: "#F59E0B" },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue vs Failed Transactions</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R ${(v / 1000).toFixed(0)}K`} />
          <Tooltip formatter={(v) => `R ${Number(v).toLocaleString("en-ZA")}`} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
