"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Save, CalendarDays, Pencil, X } from "lucide-react";

type Category = "Launch" | "Shoot" | "Deadline" | "Meeting" | "Campaign" | "Other";

interface KeyDateEntry {
  id: string;
  date: string;
  title: string;
  description?: string;
  category: Category;
}

interface KeyDatesData {
  dates: KeyDateEntry[];
}

const CATEGORIES: Category[] = ["Launch", "Shoot", "Deadline", "Meeting", "Campaign", "Other"];

const CATEGORY_STYLES: Record<Category, string> = {
  Launch: "bg-purple-50 text-purple-700 border-purple-200",
  Shoot: "bg-blue-50 text-blue-700 border-blue-200",
  Deadline: "bg-red-50 text-red-700 border-red-200",
  Meeting: "bg-green-50 text-green-700 border-green-200",
  Campaign: "bg-amber-50 text-amber-700 border-amber-200",
  Other: "bg-gray-50 text-gray-600 border-gray-200",
};

function generateId() {
  return `kd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function isPast(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  return d < today;
}

export function KeyDates({ slug, variant = "default" }: { slug: string; variant?: "default" | "header" }) {
  const isHeader = variant === "header";
  const [dates, setDates] = useState<KeyDateEntry[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<KeyDateEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const { data: client } = await supabase
      .from("clients").select("id").eq("slug", slug).single();
    if (!client) { setLoaded(true); return; }
    setClientId(client.id);

    // Key dates use period_id IS NULL so they persist across periods
    const { data } = await supabase
      .from("dashboard_data")
      .select("data")
      .eq("client_id", client.id)
      .is("period_id", null)
      .eq("section", "key_dates")
      .single();

    const saved = (data?.data as KeyDatesData)?.dates || [];
    // Sort chronologically
    saved.sort((a: KeyDateEntry, b: KeyDateEntry) => a.date.localeCompare(b.date));
    setDates(saved);
    setLoaded(true);
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  function startEdit() {
    setDraft(
      dates.length > 0
        ? dates.map((d) => ({ ...d }))
        : [{ id: generateId(), date: "", title: "", description: "", category: "Other" as Category }]
    );
    setEditing(true);
  }

  function addRow() {
    setDraft([...draft, { id: generateId(), date: "", title: "", description: "", category: "Other" as Category }]);
  }

  function removeRow(i: number) {
    setDraft(draft.filter((_, idx) => idx !== i));
  }

  function updateRow(i: number, field: keyof KeyDateEntry, value: string) {
    const next = [...draft];
    next[i] = { ...next[i], [field]: value };
    setDraft(next);
  }

  async function save() {
    if (!clientId) return;
    setSaving(true);
    const clean = draft.filter((e) => e.title.trim() !== "" && e.date !== "");
    clean.sort((a, b) => a.date.localeCompare(b.date));
    const payload: KeyDatesData = { dates: clean };

    // Check if row exists (period_id IS NULL)
    const { data: existing } = await supabase
      .from("dashboard_data")
      .select("id")
      .eq("client_id", clientId)
      .is("period_id", null)
      .eq("section", "key_dates")
      .single();

    if (existing) {
      await supabase
        .from("dashboard_data")
        .update({ data: payload, updated_at: new Date().toISOString() })
        .eq("client_id", clientId)
        .is("period_id", null)
        .eq("section", "key_dates");
    } else {
      await supabase
        .from("dashboard_data")
        .insert({ client_id: clientId, period_id: null, section: "key_dates", data: payload });
    }

    setDates(clean);
    setEditing(false);
    setSaving(false);
  }

  if (!loaded) return null;

  return (
    <div className={isHeader ? "mt-4" : ""}>
      <div className="flex items-center justify-between">
        <h2 className={`font-serif text-lg font-semibold flex items-center gap-2 ${isHeader ? "text-white/90" : "text-gray-900 text-xl"}`}>
          <CalendarDays className={`w-4 h-4 ${isHeader ? "text-white/70" : "text-[#4A1942]"}`} /> Key Dates
        </h2>
        {!editing && (
          <button
            onClick={startEdit}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              isHeader
                ? "text-white/80 hover:text-white hover:bg-white/10"
                : "text-sm text-[#4A1942] hover:text-[#6b2563] hover:bg-purple-50"
            }`}
          >
            {dates.length > 0 ? <Pencil className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {dates.length > 0 ? "Edit" : "Add Date"}
          </button>
        )}
      </div>

      {!editing && dates.length === 0 && (
        <p className={`text-xs mt-1 ${isHeader ? "text-white/40" : "text-sm text-gray-400 mt-2"}`}>
          No key dates added yet. Click &quot;Add Date&quot; to track important upcoming dates.
        </p>
      )}

      {!editing && dates.length > 0 && (
        <div className={`flex flex-wrap gap-2 mt-3 ${!isHeader ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4" : ""}`}>
          {dates.map((entry) => {
            const past = isPast(entry.date);
            return isHeader ? (
              <div
                key={entry.id}
                className={`bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 transition-opacity ${past ? "opacity-40" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[0.65rem] font-semibold text-white/70">
                    {formatDate(entry.date)}
                  </span>
                  <span className={`text-[0.55rem] font-medium px-1.5 py-0.5 rounded-full border ${CATEGORY_STYLES[entry.category]}`}>
                    {entry.category}
                  </span>
                </div>
                <p className="text-xs font-semibold text-white leading-snug mt-0.5">{entry.title}</p>
                {entry.description && (
                  <p className="text-[0.65rem] text-white/50 mt-0.5">{entry.description}</p>
                )}
              </div>
            ) : (
              <div
                key={entry.id}
                className={`bg-white border border-gray-200 rounded-xl px-4 py-3 transition-opacity ${past ? "opacity-50" : ""}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-[#4A1942]">
                    {formatDate(entry.date)}
                  </span>
                  <span
                    className={`text-[0.6rem] font-medium px-2 py-0.5 rounded-full border ${CATEGORY_STYLES[entry.category]}`}
                  >
                    {entry.category}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-900 leading-snug">{entry.title}</p>
                {entry.description && (
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{entry.description}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          {draft.map((entry, i) => (
            <div key={entry.id} className="flex flex-wrap items-start gap-2 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
              <input
                type="date"
                value={entry.date}
                onChange={(e) => updateRow(i, "date", e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1942]/30 w-40"
              />
              <input
                type="text"
                placeholder="Title (e.g. Junior Program Launch)"
                value={entry.title}
                onChange={(e) => updateRow(i, "title", e.target.value)}
                className="flex-1 min-w-[180px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1942]/30"
              />
              <select
                value={entry.category}
                onChange={(e) => updateRow(i, "category", e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1942]/30 w-32"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Description (optional)"
                value={entry.description || ""}
                onChange={(e) => updateRow(i, "description", e.target.value)}
                className="flex-1 min-w-[180px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1942]/30"
              />
              <button onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600 p-2">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 text-sm text-[#4A1942] hover:text-[#6b2563] font-medium"
            >
              <Plus className="w-4 h-4" /> Add another date
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1.5 text-sm font-medium text-white bg-[#4A1942] hover:bg-[#6b2563] px-4 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
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
