"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

interface Txn {
  date: string;
  client: string;
  key: string;
  email: string;
  product: string;
  amount: number;
  status: string;
}

interface ProgramBalance {
  product: string;
  type: "fixed" | "installments" | "oneoff";
  paid: number;
  count: number;
  outstanding: number;
  expected?: number;
  paymentsMade?: number;
  paymentsExpected?: number;
}
interface ClientBalance {
  name: string;
  totalPaid: number;
  totalOutstanding: number;
  programs: ProgramBalance[];
  history: Txn[];
}

const zar = (n: number) => "R " + Math.round(n).toLocaleString("en-ZA");
const zar2 = (n: number) => "R " + n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dshort = (s: string) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s.slice(0, 10) : d.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
};
const dtime = (s: string) => {
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString("en-ZA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const STATUS_STYLE: Record<string, string> = {
  succeeded: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  failed: "bg-rose-50 text-rose-700",
  refunded: "bg-gray-100 text-gray-500",
};
const Pill = ({ s }: { s: string }) => (
  <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[s] || "bg-gray-100 text-gray-600"}`}>{s}</span>
);

type Tab = "product" | "client" | "all";

export function GhlPaymentsDashboard({ slug }: { slug: string }) {
  const sp = useSearchParams();
  const period = sp.get("period") || "";
  const start = sp.get("start") || "";
  const end = sp.get("end") || "";

  const [txns, setTxns] = useState<Txn[] | null>(null);
  const [balances, setBalances] = useState<Record<string, ClientBalance>>({});
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<Tab>("product");
  const [status, setStatus] = useState("succeeded");
  const [product, setProduct] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ k: string; dir: number }>({ k: "successful", dir: -1 });
  const [modalKey, setModalKey] = useState<string | null>(null);

  // From/To date filter — fetches the payments for exactly these dates. Seeded
  // from whatever window the global reporting period resolves to.
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(
    async (params: { start?: string; end?: string; period?: string }) => {
      setLoading(true);
      const qs = new URLSearchParams({ slug });
      if (params.start && params.end) {
        qs.set("start", params.start);
        qs.set("end", params.end);
      } else if (params.period) {
        qs.set("period", params.period);
      }
      try {
        const res = await fetch(`/api/ghl/payments?${qs.toString()}`);
        const json = await res.json();
        if (json?.success && Array.isArray(json.transactions)) {
          setTxns(json.transactions as Txn[]);
          setBalances((json.balances || {}) as Record<string, ClientBalance>);
          setHidden(false);
          if (json.period?.start && json.period?.end) {
            setDateFrom(json.period.start);
            setDateTo(json.period.end);
          }
        } else {
          setHidden(true);
        }
      } catch {
        setHidden(true);
      }
      setLoading(false);
    },
    [slug],
  );

  // (Re)load whenever the global reporting period / custom range changes.
  useEffect(() => {
    if (start && end) load({ start, end });
    else load({ period: period || undefined });
  }, [slug, period, start, end, load]);

  // Apply an in-dashboard From/To date filter (refetches for exactly those dates).
  const applyDates = useCallback(
    (f: string, t: string) => {
      setDateFrom(f);
      setDateTo(t);
      if (f && t && f <= t) load({ start: f, end: t });
    },
    [load],
  );

  const all = txns || [];
  const products = useMemo(() => [...new Set(all.map((t) => t.product))].sort(), [all]);

  // Headline KPIs: succeeded for the whole period (ignore UI filters).
  const kpis = useMemo(() => {
    const succ = all.filter((t) => t.status === "succeeded");
    const rev = succ.reduce((a, t) => a + t.amount, 0);
    const clients = new Set(succ.map((t) => t.key)).size;
    const pending = all.filter((t) => t.status === "pending");
    const failed = all.filter((t) => t.status === "failed");
    return {
      rev,
      payments: succ.length,
      clients,
      pendingN: pending.length,
      pendingV: pending.reduce((a, t) => a + t.amount, 0),
      failedN: failed.length,
      failedV: failed.reduce((a, t) => a + t.amount, 0),
    };
  }, [all]);

  const filtered = useMemo(
    () =>
      all.filter((t) => {
        if (status !== "all" && t.status !== status) return false;
        if (product && t.product !== product) return false;
        if (search && !t.client.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [all, status, product, search],
  );

  // By Product ignores the status filter so it can show the full
  // Successful / Pending / Failed split per product.
  const productRows = useMemo(
    () =>
      all.filter((t) => {
        if (product && t.product !== product) return false;
        if (search && !t.client.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [all, product, search],
  );

  function setSortKey(k: string, defaultDir = -1) {
    setSort((c) => (c.k === k ? { k, dir: -c.dir } : { k, dir: defaultDir }));
  }
  function arrow(k: string) {
    return sort.k === k ? (sort.dir > 0 ? " ▲" : " ▼") : "";
  }

  if (hidden && !txns) return null;
  if (loading && !txns) {
    return <div className="h-24 flex items-center text-sm text-gray-400">Loading Ghutte payments…</div>;
  }

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-gray-900 flex items-center gap-2">
        <span>📊</span> Payments Dashboard
        <span className="text-sm font-normal text-gray-400">· live from Ghutte</span>
      </h2>
      <p className="text-sm text-gray-500 mb-4">Grouped by product, with sorting, filters and client drill-down.</p>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Successful revenue" value={zar(kpis.rev)} sub={`${kpis.payments} payments`} tone="good" />
        <Kpi label="Paying clients" value={String(kpis.clients)} sub="unique" />
        <Kpi label="Pending" value={String(kpis.pendingN)} sub={zar(kpis.pendingV)} tone="warn" />
        <Kpi label="Failed" value={String(kpis.failedN)} sub={zar(kpis.failedV)} tone="bad" />
      </div>

      {/* Controls */}
      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3">
        <Select label="Status" value={status} onChange={setStatus} options={[
          ["succeeded", "Successful only"], ["all", "All statuses"], ["pending", "Pending"], ["failed", "Failed"], ["refunded", "Refunded"],
        ]} />
        <Select label="Product" value={product} onChange={setProduct} options={[["", "All products"], ...products.map((p) => [p, p] as [string, string])]} />
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          From
          <input type="date" value={dateFrom} onChange={(e) => applyDates(e.target.value, dateTo)} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#4A1942]/30" />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          To
          <input type="date" value={dateTo} onChange={(e) => applyDates(dateFrom, e.target.value)} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#4A1942]/30" />
        </label>
        <div className="flex-1" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search client…"
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1942]/30 min-w-[180px]"
        />
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-2">
        {([["product", "By Product"], ["client", "By Client"], ["all", "All Payments"]] as [Tab, string][]).map(([t, l]) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setSort({ k: t === "all" ? "date" : t === "product" ? "successful" : "total", dir: -1 });
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === t ? "bg-[#4A1942] text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-gray-100 bg-white">
        {tab === "product" && <ByProduct rows={productRows} seedProducts={product ? [] : products} sort={sort} setSortKey={setSortKey} arrow={arrow} onProduct={(p) => { setProduct(p); setTab("all"); }} />}
        {tab === "client" && <ByClient rows={filtered} balances={balances} sort={sort} setSortKey={setSortKey} arrow={arrow} onClient={setModalKey} />}
        {tab === "all" && <AllPayments rows={filtered} sort={sort} setSortKey={setSortKey} arrow={arrow} onClient={setModalKey} />}
      </div>

      {modalKey && (
        <ClientModal
          balance={balances[modalKey]}
          fallback={all.filter((t) => t.key === modalKey)}
          onClose={() => setModalKey(null)}
        />
      )}
    </div>
  );
}

function sortRows<T extends Record<string, unknown>>(rows: T[], k: string, dir: number): T[] {
  return [...rows].sort((a, b) => {
    const x = a[k] as string | number;
    const y = b[k] as string | number;
    if (typeof x === "string") return (x as string).toLowerCase() < (y as string).toLowerCase() ? -dir : (x as string).toLowerCase() > (y as string).toLowerCase() ? dir : 0;
    return ((x as number) - (y as number)) * dir;
  });
}

const Th = ({ label, k, sort, setSortKey, arrow, num, defaultDir }: { label: string; k: string; sort: { k: string; dir: number }; setSortKey: (k: string, d?: number) => void; arrow: (k: string) => string; num?: boolean; defaultDir?: number }) => (
  <th
    onClick={() => setSortKey(k, defaultDir)}
    className={`px-4 py-3 font-medium text-[11px] uppercase tracking-wide text-gray-400 cursor-pointer select-none whitespace-nowrap ${num ? "text-right" : "text-left"}`}
  >
    {label}{sort.k === k ? arrow(k) : ""}
  </th>
);

// `rows` here are filtered by product/search but NOT status, so each product
// shows the full Successful / Pending / Failed split regardless of the status
// filter (the point: see money stuck in pending at a glance).
function ByProduct({ rows, seedProducts, sort, setSortKey, arrow, onProduct }: { rows: Txn[]; seedProducts: string[]; sort: { k: string; dir: number }; setSortKey: (k: string, d?: number) => void; arrow: (k: string) => string; onProduct: (p: string) => void }) {
  type Agg = { product: string; clients: Set<string>; successful: number; pending: number; failed: number };
  const map = new Map<string, Agg>();
  const seed = (p: string): Agg => {
    let m = map.get(p);
    if (!m) { m = { product: p, clients: new Set<string>(), successful: 0, pending: 0, failed: 0 }; map.set(p, m); }
    return m;
  };
  for (const p of seedProducts) seed(p);
  for (const r of rows) {
    const m = seed(r.product);
    if (r.status === "succeeded") { m.successful += r.amount; m.clients.add(r.key); }
    else if (r.status === "pending") m.pending += r.amount;
    else if (r.status === "failed") m.failed += r.amount;
  }
  let arr = [...map.values()].map((m) => ({ product: m.product, clients: m.clients.size, successful: m.successful, pending: m.pending, failed: m.failed }));
  if (!arr.length) return <Empty />;
  const max = Math.max(1, ...arr.map((a) => a.successful));
  arr = sortRows(arr, sort.k, sort.dir);
  const sum = (k: "successful" | "pending" | "failed") => arr.reduce((a, o) => a + o[k], 0);
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100">
          <Th label="Product" k="product" sort={sort} setSortKey={setSortKey} arrow={arrow} defaultDir={1} />
          <Th label="Clients" k="clients" sort={sort} setSortKey={setSortKey} arrow={arrow} num />
          <Th label="Successful" k="successful" sort={sort} setSortKey={setSortKey} arrow={arrow} num />
          <Th label="Pending" k="pending" sort={sort} setSortKey={setSortKey} arrow={arrow} num />
          <Th label="Failed" k="failed" sort={sort} setSortKey={setSortKey} arrow={arrow} num />
          <th className="px-4 py-3 text-right font-medium text-[11px] uppercase tracking-wide text-gray-400">Share</th>
        </tr>
      </thead>
      <tbody>
        {arr.map((o) => (
          <tr key={o.product} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
            <td className="px-4 py-3"><span className="text-[#4A1942] font-medium cursor-pointer hover:underline" onClick={() => onProduct(o.product)}>{o.product}</span></td>
            <td className="px-4 py-3 text-right text-gray-600">{o.clients}</td>
            <td className="px-4 py-3 text-right font-semibold text-emerald-600">{zar2(o.successful)}</td>
            <td className="px-4 py-3 text-right" style={{ color: o.pending > 0 ? "#d97706" : "#9ca3af" }}>{o.pending > 0 ? zar2(o.pending) : "—"}</td>
            <td className="px-4 py-3 text-right" style={{ color: o.failed > 0 ? "#e11d48" : "#9ca3af" }}>{o.failed > 0 ? zar2(o.failed) : "—"}</td>
            <td className="px-4 py-3">
              <div className="h-1.5 rounded bg-gray-100 overflow-hidden min-w-[80px]">
                <div className="h-full rounded" style={{ width: `${Math.round((o.successful / max) * 100)}%`, background: "linear-gradient(90deg,#4A1942,#C4956A)" }} />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-gray-100">
          <td className="px-4 py-3 font-semibold">Total</td>
          <td />
          <td className="px-4 py-3 text-right font-semibold text-emerald-600">{zar2(sum("successful"))}</td>
          <td className="px-4 py-3 text-right font-semibold text-amber-600">{zar2(sum("pending"))}</td>
          <td className="px-4 py-3 text-right font-semibold text-rose-600">{zar2(sum("failed"))}</td>
          <td />
        </tr>
      </tfoot>
    </table>
  );
}

function ByClient({ rows, balances, sort, setSortKey, arrow, onClient }: { rows: Txn[]; balances: Record<string, ClientBalance>; sort: { k: string; dir: number }; setSortKey: (k: string, d?: number) => void; arrow: (k: string) => string; onClient: (k: string) => void }) {
  const map = new Map<string, { key: string; client: string; count: number; total: number; products: Set<string>; last: string }>();
  for (const r of rows) {
    const m = map.get(r.key) || { key: r.key, client: r.client, count: 0, total: 0, products: new Set<string>(), last: "" };
    m.count += 1;
    m.total += r.amount;
    m.products.add(r.product);
    if (r.date > m.last) m.last = r.date;
    map.set(r.key, m);
  }
  // "total" here = paid this period; "outstanding" = all-time running balance.
  let arr = [...map.values()].map((m) => ({ key: m.key, client: m.client, count: m.count, total: m.total, products: m.products.size, last: m.last, outstanding: balances[m.key]?.totalOutstanding || 0 }));
  if (!arr.length) return <Empty />;
  arr = sortRows(arr, sort.k, sort.dir);
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100">
          <Th label="Client" k="client" sort={sort} setSortKey={setSortKey} arrow={arrow} defaultDir={1} />
          <Th label="Payments" k="count" sort={sort} setSortKey={setSortKey} arrow={arrow} num />
          <Th label="Products" k="products" sort={sort} setSortKey={setSortKey} arrow={arrow} num />
          <Th label="Paid (period)" k="total" sort={sort} setSortKey={setSortKey} arrow={arrow} num />
          <Th label="Outstanding" k="outstanding" sort={sort} setSortKey={setSortKey} arrow={arrow} num />
          <Th label="Last payment" k="last" sort={sort} setSortKey={setSortKey} arrow={arrow} />
        </tr>
      </thead>
      <tbody>
        {arr.map((o) => (
          <tr key={o.key} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
            <td className="px-4 py-3"><span className="text-[#4A1942] font-medium cursor-pointer hover:underline" onClick={() => onClient(o.key)}>{o.client}</span></td>
            <td className="px-4 py-3 text-right text-gray-600">{o.count}</td>
            <td className="px-4 py-3 text-right text-gray-600">{o.products}</td>
            <td className="px-4 py-3 text-right font-semibold text-gray-900">{zar2(o.total)}</td>
            <td className="px-4 py-3 text-right font-semibold" style={{ color: o.outstanding > 0 ? "#e11d48" : "#9ca3af" }}>{o.outstanding > 0 ? zar2(o.outstanding) : "—"}</td>
            <td className="px-4 py-3 text-gray-600">{dshort(o.last)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-gray-100">
          <td className="px-4 py-3 font-semibold">Total ({arr.length} clients)</td>
          <td className="px-4 py-3 text-right font-semibold">{arr.reduce((a, o) => a + o.count, 0)}</td>
          <td />
          <td className="px-4 py-3 text-right font-semibold">{zar2(arr.reduce((a, o) => a + o.total, 0))}</td>
          <td className="px-4 py-3 text-right font-semibold">{zar2(arr.reduce((a, o) => a + o.outstanding, 0))}</td>
          <td />
        </tr>
      </tfoot>
    </table>
  );
}

function AllPayments({ rows, sort, setSortKey, arrow, onClient }: { rows: Txn[]; sort: { k: string; dir: number }; setSortKey: (k: string, d?: number) => void; arrow: (k: string) => string; onClient: (k: string) => void }) {
  if (!rows.length) return <Empty />;
  const sorted = sortRows(rows as unknown as Record<string, unknown>[], sort.k, sort.dir) as unknown as Txn[];
  const grand = rows.reduce((a, r) => a + r.amount, 0);
  const shown = sorted.slice(0, 1000);
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100">
          <Th label="Date" k="date" sort={sort} setSortKey={setSortKey} arrow={arrow} />
          <Th label="Client" k="client" sort={sort} setSortKey={setSortKey} arrow={arrow} defaultDir={1} />
          <Th label="Product" k="product" sort={sort} setSortKey={setSortKey} arrow={arrow} defaultDir={1} />
          <Th label="Amount" k="amount" sort={sort} setSortKey={setSortKey} arrow={arrow} num />
          <Th label="Status" k="status" sort={sort} setSortKey={setSortKey} arrow={arrow} defaultDir={1} />
        </tr>
      </thead>
      <tbody>
        {shown.map((r, i) => (
          <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{dshort(r.date)}</td>
            <td className="px-4 py-3"><span className="text-[#4A1942] font-medium cursor-pointer hover:underline" onClick={() => onClient(r.key)}>{r.client}</span></td>
            <td className="px-4 py-3 text-gray-700">{r.product}</td>
            <td className="px-4 py-3 text-right font-medium text-gray-900">{zar2(r.amount)}</td>
            <td className="px-4 py-3"><Pill s={r.status} /></td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-gray-100">
          <td className="px-4 py-3 font-semibold">Total ({rows.length})</td>
          <td /><td />
          <td className="px-4 py-3 text-right font-semibold">{zar2(grand)}</td>
          <td />
        </tr>
      </tfoot>
    </table>
  );
}

function ClientModal({ balance, fallback, onClose }: { balance?: ClientBalance; fallback: Txn[]; onClose: () => void }) {
  const history = balance?.history?.length ? balance.history : fallback;
  const name = balance?.name || history[0]?.client || "Client";
  const succ = history.filter((r) => r.status === "succeeded");
  const paid = balance ? balance.totalPaid : succ.reduce((a, r) => a + r.amount, 0);
  const outstanding = balance?.totalOutstanding || 0;
  const products = [...new Set(history.map((r) => r.product))];
  const progMap = new Map((balance?.programs || []).map((p) => [p.product, p]));

  const byProduct = new Map<string, Txn[]>();
  for (const r of history) {
    const list = byProduct.get(r.product) || [];
    list.push(r);
    byProduct.set(r.product, list);
  }

  function balanceBadge(p: ProgramBalance | undefined) {
    if (!p) return null;
    if (p.type === "fixed") {
      return p.outstanding > 0
        ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">{zar(p.outstanding)} left of {zar(p.expected || 0)}</span>
        : <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">paid in full</span>;
    }
    if (p.type === "installments") {
      const made = p.paymentsMade || 0;
      const exp = p.paymentsExpected || 0;
      return p.outstanding > 0
        ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">{made} of {exp} payments · {zar(p.outstanding)} left</span>
        : <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{made} of {exp} payments · complete</span>;
    }
    return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">once-off</span>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 p-6" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-serif text-xl font-semibold text-gray-900">{name}</h3>
            <p className="text-sm text-gray-500">{history.length} transactions · {products.length} product(s) · all-time</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>
        <div className="mt-4 flex gap-8">
          <div><div className="text-xs uppercase tracking-wide text-gray-400">Total paid</div><div className="text-xl font-semibold text-emerald-600">{zar2(paid)}</div></div>
          <div><div className="text-xs uppercase tracking-wide text-gray-400">Outstanding</div><div className="text-xl font-semibold" style={{ color: outstanding > 0 ? "#e11d48" : "#10b981" }}>{zar2(outstanding)}</div></div>
          <div><div className="text-xs uppercase tracking-wide text-gray-400">Payments</div><div className="text-xl font-semibold text-gray-900">{succ.length}</div></div>
        </div>
        {[...byProduct.entries()].map(([p, list]) => {
          const ps = list.filter((r) => r.status === "succeeded").reduce((a, r) => a + r.amount, 0);
          return (
            <div key={p} className="mt-5">
              <div className="flex items-center gap-2 flex-wrap text-sm font-semibold text-gray-800">
                {p} <span className="font-normal text-gray-400">· {zar2(ps)} paid</span> {balanceBadge(progMap.get(p))}
              </div>
              <table className="mt-1 w-full text-sm">
                <tbody>
                  {list.sort((a, b) => (a.date < b.date ? 1 : -1)).map((r, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 text-gray-500 w-40">{dtime(r.date)}</td>
                      <td className="py-2 text-right w-28 font-medium text-gray-900">{zar2(r.amount)}</td>
                      <td className="py-2 pl-3"><Pill s={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "warn" | "bad" }) {
  const c = tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : tone === "bad" ? "text-rose-600" : "text-gray-900";
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${c}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="flex items-center gap-2 text-xs text-gray-500">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#4A1942]/30">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function Empty() {
  return <div className="px-4 py-10 text-center text-sm text-gray-400">No payments match these filters.</div>;
}
