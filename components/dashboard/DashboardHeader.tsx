"use client";

import { useState } from "react";
import { ChevronDown, Calendar, RefreshCw, FileText, CalendarPlus, X } from "lucide-react";
import Link from "next/link";
import { KeyDates } from "./KeyDates";

interface Props {
  clientName: string;
  slug?: string;
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
  slug,
  periodLabel,
  periods,
  clients,
  currentPeriodId,
  onPeriodChange,
  onClientChange,
  generatedDate,
}: Props) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [creatingPeriod, setCreatingPeriod] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createYear, setCreateYear] = useState(() => new Date().getFullYear());
  const [createMonth, setCreateMonth] = useState(() => new Date().getMonth() + 1);
  const [createResult, setCreateResult] = useState<string | null>(null);

  // Admin signal: dashboard-shell only passes clients[] when admin.
  const isAdmin = clients.length > 0;

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      // Parse month/year from the selected period label (e.g. "April 2026")
      const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      const selected = periods.find(p => p.id === currentPeriodId);
      const parts = selected?.label?.split(" ") || [];
      const monthIdx = months.indexOf(parts[0]) + 1;
      const year = parseInt(parts[1]) || new Date().getFullYear();
      const month = monthIdx || new Date().getMonth() + 1;

      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer 1234" },
        body: JSON.stringify({ year, month }),
      });
      const data = await res.json();
      if (data.success) {
        const totalSections = data.results?.reduce((s: number, r: { sections: string[] }) => s + r.sections.length, 0) || 0;
        setSyncResult(`Synced ${totalSections} sections`);
        // Reload page after brief delay to show fresh data
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setSyncResult("Sync failed");
      }
    } catch {
      setSyncResult("Sync error");
    }
    setSyncing(false);
  }

  async function handleCreatePeriod() {
    setCreatingPeriod(true);
    setCreateResult(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer 1234" },
        body: JSON.stringify({ year: createYear, month: createMonth }),
      });
      const data = await res.json();
      if (data.success) {
        const errs = (data.results || [])
          .flatMap((r: { client: string; errors: string[] }) =>
            (r.errors || []).map((e: string) => `${r.client}: ${e}`)
          );
        const totalSections = (data.results || []).reduce(
          (s: number, r: { sections: string[] }) => s + (r.sections?.length || 0),
          0
        );
        if (totalSections === 0 && errs.length > 0) {
          setCreateResult(errs[0].slice(0, 80));
        } else {
          setCreateResult(`Created · ${totalSections} sections`);
          setTimeout(() => window.location.reload(), 1500);
        }
      } else {
        setCreateResult("Failed");
      }
    } catch {
      setCreateResult("Error");
    }
    setCreatingPeriod(false);
  }

  const monthOptions = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const yearOptions = (() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1];
  })();

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
          <Link href="/dashboard" className="font-serif text-xl font-bold tracking-tight hover:opacity-80 transition-opacity cursor-pointer">Club She Is.</Link>
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
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 bg-white/15 rounded-lg px-3 py-1.5 text-xs backdrop-blur-sm hover:bg-white/25 transition-colors disabled:opacity-50"
                title="Sync latest data from Paystack & APIs"
              >
                <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
                {syncing ? "Syncing..." : syncResult || "Sync Data"}
              </button>
              {isAdmin && (
                <div className="relative">
                  <button
                    onClick={() => setCreateOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 bg-white/15 rounded-lg px-3 py-1.5 text-xs backdrop-blur-sm hover:bg-white/25 transition-colors"
                    title="Create a new reporting period and sync all clients"
                  >
                    <CalendarPlus size={12} />
                    {createOpen ? "Hide" : "Create Period"}
                  </button>
                  {createOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg p-3 z-50 text-gray-900">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold">Create reporting period</span>
                        <button
                          onClick={() => setCreateOpen(false)}
                          className="text-gray-400 hover:text-gray-700"
                          aria-label="Close"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <select
                          value={createMonth}
                          onChange={(e) => setCreateMonth(parseInt(e.target.value, 10))}
                          className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#4A1942]"
                        >
                          {monthOptions.map((m, i) => (
                            <option key={m} value={i + 1}>{m}</option>
                          ))}
                        </select>
                        <select
                          value={createYear}
                          onChange={(e) => setCreateYear(parseInt(e.target.value, 10))}
                          className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#4A1942]"
                        >
                          {yearOptions.map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={handleCreatePeriod}
                        disabled={creatingPeriod}
                        className="w-full inline-flex items-center justify-center gap-1.5 bg-[#4A1942] hover:bg-[#3a1335] text-white rounded px-3 py-1.5 text-xs disabled:opacity-50"
                      >
                        {creatingPeriod ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <CalendarPlus size={12} />
                        )}
                        {creatingPeriod ? "Creating…" : "Create + Sync"}
                      </button>
                      {createResult && (
                        <div className="mt-2 text-[11px] text-gray-700">{createResult}</div>
                      )}
                      <div className="mt-2 text-[10px] text-gray-500 leading-relaxed">
                        Creates the period if missing and syncs Paystack, Meta Ads, FB, IG and GHL for every client. Locked months (Jan/Feb/Mar 2026) are skipped.
                      </div>
                    </div>
                  )}
                </div>
              )}
              {slug && (
                <Link
                  href={`/dashboard/${slug}/report${currentPeriodId ? `?period=${currentPeriodId}` : ""}`}
                  className="inline-flex items-center gap-1.5 bg-white text-[#4A1942] font-semibold rounded-lg px-4 py-1.5 text-xs hover:bg-white/90 transition-colors shadow-sm"
                  title="Generate PDF report for this client"
                >
                  <FileText size={12} />
                  Generate Report
                </Link>
              )}
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
              className="bg-transparent border-none text-white font-medium text-sm focus:outline-none cursor-pointer appearance-none pr-5"
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
            <ChevronDown size={14} className="-ml-4 pointer-events-none" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
            {clientName}
          </h1>
          <p className="text-white/70 text-sm mt-1">
            Monthly Performance Report — Meta Ads · Email Marketing · Social Media
          </p>
          {slug && <KeyDates slug={slug} variant="header" />}
        </div>
      </div>
    </header>
  );
}
