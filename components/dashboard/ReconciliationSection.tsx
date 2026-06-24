"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

interface ReconPayer {
  email: string;
  name: string;
  amount: number;
  payments: number;
  lastDate: string;
}
interface ReconciliationData {
  generatedAt: string;
  period: { start: string; end: string };
  paystack: { payments: number; payers: number; total: number };
  ghutte: { records: number; succeeded: number; pending: number; failed: number; payers: number };
  matchedPayers: number;
  missing: ReconPayer[];
  missingTotal: number;
}

const zar = (n: number) => "R " + Math.round(n).toLocaleString("en-ZA");
const fmtDate = (iso: string) => (iso ? new Date(iso).toLocaleDateString("en-ZA", { day: "2-digit", month: "short" }) : "—");

export function ReconciliationSection({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const period = searchParams.get("period") || "";
  const start = searchParams.get("start") || "";
  const end = searchParams.get("end") || "";
  const [data, setData] = useState<ReconciliationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ slug });
    if (start && end) {
      qs.set("start", start);
      qs.set("end", end);
    } else if (period) {
      qs.set("period", period);
    }
    try {
      const res = await fetch(`/api/reconcile?${qs.toString()}`);
      const json = await res.json();
      if (json?.success && json.data) {
        setData(json.data as ReconciliationData);
        setUnavailable(false);
      } else {
        // 400 = client lacks Paystack+GHL; hide the section entirely.
        setUnavailable(true);
      }
    } catch {
      setUnavailable(true);
    }
    setLoading(false);
  }, [slug, period, start, end]);

  useEffect(() => {
    load();
  }, [load]);

  // Don't render anything for clients without both integrations.
  if (unavailable && !data) return null;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="font-serif text-xl font-semibold text-gray-900">Paystack ↔ Ghutte Reconciliation</h2>
          <p className="text-sm text-gray-500">
            Payers who paid on Paystack but have no payment recorded in Ghutte.
            {data?.generatedAt ? ` · checked ${new Date(data.generatedAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}` : ""}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#4A1942] text-white px-3 py-1.5 text-xs hover:bg-[#3a1435] transition-colors disabled:opacity-50"
        >
          {loading ? "Checking…" : "Re-check"}
        </button>
      </div>

      {loading && !data ? (
        <div className="mt-4 h-24 flex items-center justify-center text-sm text-gray-400">
          Comparing Paystack and Ghutte payments…
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
            <Card label="Paystack payments" value={zar(data.paystack.total)} sub={`${data.paystack.payers} payers`} />
            <Card label="Ghutte payments" value={String(data.ghutte.succeeded)} sub={`${data.ghutte.records} records`} />
            <Card label="Matched payers" value={String(data.matchedPayers)} sub="in both" tone="good" />
            <Card label="Missing from Ghutte" value={String(data.missing.length)} sub="payers" tone="bad" />
            <Card label="Unreconciled value" value={zar(data.missingTotal)} sub="on Paystack only" tone="bad" />
          </div>

          {data.missing.length > 0 ? (
            <div className="mt-5 overflow-x-auto rounded-xl border border-gray-100 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium text-right">Paystack paid</th>
                    <th className="px-4 py-3 font-medium text-right">Payments</th>
                    <th className="px-4 py-3 font-medium text-right">Last payment</th>
                  </tr>
                </thead>
                <tbody>
                  {data.missing.map((p) => (
                    <tr key={p.email} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 text-gray-900">{p.name || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{p.email}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{zar(p.amount)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{p.payments}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmtDate(p.lastDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
              ✓ Every Paystack payer this period has a matching Ghutte payment record.
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function Card({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  const valueColor = tone === "bad" ? "text-rose-600" : tone === "good" ? "text-emerald-600" : "text-gray-900";
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${valueColor}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}
