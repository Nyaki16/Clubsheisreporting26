"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Pencil,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

interface ActionItem {
  id: string;
  description: string;
  owner: string;
  dueDate: string;
  status: "pending" | "in-progress" | "done";
}

interface NotesData {
  meetingDate?: string;
  meetingNotes: string;
  summary: string;
  actionItems: ActionItem[];
  updatedAt?: string;
}

const emptyData: NotesData = {
  meetingDate: "",
  meetingNotes: "",
  summary: "",
  actionItems: [],
};

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

const statusConfig = {
  pending: {
    label: "Pending",
    bg: "bg-gray-100",
    text: "text-gray-700",
    icon: AlertCircle,
  },
  "in-progress": {
    label: "In Progress",
    bg: "bg-amber-100",
    text: "text-amber-700",
    icon: Clock,
  },
  done: {
    label: "Done",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    icon: CheckCircle,
  },
};

export function NotesContent({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const periodParam = searchParams.get("period");
  const [data, setData] = useState<NotesData>(emptyData);
  const [clientId, setClientId] = useState<string | null>(null);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<NotesData>(emptyData);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("slug", slug)
      .single();
    if (!client) {
      setLoading(false);
      return;
    }
    setClientId(client.id);

    let pid = periodParam;
    if (!pid) {
      const { data: period } = await supabase
        .from("reporting_periods")
        .select("id")
        .eq("is_current", true)
        .single();
      pid = period?.id || null;
    }
    if (!pid) {
      setLoading(false);
      return;
    }
    setPeriodId(pid);

    const { data: sectionData } = await supabase
      .from("dashboard_data")
      .select("data")
      .eq("client_id", client.id)
      .eq("period_id", pid)
      .eq("section", "notes")
      .single();

    const saved = sectionData?.data as NotesData | undefined;
    setData(saved || emptyData);
    setLoading(false);
  }, [slug, periodParam]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit() {
    setDraft({
      meetingDate: data.meetingDate || "",
      meetingNotes: data.meetingNotes || "",
      summary: data.summary || "",
      actionItems: data.actionItems.map((item) => ({ ...item })),
    });
    setEditing(true);
  }

  function addActionItem() {
    setDraft({
      ...draft,
      actionItems: [
        ...draft.actionItems,
        {
          id: generateId(),
          description: "",
          owner: "",
          dueDate: "",
          status: "pending",
        },
      ],
    });
  }

  function removeActionItem(id: string) {
    setDraft({
      ...draft,
      actionItems: draft.actionItems.filter((item) => item.id !== id),
    });
  }

  function updateActionItem(
    id: string,
    field: keyof ActionItem,
    value: string
  ) {
    setDraft({
      ...draft,
      actionItems: draft.actionItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    });
  }

  async function toggleStatus(id: string) {
    const order: ActionItem["status"][] = ["pending", "in-progress", "done"];
    const updated = data.actionItems.map((item) => {
      if (item.id !== id) return item;
      const currentIdx = order.indexOf(item.status);
      const nextStatus = order[(currentIdx + 1) % order.length];
      return { ...item, status: nextStatus };
    });

    const updatedData = {
      ...data,
      actionItems: updated,
      updatedAt: new Date().toISOString(),
    };
    setData(updatedData);

    // Persist immediately
    if (!periodId || !clientId) return;
    const { data: existing } = await supabase
      .from("dashboard_data")
      .select("id")
      .eq("client_id", clientId)
      .eq("period_id", periodId)
      .eq("section", "notes")
      .single();

    if (existing) {
      await supabase
        .from("dashboard_data")
        .update({
          data: updatedData,
          updated_at: new Date().toISOString(),
        })
        .eq("client_id", clientId)
        .eq("period_id", periodId)
        .eq("section", "notes");
    }
  }

  async function save() {
    if (!periodId || !clientId) return;
    setSaving(true);

    const payload: NotesData = {
      meetingDate: draft.meetingDate,
      meetingNotes: draft.meetingNotes,
      summary: draft.summary,
      actionItems: draft.actionItems.filter(
        (item) => item.description.trim() !== ""
      ),
      updatedAt: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("dashboard_data")
      .select("id")
      .eq("client_id", clientId)
      .eq("period_id", periodId)
      .eq("section", "notes")
      .single();

    if (existing) {
      await supabase
        .from("dashboard_data")
        .update({ data: payload, updated_at: new Date().toISOString() })
        .eq("client_id", clientId)
        .eq("period_id", periodId)
        .eq("section", "notes");
    } else {
      await supabase.from("dashboard_data").insert({
        client_id: clientId,
        period_id: periodId,
        section: "notes",
        data: payload,
      });
    }

    setData(payload);
    setEditing(false);
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-40 bg-gray-200 rounded" />
        <div className="h-32 bg-gray-200 rounded" />
      </div>
    );
  }

  const hasContent =
    data.meetingNotes || data.summary || data.actionItems.length > 0;

  // ── VIEW MODE ──
  if (!editing) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#4A1942]" />
              Strategy Notes
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Monthly strategy meeting notes, summaries, and action items.
            </p>
          </div>
          <button
            onClick={startEdit}
            className="flex items-center gap-1.5 text-sm text-[#4A1942] hover:text-[#6b2d63] font-medium px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors"
          >
            {hasContent ? (
              <Pencil className="w-3.5 h-3.5" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {hasContent ? "Edit" : "Add Notes"}
          </button>
        </div>

        {!hasContent && (
          <p className="text-sm text-gray-400">
            No strategy notes added for this period. Click &quot;Add
            Notes&quot; to get started.
          </p>
        )}

        {hasContent && (
          <>
            {/* Meeting Date */}
            {data.meetingDate && (
              <div className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">
                  Meeting Date:
                </span>{" "}
                {new Date(data.meetingDate).toLocaleDateString("en-ZA", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            )}

            {/* Meeting Notes */}
            {data.meetingNotes && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  Meeting Notes
                </h3>
                <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {data.meetingNotes}
                </div>
              </div>
            )}

            {/* Summary */}
            {data.summary && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  Summary
                </h3>
                <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {data.summary}
                </div>
              </div>
            )}

            {/* Action Items */}
            {data.actionItems.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                  Action Items
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left pb-2 pr-4 text-gray-500 font-medium">
                          Status
                        </th>
                        <th className="text-left pb-2 pr-4 text-gray-500 font-medium">
                          Description
                        </th>
                        <th className="text-left pb-2 pr-4 text-gray-500 font-medium">
                          Owner
                        </th>
                        <th className="text-left pb-2 text-gray-500 font-medium">
                          Due Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.actionItems.map((item) => {
                        const sc = statusConfig[item.status];
                        const StatusIcon = sc.icon;
                        return (
                          <tr
                            key={item.id}
                            className="border-b border-gray-100 last:border-0"
                          >
                            <td className="py-3 pr-4">
                              <button
                                onClick={() => toggleStatus(item.id)}
                                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${sc.bg} ${sc.text} hover:opacity-80 transition-opacity`}
                                title="Click to cycle status"
                              >
                                <StatusIcon className="w-3.5 h-3.5" />
                                {sc.label}
                              </button>
                            </td>
                            <td
                              className={`py-3 pr-4 text-gray-800 ${item.status === "done" ? "line-through text-gray-400" : ""}`}
                            >
                              {item.description}
                            </td>
                            <td className="py-3 pr-4 text-gray-600">
                              {item.owner}
                            </td>
                            <td className="py-3 text-gray-600">
                              {item.dueDate
                                ? new Date(item.dueDate).toLocaleDateString(
                                    "en-ZA"
                                  )
                                : ""}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Updated At */}
            {data.updatedAt && (
              <p className="text-xs text-gray-400 text-right">
                Last updated:{" "}
                {new Date(data.updatedAt).toLocaleString("en-ZA")}
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  // ── EDIT MODE ──
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#4A1942]" />
            Strategy Notes
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Editing notes for this period.
          </p>
        </div>
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
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-[#4A1942] hover:bg-[#6b2d63] px-4 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Meeting Date */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">
          Meeting Date
        </label>
        <input
          type="date"
          value={draft.meetingDate || ""}
          onChange={(e) => setDraft({ ...draft, meetingDate: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1942]/30 focus:border-[#4A1942] w-full max-w-xs"
        />
      </div>

      {/* Meeting Notes */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">
          Meeting Notes
        </label>
        <textarea
          value={draft.meetingNotes}
          onChange={(e) =>
            setDraft({ ...draft, meetingNotes: e.target.value })
          }
          rows={8}
          placeholder="Paste or type meeting notes here..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1942]/30 focus:border-[#4A1942] resize-y"
        />
      </div>

      {/* Summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">
          Summary
        </label>
        <textarea
          value={draft.summary}
          onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
          rows={4}
          placeholder="Brief summary of key discussion points..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1942]/30 focus:border-[#4A1942] resize-y"
        />
      </div>

      {/* Action Items */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
          Action Items
        </h3>

        {draft.actionItems.length === 0 && (
          <p className="text-sm text-gray-400 mb-3">
            No action items yet. Add one below.
          </p>
        )}

        <div className="space-y-3">
          {draft.actionItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 bg-gray-50 rounded-lg p-3"
            >
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) =>
                      updateActionItem(item.id, "description", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1942]/30 focus:border-[#4A1942]"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Owner"
                    value={item.owner}
                    onChange={(e) =>
                      updateActionItem(item.id, "owner", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1942]/30 focus:border-[#4A1942]"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={item.dueDate}
                    onChange={(e) =>
                      updateActionItem(item.id, "dueDate", e.target.value)
                    }
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1942]/30 focus:border-[#4A1942]"
                  />
                  <select
                    value={item.status}
                    onChange={(e) =>
                      updateActionItem(item.id, "status", e.target.value)
                    }
                    className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1942]/30 focus:border-[#4A1942]"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => removeActionItem(item.id)}
                className="text-red-400 hover:text-red-600 p-1 mt-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addActionItem}
          className="flex items-center gap-1.5 text-sm text-[#4A1942] hover:text-[#6b2d63] font-medium mt-4"
        >
          <Plus className="w-4 h-4" /> Add action item
        </button>
      </div>

      {/* Bottom Save */}
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setEditing(false)}
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 text-sm font-medium text-white bg-[#4A1942] hover:bg-[#6b2d63] px-4 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
