// Configure Meta ad accounts per client in dashboard_data.api_keys.
//
// Usage:
//   META_ACCESS_TOKEN=EAA... node scripts/configure-meta-accounts.mjs            # write changes
//   META_ACCESS_TOKEN=EAA... node scripts/configure-meta-accounts.mjs --dry-run  # preview only
//
// What it does:
//   1. Verifies your META_ACCESS_TOKEN can reach each client's ad account
//   2. Merges meta_ad_account_id into the client's existing api_keys row
//      (preserves ghl_pit_key, ghl_account_id, etc. — does not overwrite the bag)
//
// Notes:
//   - Palesa has TWO ad accounts; we write the first and warn about the second.
//     Multi-account support is a follow-up.
//   - Clients with no Meta Ads (GIBS EDA, Purpose for Impact) are skipped.

const SRK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3bGZtcXB3dWFwaXl2dWJsdmFhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTE2NDQwOCwiZXhwIjoyMDkwNzQwNDA4fQ.iy29-rZSnFfKvyGANlxWhgB6ypW238VEqsOXEYLSkEA";
const BASE = "https://xwlfmqpwuapiyvublvaa.supabase.co/rest/v1";
const supaHeaders = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };

const GRAPH_VERSION = "v22.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

// Pulled from lib/clients.ts. Update here if a client's account changes.
// `extraAdAccounts` is informational only — only the first is written for v1.
const CLIENT_META = [
  { slug: "club-she-is",       primary: "1579515942849269", extraAdAccounts: [] },
  { slug: "awahome",           primary: "844275745180907",  extraAdAccounts: [] },
  { slug: "link-interiors",    primary: "744119155184115",  extraAdAccounts: [] },
  { slug: "palesa-dooms",      primary: "346283871806094",  extraAdAccounts: ["2246460195737618"] },
  { slug: "wisdom-wellness",   primary: "956456447068702",  extraAdAccounts: [] },
  { slug: "gibs-eda",          primary: "863888058621605",  extraAdAccounts: [] },
  { slug: "purpose-for-impact", primary: "612232814892038", extraAdAccounts: [] },
];
const SKIPPED = [];

const DRY_RUN = process.argv.includes("--dry-run");
const TOKEN = process.env.META_ACCESS_TOKEN;

if (!TOKEN) {
  console.error("✗ META_ACCESS_TOKEN env var not set.");
  console.error("  Run with: META_ACCESS_TOKEN=EAA... node scripts/configure-meta-accounts.mjs");
  process.exit(1);
}

function actId(id) {
  return id.startsWith("act_") ? id : `act_${id}`;
}

async function verifyMetaAccount(adAccountId) {
  const url = new URL(`${GRAPH_BASE}/${actId(adAccountId)}`);
  url.searchParams.set("fields", "name,currency,account_status,timezone_name");
  url.searchParams.set("access_token", TOKEN);
  const res = await fetch(url.toString());
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error?.message) detail = body.error.message;
    } catch {}
    return { ok: false, error: detail };
  }
  return { ok: true, data: await res.json() };
}

async function getClientId(slug) {
  const r = await fetch(`${BASE}/clients?select=id&slug=eq.${encodeURIComponent(slug)}&limit=1`, { headers: supaHeaders });
  const rows = await r.json();
  return rows[0]?.id || null;
}

async function getApiKeysRow(clientId) {
  // Some clients have duplicate api_keys rows. We work with the first row's id, merging all data.
  const r = await fetch(
    `${BASE}/dashboard_data?select=id,data&client_id=eq.${clientId}&section=eq.api_keys&period_id=is.null&limit=5`,
    { headers: supaHeaders }
  );
  const rows = await r.json();
  if (!rows.length) return { rowId: null, merged: {} };
  const merged = {};
  for (const row of rows) Object.assign(merged, row.data || {});
  return { rowId: rows[0].id, merged };
}

async function upsertApiKeys(clientId, rowId, data) {
  if (rowId) {
    const res = await fetch(`${BASE}/dashboard_data?id=eq.${rowId}`, {
      method: "PATCH",
      headers: { ...supaHeaders, Prefer: "return=representation" },
      body: JSON.stringify({ data, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error(`PATCH failed: ${res.status} ${await res.text()}`);
    return "updated";
  }
  const res = await fetch(`${BASE}/dashboard_data`, {
    method: "POST",
    headers: supaHeaders,
    body: JSON.stringify({ client_id: clientId, period_id: null, section: "api_keys", data }),
  });
  if (res.status !== 201) throw new Error(`POST failed: ${res.status} ${await res.text()}`);
  return "created";
}

async function run() {
  console.log(`Meta account configuration${DRY_RUN ? " (DRY RUN)" : ""}`);
  console.log("=".repeat(56));

  for (const skip of SKIPPED) {
    console.log(`  ${skip.padEnd(22)}  skipped (no Meta Ads connected)`);
  }
  console.log("");

  const results = [];
  for (const c of CLIENT_META) {
    const acct = actId(c.primary);
    process.stdout.write(`  ${c.slug.padEnd(22)} ${acct.padEnd(24)} ... `);

    const clientId = await getClientId(c.slug);
    if (!clientId) {
      console.log("✗ client not found in Supabase");
      results.push({ slug: c.slug, status: "missing_client" });
      continue;
    }

    const verify = await verifyMetaAccount(c.primary);
    if (!verify.ok) {
      console.log(`✗ token can't reach: ${verify.error}`);
      results.push({ slug: c.slug, status: "token_denied", error: verify.error });
      continue;
    }

    const { rowId, merged } = await getApiKeysRow(clientId);
    const next = { ...merged, meta_ad_account_id: acct };

    if (DRY_RUN) {
      console.log(`would set meta_ad_account_id = ${acct} (${verify.data.name})`);
      results.push({ slug: c.slug, status: "dry_run", name: verify.data.name });
    } else {
      const action = await upsertApiKeys(clientId, rowId, next);
      console.log(`✓ ${action} (${verify.data.name}, ${verify.data.currency})`);
      results.push({ slug: c.slug, status: action, name: verify.data.name });
    }

    if (c.extraAdAccounts.length > 0) {
      console.log(`    ↳ heads up: ${c.slug} also has ${c.extraAdAccounts.join(", ")} — not written (multi-account TODO)`);
    }
  }

  console.log("");
  console.log("Summary");
  console.log("-".repeat(56));
  const ok = results.filter((r) => r.status === "created" || r.status === "updated" || r.status === "dry_run");
  const failed = results.filter((r) => !ok.includes(r));
  console.log(`  ${ok.length} ok, ${failed.length} failed`);
  if (failed.length) {
    console.log("");
    for (const f of failed) console.log(`  ✗ ${f.slug}: ${f.status}${f.error ? " — " + f.error : ""}`);
  }
  if (DRY_RUN) {
    console.log("");
    console.log("  Dry run complete. Re-run without --dry-run to write.");
  }
}

run().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
