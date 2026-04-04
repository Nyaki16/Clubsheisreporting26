"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { PerformanceTrend } from "@/types/dashboard";

export function PerformanceTrendChart({ data }: { data: PerformanceTrend }) {
  const chartData = data.labels.map((label, i) => ({
    name: label,
    adSpend: data.adSpend[i],
    newContacts: data.newContacts[i],
    socialReach: data.socialReach[i],
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="font-serif text-lg font-semibold text-gray-900">Performance Trend — All Channels</h3>
      <p className="text-sm text-gray-500 mb-4">Weekly performance across Meta Ads spend, email engagement, and social reach.</p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `R ${v.toLocaleString()}`} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="adSpend" stroke="#1F2937" name="Ad Spend (R)" strokeWidth={2} dot={{ r: 4 }} />
          <Line yAxisId="right" type="monotone" dataKey="newContacts" stroke="#D97706" name="New Contacts (Ghutte)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
          <Line yAxisId="right" type="monotone" dataKey="socialReach" stroke="#0D9488" name="Social Reach" strokeWidth={2} strokeDasharray="2 2" dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
