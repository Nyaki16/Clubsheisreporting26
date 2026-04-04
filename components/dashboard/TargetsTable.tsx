"use client";

import { Target } from "@/types/dashboard";

interface Props {
  targets: Target[];
}

export function TargetsTable({ targets }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Monthly Targets</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
              <th className="text-right py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
              <th className="text-right py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
              <th className="text-right py-2 pl-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Stretch</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((t) => (
              <tr key={t.metric} className="border-b border-gray-100 last:border-0">
                <td className="py-3 pr-4 font-semibold text-gray-900">{t.metric}</td>
                <td className="py-3 px-4 text-right text-gray-700">{t.current}</td>
                <td className="py-3 px-4 text-right font-semibold text-green-600">{t.target}</td>
                <td className="py-3 pl-4 text-right font-semibold text-amber-600">{t.stretch}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
