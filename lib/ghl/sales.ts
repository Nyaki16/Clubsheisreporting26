// Ghutte (GHL) sales activity for the Overview page:
//  - sales income grouped per product (from order sourceName)
//  - successful vs unsuccessful payments (from transaction status)
//
// Read-only. Pages the GHL payments endpoints for a date range.

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

export interface ProductSales {
  name: string;
  orders: number;
  total: number; // ZAR value of all orders for this product (incl. unpaid)
  paidOrders: number;
  paidIncome: number; // ZAR value of paid orders only
}

export interface PaymentStatusBucket {
  count: number;
  amount: number;
}

export interface GhlSalesData {
  generatedAt: string;
  period: { start: string; end: string };
  products: ProductSales[];
  totalPaidIncome: number;
  totalOrders: number;
  payments: {
    succeeded: PaymentStatusBucket;
    pending: PaymentStatusBucket;
    failed: PaymentStatusBucket;
    refunded: PaymentStatusBucket;
  };
}

interface GHLOrder {
  amount?: number;
  sourceName?: string;
  status?: string;
  paymentStatus?: string;
}
interface GHLTxn {
  amount?: number;
  status?: string;
}

function ghHeaders(pitKey: string): HeadersInit {
  return { Authorization: `Bearer ${pitKey}`, Version: GHL_VERSION, Accept: "application/json" };
}

// Page a GHL payments collection (orders | transactions) for a date range.
async function pageAll<T>(
  path: "orders" | "transactions",
  pitKey: string,
  locationId: string,
  start: string,
  end: string,
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  const limit = 100;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const url = `${GHL_BASE}/payments/${path}?altId=${encodeURIComponent(locationId)}&altType=location&startAt=${start}&endAt=${end}&limit=${limit}&offset=${offset}`;
    const res = await fetch(url, { headers: ghHeaders(pitKey) });
    if (!res.ok) throw new Error(`GHL payments/${path} error ${res.status}`);
    const body = await res.json();
    const rows: T[] = body.data || [];
    all.push(...rows);
    const total = body.totalCount ?? all.length;
    offset += limit;
    if (rows.length < limit || offset >= total) break;
  }
  return all;
}

const bucket = (): PaymentStatusBucket => ({ count: 0, amount: 0 });

export async function buildGhlSales(
  locationId: string,
  pitKey: string,
  range: { start: string; end: string },
): Promise<GhlSalesData> {
  const [orders, txns] = await Promise.all([
    pageAll<GHLOrder>("orders", pitKey, locationId, range.start, range.end),
    pageAll<GHLTxn>("transactions", pitKey, locationId, range.start, range.end),
  ]);

  // --- Sales income grouped per product ---
  const byProduct = new Map<string, ProductSales>();
  for (const o of orders) {
    const name = (o.sourceName || "Unattributed").trim() || "Unattributed";
    const amount = Number(o.amount) || 0;
    const paid = (o.paymentStatus || "").toLowerCase() === "paid" || (o.status || "").toLowerCase() === "succeeded";
    const p = byProduct.get(name) || { name, orders: 0, total: 0, paidOrders: 0, paidIncome: 0 };
    p.orders += 1;
    p.total += amount;
    if (paid) {
      p.paidOrders += 1;
      p.paidIncome += amount;
    }
    byProduct.set(name, p);
  }
  const products = [...byProduct.values()].sort((a, b) => b.paidIncome - a.paidIncome || b.total - a.total);

  // --- Successful vs unsuccessful payments (GHL transactions) ---
  const payments = { succeeded: bucket(), pending: bucket(), failed: bucket(), refunded: bucket() };
  for (const t of txns) {
    const amt = Number(t.amount) || 0;
    const s = (t.status || "").toLowerCase();
    const key = s === "succeeded" ? "succeeded" : s === "failed" ? "failed" : s === "refunded" ? "refunded" : "pending";
    payments[key as keyof typeof payments].count += 1;
    payments[key as keyof typeof payments].amount += amt;
  }

  return {
    generatedAt: new Date().toISOString(),
    period: range,
    products,
    totalPaidIncome: products.reduce((s, p) => s + p.paidIncome, 0),
    totalOrders: orders.length,
    payments,
  };
}
