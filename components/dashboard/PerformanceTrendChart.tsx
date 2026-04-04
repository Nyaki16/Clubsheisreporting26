"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { PerformanceTrend } from "@/types/dashboard";

export function PerformanceTrendChart({ data }: { data: PerformanceTrend }) {
  const revenueData = data.revenue || data.socialReach || [];
  const chartData = data.labels.map((label, i) => ({
    name: label,
    revenue: revenueData[i] || 0,
    adSpend: data.adSpend[i],
    contacts: data.newContacts[i],
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tooltipFormatter = (value: any, name: any) => {
    if (String(name) === "Contacts") return Number(value).toLocaleString();
    return `R ${Number(value).toLocaleString()}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="font-serif text-lg font-semibold text-gray-900">Performance Trend — All Channels</h3>
      <p className="text-sm text-gray-500 mb-4">Monthly revenue, ad spend, and new contacts across all sources.</p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `R ${v >= 1000 ? (v / 1000).toFixed(0) + "K" : v}`} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
          <Tooltip formatter={tooltipFormatter} />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#059669" name="Revenue (R)" strokeWidth={2} dot={{ r: 5 }} />
          <Line yAxisId="left" type="monotone" dataKey="adSpend" stroke="#1F2937" name="Ad Spend (R)" strokeWidth={2} dot={{ r: 4 }} />
          <Line yAxisId="right" type="monotone" dataKey="contacts" stroke="#D97706" name="Contacts" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
