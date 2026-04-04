"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#4A1942", "#8B3A62", "#C4956A", "#0D9488", "#D97706"];

interface Props {
  labels: string[];
  values: number[];
}

export function ContactsBySourceChart({ labels, values }: Props) {
  const data = labels.map((label, i) => ({ name: label, value: values[i] }));
  const total = values.reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Contacts by Source</h3>
      <p className="text-xs text-gray-500 mb-4">Where new contacts are coming from.</p>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => { const n = Number(v); return `${n} (${((n / total) * 100).toFixed(1)}%)`; }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 mt-2 justify-center">
        {data.map((entry, i) => (
          <div key={entry.name} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            {entry.name}
          </div>
        ))}
      </div>
    </div>
  );
}
