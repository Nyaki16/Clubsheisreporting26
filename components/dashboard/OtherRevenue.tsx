"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Save, DollarSign, Pencil } from "lucide-react";

interface RevenueEntry {
  source: string;
  amount: number;
  note?: string;
}

interface OtherRevenueData {
  entries: RevenueEntry[];
}

export function OtherRevenue({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const periodParam = searchParams.get("period");
  const [entries, setEntries] = useState<RevenueEntry[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RevenueEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data: client } = await supabase
      .from("clients").select("id").eq("slug", slug).single();
    if (!client) return;
    setClientId(client.id);

    let pid = periodParam;
    if (!pid) {
      const { data: period } = await supabase
        .from("reporting_periods").select("id").eq("is_current", true).single();
      pid = period?.id || null;
    }
    if (!pid) return;
    setPeriodId(pid);

    const { data } = await supabase
      .from("dashboard_data")
      .select("data")
      .eq("client_id", client.id)
      .eq("period_id", pid)
      .eq("section", "otherRevenue")
      .single();

    const saved = (data?.data as OtherRevenueData)?.entries || [];
    setEntries(saved);
  }, [slug, periodParam]);

  useEffect(() => { load(); }, [load]);

  function startEdit() {
    setDraft(entries.length > 0 ? entries.map(e => ({ ...e })) : [{ source: "", amount: 0, note: "" }]);
    setEditing(true);
  }

  function addRow() {
    setDraft([...draft, { source: "", amount: 0, note: "" }]);
  }

  function removeRow(i: number) {
    setDraft(draft.filter((_, idx) => idx !== i));
  }

  function updateRow(i: number, field: keyof RevenueEntry, value: string | number) {
    const next = [...draft];
    next[i] = { ...next[i], [field]: value };
    setDraft(next);
  }

  async function save() {
    if (!periodId || !clientId) return;
    setSaving(true);
    const clean = draft.filter(e => e.source.trim() !== "");
    const payload: OtherRevenueData = { entries: clean };

    // Try update first, then insert
    const { data: existing } = await supabase
      .from("dashboard_data")
      .select("id")
      .eq("client_id", clientId)
      .eq("period_id", periodId)
      .eq("section", "otherRevenue")
      .single();

    if (existing) {
      await supabase
        .from("dashboard_data")
        .update({ data: payload, updated_at: new Date().toISOString() })
        .eq("client_id", clientId)
        .eq("period_id", periodId)
        .eq("section", "otherRevenue");
    } else {
      await supabase
        .from("dashboard_data")
        .insert({ client_id: clientId, period_id: periodId, section: "otherRevenue", data: payload });
    }

    setEntries(clean);
    setEditing(false);
    setSaving(false);
  }

  const total = entries.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl font-semibold text-gray-900 flex items-center gap-2">
          <span>💰</span> Other Revenue
        </h2>
        {!editing && (
          <button
            onClick={startEdit}
            className="flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-900 font-medium px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
          >
            {entries.length > 0 ? <Pencil className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {entries.length > 0 ? "Edit" : "Add Revenue"}
          </button>
        )}
      </div>

      {!editing && entries.length === 0 && (
        <p className="text-sm text-gray-400 mt-2">No other revenue added for this period. Click &quot;Add Revenue&quot; to add entries.</p>
      )}

      {!editing && entries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
          {entries.map((entry) => (
            <div key={entry.source} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <p className="text-[0.65rem] uppercase tracking-wider text-gray-500 font-medium leading-tight">
                  {entry.source}
                </p>
              </div>
              <p className="text-xl font-bold text-gray-900 font-sans">R {entry.amount.toLocaleString()}</p>
              {entry.note && (
                <span className="inline-block mt-1.5 text-[0.65rem] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  {entry.note}
                </span>
              )}
            </div>
          ))}
          {entries.length > 1 && (
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <p className="text-[0.65rem] uppercase tracking-wider text-gray-500 font-medium leading-tight">
                  Total Other Revenue
                </p>
              </div>
              <p className="text-xl font-bold text-gray-900 font-sans">R {total.toLocaleString()}</p>
            </div>
          )}
        </div>
      )}

      {editing && (
        <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          {draft.map((entry, i) => (
            <div key={i} className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Source (e.g. Systeme.io)"
                value={entry.source}
                onChange={(e) => updateRow(i, "source", e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R</span>
                <input
                  type="number"
                  placeholder="0"
                  value={entry.amount || ""}
                  onChange={(e) => updateRow(i, "amount", parseFloat(e.target.value) || 0)}
                  className="w-32 border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <input
                type="text"
                placeholder="Note (optional)"
                value={entry.note || ""}
                onChange={(e) => updateRow(i, "note", e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-900 font-medium"
            >
              <Plus className="w-4 h-4" /> Add another source
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 rounded-lg disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
