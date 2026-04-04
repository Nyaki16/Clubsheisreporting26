"use client";

interface TrafficSource {
  domain: string;
  contacts: number;
  share: string;
}

interface Props {
  data: TrafficSource[];
}

export function TrafficSourcesTable({ data }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Top Traffic Sources</h3>
      <p className="text-xs text-gray-500 mb-4">Where Systeme.io contacts are coming from.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
              <th className="text-right py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Contacts</th>
              <th className="text-right py-2 pl-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Share</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.domain} className="border-b border-gray-100 last:border-0">
                <td className="py-3 pr-4 font-semibold text-gray-900">{row.domain}</td>
                <td className="py-3 px-4 text-right text-gray-700">{row.contacts.toLocaleString()}</td>
                <td className="py-3 pl-4 text-right text-gray-700">{row.share}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
