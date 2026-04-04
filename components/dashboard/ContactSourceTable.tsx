"use client";

import { SourceBreakdown } from "@/types/dashboard";

interface Props {
  data: SourceBreakdown[];
}

export function ContactSourceTable({ data }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Contact Source Breakdown</h3>
      <p className="text-xs text-gray-500 mb-4">How many contacts came from each source.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
              <th className="text-right py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">New Contacts</th>
              <th className="text-right py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Opportunities</th>
              <th className="text-right py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Won</th>
              <th className="text-right py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
              <th className="text-right py-2 pl-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Conversion Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.source} className="border-b border-gray-100 last:border-0">
                <td className="py-3 pr-4 font-semibold text-gray-900">{row.source}</td>
                <td className="py-3 px-4 text-right text-gray-700">{row.contacts}</td>
                <td className="py-3 px-4 text-right text-gray-700">{row.opportunities}</td>
                <td className="py-3 px-4 text-right text-gray-700">{row.won}</td>
                <td className="py-3 px-4 text-right text-gray-700">{row.revenue}</td>
                <td className="py-3 pl-4 text-right text-gray-700">{row.convRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
