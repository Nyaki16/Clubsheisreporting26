// Paystack ↔ Ghutte (GHL) payment reconciliation.
//
// Pulls successful Paystack payments and Ghutte payment records for a date
// range, matches them by payer email, and surfaces the gap: people who paid on
// Paystack but have no payment recorded in Ghutte. This is read-only — it never
// writes back to either platform.

export interface ReconPayer {
  email: string;
  name: string;
  amount: number; // total Paystack amount in ZAR for this payer in the period
  payments: number; // # of Paystack payments
  lastDate: string; // ISO date of most recent Paystack payment
}

export interface ReconciliationData {
  generatedAt: string;
  period: { start: string; end: string };
  paystack: { payments: number; payers: number; total: number };
  ghutte: { records: number; succeeded: number; pending: number; failed: number; payers: number };
  matchedPayers: number;
  missing: ReconPayer[]; // Paystack payers with no Ghutte payment record
  missingTotal: number; // ZAR sum of missing payers
}

const PAYSTACK_BASE = "https://api.paystack.co";
const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

const norm = (e: string | undefined | null) => (e || "").trim().toLowerCase();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface PSTxn {
  amount: number; // kobo/cents
  status: string;
  created_at?: string;
  paidAt?: string;
  customer?: { email?: string; first_name?: string; last_name?: string };
}

// Paystack from Vercel's region intermittently 504s — retry transient 5xx.
async function psFetch(url: string, key: string, attempt = 0): Promise<Response> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
  if (res.status >= 500 && attempt < 3) {
    await sleep(500 * (attempt + 1));
    return psFetch(url, key, attempt + 1);
  }
  return res;
}

async function fetchPaystackSuccess(
  key: string,
  from: string,
  to: string,
): Promise<Map<string, ReconPayer>> {
  const payers = new Map<string, ReconPayer>();
  let page = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const url = `${PAYSTACK_BASE}/transaction?status=success&from=${from}&to=${to}&perPage=100&page=${page}`;
    const res = await psFetch(url, key);
    if (!res.ok) throw new Error(`Paystack API error ${res.status}`);
    const body = await res.json();
    const rows: PSTxn[] = body.data || [];
    for (const t of rows) {
      const email = norm(t.customer?.email);
      if (!email) continue;
      const amount = (t.amount || 0) / 100;
      const date = t.paidAt || t.created_at || "";
      const existing = payers.get(email);
      if (existing) {
        existing.amount += amount;
        existing.payments += 1;
        if (date > existing.lastDate) existing.lastDate = date;
      } else {
        const name = [t.customer?.first_name, t.customer?.last_name].filter(Boolean).join(" ").trim();
        payers.set(email, { email, name, amount, payments: 1, lastDate: date });
      }
    }
    const meta = body.meta || {};
    const pageCount = meta.pageCount || 1;
    if (page >= pageCount || rows.length === 0) break;
    page += 1;
  }
  return payers;
}

interface GHLTxn {
  contactEmail?: string;
  status?: string; // pending | succeeded | failed | refunded
}

async function fetchGhutteEmails(
  pitKey: string,
  locationId: string,
  from: string,
  to: string,
): Promise<{ emails: Set<string>; counts: ReconciliationData["ghutte"] }> {
  const emails = new Set<string>();
  let records = 0,
    succeeded = 0,
    pending = 0,
    failed = 0;
  let offset = 0;
  const limit = 100;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const url = `${GHL_BASE}/payments/transactions?altId=${encodeURIComponent(locationId)}&altType=location&startAt=${from}&endAt=${to}&limit=${limit}&offset=${offset}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${pitKey}`, Version: GHL_VERSION, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`GHL payments API error ${res.status}`);
    const body = await res.json();
    const rows: GHLTxn[] = body.data || [];
    for (const o of rows) {
      records += 1;
      const st = o.status;
      if (st === "succeeded") succeeded += 1;
      else if (st === "pending") pending += 1;
      else if (st === "failed") failed += 1;
      const e = norm(o.contactEmail);
      if (e) emails.add(e);
    }
    const total = body.totalCount ?? records;
    offset += limit;
    if (rows.length < limit || offset >= total) break;
  }
  return { emails, counts: { records, succeeded, pending, failed, payers: emails.size } };
}

export async function buildReconciliation(
  paystackKey: string,
  pitKey: string,
  locationId: string,
  range: { start: string; end: string },
): Promise<ReconciliationData> {
  const [psPayers, ghutte] = await Promise.all([
    fetchPaystackSuccess(paystackKey, range.start, range.end),
    fetchGhutteEmails(pitKey, locationId, range.start, range.end),
  ]);

  const missing: ReconPayer[] = [];
  let matchedPayers = 0;
  let psTotal = 0;
  for (const payer of psPayers.values()) {
    psTotal += payer.amount;
    if (ghutte.emails.has(payer.email)) matchedPayers += 1;
    else missing.push(payer);
  }
  missing.sort((a, b) => b.amount - a.amount);

  return {
    generatedAt: new Date().toISOString(),
    period: range,
    paystack: { payments: [...psPayers.values()].reduce((s, p) => s + p.payments, 0), payers: psPayers.size, total: psTotal },
    ghutte: ghutte.counts,
    matchedPayers,
    missing,
    missingTotal: missing.reduce((s, p) => s + p.amount, 0),
  };
}
