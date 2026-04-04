"use client";

import { ChevronDown, Calendar } from "lucide-react";

interface Props {
  clientName: string;
  periodLabel: string;
  periods: { id: string; label: string }[];
  clients: { slug: string; name: string }[];
  currentPeriodId: string;
  onPeriodChange: (id: string) => void;
  onClientChange: (slug: string) => void;
  generatedDate?: string;
}

export function DashboardHeader({
  clientName,
  periodLabel,
  periods,
  clients,
  currentPeriodId,
  onPeriodChange,
  onClientChange,
  generatedDate,
}: Props) {
  return (
    <header
      className="w-full text-white px-6 py-6 md:px-10 md:py-8"
      style={{
        background: "linear-gradient(135deg, #4A1942 0%, #8B3A62 50%, #C4956A 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Top row: logo + period */}
        <div className="flex items-start justify-between mb-6">
          <p className="font-serif text-xl font-bold tracking-tight">Club She Is.</p>
          <div className="text-right">
            <div className="inline-flex items-center gap-2 bg-white/15 rounded-lg px-3 py-1.5 text-sm backdrop-blur-sm">
              <Calendar size={14} />
              <span>REPORTING PERIOD:</span>
              <select
                className="bg-transparent border-none text-white font-semibold text-sm focus:outline-none cursor-pointer"
                value={currentPeriodId}
                onChange={(e) => onPeriodChange(e.target.value)}
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id} className="text-gray-900">
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm text-white/80 mt-1">{periodLabel}</p>
            <p className="text-xs text-white/60">End of Month Report</p>
            {generatedDate && (
              <p className="text-xs text-white/60">Generated {generatedDate}</p>
            )}
          </div>
        </div>

        {/* Client selector + name */}
        <div>
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm mb-2 cursor-pointer backdrop-blur-sm">
            <select
              className="bg-transparent border-none text-white font-medium text-sm focus:outline-none cursor-pointer"
              value=""
              onChange={(e) => {
                if (e.target.value) onClientChange(e.target.value);
              }}
            >
              <option value="" disabled className="text-gray-900">
                Switch client...
              </option>
              {clients.map((c) => (
                <option key={c.slug} value={c.slug} className="text-gray-900">
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
            {clientName}
          </h1>
          <p className="text-white/70 text-sm mt-1">
            Monthly Performance Report — Meta Ads · Email Marketing · Social Media
          </p>
        </div>
      </div>
    </header>
  );
}
