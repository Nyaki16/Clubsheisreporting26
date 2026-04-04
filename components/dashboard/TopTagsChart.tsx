"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: { name: string; count: number }[];
}

export function TopTagsChart({ data }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Top Tags</h3>
      <p className="text-xs text-gray-500 mb-4">Most common contact tags this period.</p>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 45)}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={200} />
          <Tooltip />
          <Bar dataKey="count" fill="#C4956A" name="Contacts" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
