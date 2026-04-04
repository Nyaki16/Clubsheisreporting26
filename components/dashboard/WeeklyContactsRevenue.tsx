"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Props {
  labels: string[];
  contacts: number[];
  revenue: number[];
}

export function WeeklyContactsRevenueChart({ labels, contacts, revenue }: Props) {
  const data = labels.map((label, i) => ({
    name: label,
    contacts: contacts[i],
    revenue: revenue[i],
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Weekly New Contacts & Revenue</h3>
      <p className="text-xs text-gray-500 mb-4">Contact acquisition and revenue trends through the month.</p>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `R ${(v / 1000).toFixed(0)}K`} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#4A1942" name="Revenue" strokeWidth={2} dot={{ r: 4 }} />
          <Line yAxisId="right" type="monotone" dataKey="contacts" stroke="#D97706" name="New Contacts" strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
