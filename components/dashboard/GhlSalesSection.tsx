"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface ProductSales {
  name: string;
  orders: number;
  total: number;
  paidOrders: number;
  paidIncome: number;
}
interface Bucket { count: number; amount: number }
interface GhlSalesData {
  generatedAt: string;
  products: ProductSales[];
  totalPaidIncome: number;
  totalOrders: number;
  payments: { succeeded: Bucket; pending: Bucket; failed: Bucket; refunded: Bucket };
}

const zar = (n: number) => "R " + Math.round(n).toLocaleString("en-ZA");

export function GhlSalesSection({ slug }: { slug: string }) {
  const sp = useSearchParams();
  const period = sp.get("period") || "";
  const start = sp.get("start") || "";
  const end = sp.get("end") || "";
  const [data, setData] = useState<GhlSalesData | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({ slug });
    if (start && end) {
      qs.set("start", start);
      qs.set("end", end);
    } else if (period) {
      qs.set("period", period);
    }
    fetch(`/api/ghl/sales?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (cancelled) return;
        if (res?.success && res.data) setData(res.data as GhlSalesData);
        else setHidden(true);
      })
      .catch(() => setHidden(true));
    return () => {
      cancelled = true;
    };
  }, [slug, period, start, end]);

  if (hidden && !data) return null;
  if (!data) {
    return (
      <div className="h-20 flex items-center text-sm text-gray-400">Loading Ghutte sales…</div>
    );
  }

  const p = data.payments;
  const total = (b: Bucket) => b.count;

  return (
    <div className="space-y-6">
      {/* Sales by product */}
      <div>
        <h2 className="font-serif text-xl font-semibold text-gray-900 flex items-center gap-2">
          <span>🛒</span> Sales by Product
          <span className="text-sm font-normal text-gray-400">· Ghutte · {zar(data.totalPaidIncome)} paid</span>
        </h2>
        <p className="text-sm text-gray-500 mb-4">Sales income grouped per product (offer / funnel).</p>
        {data.products.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium text-right">Orders</th>
                  <th className="px-4 py-3 font-medium text-right">Paid</th>
                  <th className="px-4 py-3 font-medium text-right">Paid income</th>
                  <th className="px-4 py-3 font-medium text-right">Order value</th>
                </tr>
              </thead>
              <tbody>
                {data.products.map((row) => (
                  <tr key={row.name} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 text-gray-900">{row.name}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{row.orders}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{row.paidOrders}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">{zar(row.paidIncome)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{zar(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-gray-400">No Ghutte orders in this period.</div>
        )}
      </div>

      {/* GHL transaction payment status */}
      <div>
        <h2 className="font-serif text-xl font-semibold text-gray-900 flex items-center gap-2">
          <span>💳</span> Ghutte Payments
        </h2>
        <p className="text-sm text-gray-500 mb-4">Successful and unsuccessful payments from Ghutte transactions.</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatusCard label="Successful" count={total(p.succeeded)} amount={p.succeeded.amount} tone="good" />
          <StatusCard label="Pending" count={total(p.pending)} amount={p.pending.amount} tone="warn" />
          <StatusCard label="Failed" count={total(p.failed)} amount={p.failed.amount} tone="bad" />
          <StatusCard label="Refunded" count={total(p.refunded)} amount={p.refunded.amount} tone="bad" />
        </div>
      </div>
    </div>
  );
}

function StatusCard({ label, count, amount, tone }: { label: string; count: number; amount: number; tone: "good" | "warn" | "bad" }) {
  const color = tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-rose-600";
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${color}`}>{count}</div>
      <div className="text-xs text-gray-400 mt-0.5">{zar(amount)}</div>
    </div>
  );
}
