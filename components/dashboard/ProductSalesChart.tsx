"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Props {
  data: { name: string; count: number; revenue?: number }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const revenueFormatter = (value: any, name: any) => {
  if (String(name) === "Revenue") return `R ${Number(value).toLocaleString()}`;
  return Number(value).toLocaleString();
};

export function ProductSalesChart({ data }: Props) {
  const hasRevenue = data.some(d => d.revenue && d.revenue > 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Product Sales Breakdown</h3>
      <p className="text-xs text-gray-500 mb-4">Sales and revenue by product.</p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={80} />
          {hasRevenue ? (
            <>
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `R ${v >= 1000 ? (v / 1000).toFixed(0) + "K" : v}`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            </>
          ) : (
            <YAxis tick={{ fontSize: 12 }} />
          )}
          <Tooltip formatter={revenueFormatter} />
          <Legend />
          {hasRevenue ? (
            <>
              <Bar yAxisId="left" dataKey="revenue" fill="#059669" name="Revenue" radius={[6, 6, 0, 0]} />
              <Bar yAxisId="right" dataKey="count" fill="#8B3A62" name="Sales" radius={[6, 6, 0, 0]} />
            </>
          ) : (
            <Bar dataKey="count" fill="#8B3A62" name="Sales" radius={[6, 6, 0, 0]} />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
