"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useDashboardData } from "@/lib/use-dashboard-data";
import { LoadingSkeleton } from "@/components/dashboard/LoadingSkeleton";
import { Upload, Sparkles, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp, ExternalLink, Pencil, Save, X, Plus, Trash2, Download } from "lucide-react";

interface ActionItem {
  id: string;
  description: string;
  owner: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "done";
}

interface NoteSection {
  topic: string;
  points: string[];
}

interface NotesData {
  meetingDate?: string;
  transcript?: string;
  summary: string;
  keyDecisions?: string[];
  meetingNotes: string | NoteSection[];
  agencyActions: ActionItem[];
  clientActions: ActionItem[];
  dataInsights?: string[];
  generatedAt?: string;
}

const statusStyles = {
  pending: { bg: "#F3F4F6", text: "#6B7280", icon: Clock, label: "Pending" },
  "in-progress": { bg: "#FEF3C7", text: "#D97706", icon: AlertCircle, label: "In Progress" },
  done: { bg: "#ECFDF5", text: "#059669", icon: CheckCircle, label: "Done" },
};

const priorityStyles = {
  high: { bg: "#FEE2E2", text: "#DC2626" },
  medium: { bg: "#FEF3C7", text: "#D97706" },
  low: { bg: "#F3F4F6", text: "#6B7280" },
};

const CLICKUP_LIST_URLS: Record<string, string> = {
  "club-she-is": "https://app.clickup.com/90121487936/v/li/901216333346",
  "palesa-dooms": "https://app.clickup.com/90121487936/v/li/901216332808",
  "wisdom-and-wellness": "https://app.clickup.com/90121487936/v/li/901216193017",
  "purpose-for-impact": "https://app.clickup.com/90121487936/v/li/901216190500",
  "link-interiors": "https://app.clickup.com/90121487936/v/li/901216189889",
  "awahome": "https://app.clickup.com/90121487936/v/li/901216094961",
  "gibs-eda": "https://app.clickup.com/90121487936/v/li/901216237109",
};

const statusCycle: Record<string, "pending" | "in-progress" | "done"> = {
  pending: "in-progress",
  "in-progress": "done",
  done: "pending",
};

export function NotesContent({ slug }: { slug: string }) {
  const { data, loading } = useDashboardData<NotesData>(slug, "notes");
  const searchParams = useSearchParams();
  const periodParam = searchParams.get("period");
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [notes, setNotes] = useState<NotesData | null>(null);
  const [clickupPushing, setClickupPushing] = useState(false);
  const [clickupPushed, setClickupPushed] = useState(false);
  const [clickupResult, setClickupResult] = useState<{ created: number; total: number } | null>(null);

  // Editing state
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editSummary, setEditSummary] = useState("");
  const [editDecisions, setEditDecisions] = useState<string[]>([]);
  const [editMeetingNotes, setEditMeetingNotes] = useState<NoteSection[]>([]);
  const [editDataInsights, setEditDataInsights] = useState<string[]>([]);
  const [editAgencyActions, setEditAgencyActions] = useState<ActionItem[]>([]);
  const [editClientActions, setEditClientActions] = useState<ActionItem[]>([]);

  const displayNotes = notes || data;

  const getIds = useCallback(async () => {
    const { data: client } = await supabase
      .from("clients").select("id").eq("slug", slug).single();
    if (!client) throw new Error("Client not found");

    let periodId = periodParam;
    if (!periodId) {
      const { data: period } = await supabase
        .from("reporting_periods").select("id").eq("is_current", true).single();
      periodId = period?.id || null;
    }
    if (!periodId) throw new Error("No period found");
    return { clientId: client.id, periodId };
  }, [slug, periodParam]);

  async function handleProcess() {
    if (!transcript.trim()) return;
    setProcessing(true);
    try {
      const { clientId, periodId } = await getIds();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000);
      const res = await fetch("/api/process-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer 1234" },
        body: JSON.stringify({ clientId, periodId, transcript, meetingDate }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const errBody = await res.text();
        let errMsg = `Server error (${res.status})`;
        try { const parsed = JSON.parse(errBody); errMsg = parsed.error || errMsg; } catch { /* use default */ }
        alert("Failed to process transcript: " + errMsg);
        setProcessing(false);
        return;
      }
      const result = await res.json();
      if (result.success) {
        setNotes(result.notes);
        setShowUpload(false);
      } else {
        alert("Failed: " + (result.error || "Unknown error"));
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        alert("Request timed out. The transcript may be too long — try shortening it and retrying.");
      } else {
        alert("Error processing transcript: " + String(e));
      }
    }
    setProcessing(false);
  }

  async function toggleStatus(type: "agency" | "client", id: string) {
    if (!displayNotes) return;
    const key = type === "agency" ? "agencyActions" : "clientActions";
    const updated = {
      ...displayNotes,
      [key]: displayNotes[key].map(item =>
        item.id === id ? { ...item, status: statusCycle[item.status] } : item
      ),
    };
    setNotes(updated);

    // Persist to Supabase
    try {
      const { clientId, periodId } = await getIds();
      await supabase
        .from("dashboard_data")
        .update({ data: updated, updated_at: new Date().toISOString() })
        .eq("client_id", clientId)
        .eq("period_id", periodId)
        .eq("section", "notes");
    } catch (e) {
      console.error("Failed to save status:", e);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setTranscript(ev.target?.result as string || "");
    };
    reader.readAsText(file);
  }

  async function pushToClickUp() {
    if (!displayNotes || clickupPushing || clickupPushed) return;
    const allActions = [
      ...(displayNotes.agencyActions || []).map((a) => ({
        description: a.description,
        owner: a.owner,
        due: a.dueDate,
        priority: a.priority,
        type: "agency" as const,
      })),
      ...(displayNotes.clientActions || []).map((a) => ({
        description: a.description,
        owner: a.owner,
        due: a.dueDate,
        priority: a.priority,
        type: "client" as const,
      })),
    ];
    if (allActions.length === 0) return;

    setClickupPushing(true);
    try {
      const res = await fetch("/api/clickup-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientSlug: slug, actions: allActions }),
      });
      const result = await res.json();
      if (!res.ok) {
        alert("Failed to push to ClickUp: " + (result.error || "Unknown error"));
        setClickupPushing(false);
        return;
      }
      setClickupResult({ created: result.created, total: result.total });
      setClickupPushed(true);
    } catch (e) {
      alert("Error pushing to ClickUp: " + String(e));
    }
    setClickupPushing(false);
  }

  function exportNotes() {
    if (!displayNotes) return;
    const clientName = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const date = displayNotes.meetingDate || new Date().toISOString().split("T")[0];

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Strategy Notes – ${clientName} – ${date}</title>
<style>
  body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.6; }
  h1 { color: #4A1942; border-bottom: 2px solid #4A1942; padding-bottom: 8px; }
  h2 { color: #4A1942; margin-top: 32px; font-size: 18px; }
  h3 { color: #333; font-size: 15px; margin-top: 20px; }
  .summary { background: #f8f5f0; padding: 16px 20px; border-radius: 8px; border-left: 4px solid #4A1942; margin: 16px 0; }
  .insight { background: #eff6ff; padding: 8px 12px; border-radius: 6px; margin: 4px 0; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 14px; }
  th { background: #f3f4f6; text-align: left; padding: 8px 12px; border-bottom: 2px solid #ddd; font-size: 12px; text-transform: uppercase; }
  td { padding: 8px 12px; border-bottom: 1px solid #eee; }
  .priority-high { color: #dc2626; font-weight: bold; }
  .priority-medium { color: #d97706; }
  .priority-low { color: #6b7280; }
  ul { padding-left: 20px; }
  li { margin-bottom: 4px; font-size: 14px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
</style></head><body>`;

    html += `<h1>Strategy Notes – ${clientName}</h1>`;
    html += `<p style="color:#666; font-size:14px;">Meeting Date: <strong>${date}</strong></p>`;

    // Summary
    html += `<h2>Executive Summary</h2><div class="summary">${displayNotes.summary}</div>`;

    // Key Decisions
    if (displayNotes.keyDecisions?.length) {
      html += `<h2>Key Decisions</h2><ul>`;
      displayNotes.keyDecisions.forEach(d => { html += `<li>✓ ${d}</li>`; });
      html += `</ul>`;
    }

    // Meeting Notes
    html += `<h2>Meeting Notes</h2>`;
    if (Array.isArray(displayNotes.meetingNotes)) {
      displayNotes.meetingNotes.forEach(section => {
        html += `<h3>${section.topic}</h3><ul>`;
        section.points.forEach(p => { html += `<li>${p}</li>`; });
        html += `</ul>`;
      });
    } else {
      html += `<p>${displayNotes.meetingNotes}</p>`;
    }

    // Data Insights
    if (displayNotes.dataInsights?.length) {
      html += `<h2>Data Insights</h2>`;
      displayNotes.dataInsights.forEach(d => { html += `<div class="insight">📊 ${d}</div>`; });
    }

    // Action Items
    const renderActions = (title: string, items: ActionItem[]) => {
      if (!items?.length) return;
      html += `<h2>${title}</h2><table><tr><th>Task</th><th>Owner</th><th>Due</th><th>Priority</th><th>Status</th></tr>`;
      items.forEach(a => {
        html += `<tr><td>${a.description}</td><td>${a.owner}</td><td>${a.dueDate}</td><td class="priority-${a.priority}">${a.priority.toUpperCase()}</td><td>${a.status}</td></tr>`;
      });
      html += `</table>`;
    };
    renderActions("🏢 Agency Action Items", displayNotes.agencyActions);
    renderActions("👤 Client Action Items", displayNotes.clientActions);

    html += `<div class="footer">Generated by Club She Is. Reporting Dashboard — ${new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}</div>`;
    html += `</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Strategy_Notes_${clientName.replace(/\s+/g, "_")}_${date}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function startEdit(section: string) {
    if (!displayNotes) return;
    setEditingSection(section);
    switch (section) {
      case "summary":
        setEditSummary(displayNotes.summary);
        break;
      case "decisions":
        setEditDecisions([...(displayNotes.keyDecisions || [])]);
        break;
      case "meetingNotes":
        setEditMeetingNotes(
          Array.isArray(displayNotes.meetingNotes)
            ? displayNotes.meetingNotes.map(s => ({ ...s, points: [...s.points] }))
            : [{ topic: "Notes", points: [String(displayNotes.meetingNotes)] }]
        );
        break;
      case "dataInsights":
        setEditDataInsights([...(displayNotes.dataInsights || [])]);
        break;
      case "agencyActions":
        setEditAgencyActions(displayNotes.agencyActions.map(a => ({ ...a })));
        break;
      case "clientActions":
        setEditClientActions(displayNotes.clientActions.map(a => ({ ...a })));
        break;
    }
  }

  async function saveEdit(section: string) {
    if (!displayNotes) return;
    let updated = { ...displayNotes };
    switch (section) {
      case "summary":
        updated = { ...updated, summary: editSummary };
        break;
      case "decisions":
        updated = { ...updated, keyDecisions: editDecisions.filter(d => d.trim()) };
        break;
      case "meetingNotes":
        updated = { ...updated, meetingNotes: editMeetingNotes };
        break;
      case "dataInsights":
        updated = { ...updated, dataInsights: editDataInsights.filter(d => d.trim()) };
        break;
      case "agencyActions":
        updated = { ...updated, agencyActions: editAgencyActions };
        break;
      case "clientActions":
        updated = { ...updated, clientActions: editClientActions };
        break;
    }
    setNotes(updated);
    setEditingSection(null);

    try {
      const { clientId, periodId } = await getIds();
      await supabase
        .from("dashboard_data")
        .update({ data: updated, updated_at: new Date().toISOString() })
        .eq("client_id", clientId)
        .eq("period_id", periodId)
        .eq("section", "notes");
    } catch (e) {
      console.error("Failed to save edit:", e);
    }
  }

  function cancelEdit() {
    setEditingSection(null);
  }

  function EditButton({ section }: { section: string }) {
    if (editingSection === section) {
      return (
        <div className="flex items-center gap-1">
          <button onClick={() => saveEdit(section)} className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors" title="Save">
            <Save size={14} />
          </button>
          <button onClick={cancelEdit} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors" title="Cancel">
            <X size={14} />
          </button>
        </div>
      );
    }
    return (
      <button onClick={() => startEdit(section)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Edit">
        <Pencil size={14} />
      </button>
    );
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl font-semibold text-gray-900">Strategy Notes</h2>
          <p className="text-sm text-gray-500">
            {displayNotes?.generatedAt
              ? `Last updated ${new Date(displayNotes.generatedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}`
              : "Upload a meeting transcript to generate notes and action items."}
          </p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-2 px-4 py-2 bg-[#4A1942] text-white font-medium text-sm rounded-lg hover:bg-[#3a1335] transition-colors"
        >
          <Upload size={16} />
          {displayNotes ? "Upload New Transcript" : "Upload Transcript"}
        </button>
      </div>

      {/* Upload Area */}
      {showUpload && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Meeting Date</label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="mt-1 block border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1942]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Upload File</label>
              <input
                type="file"
                accept=".txt,.md,.doc,.docx"
                onChange={handleFileUpload}
                className="mt-1 block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Or Paste Transcript</label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste your meeting transcript or notes here..."
              rows={10}
              className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1942] resize-y"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowUpload(false)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">
              Cancel
            </button>
            <button
              onClick={handleProcess}
              disabled={processing || !transcript.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium text-sm rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition-all"
            >
              <Sparkles size={16} className={processing ? "animate-spin" : ""} />
              {processing ? "Analyzing transcript..." : "Process with AI"}
            </button>
          </div>
          {processing && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <p className="text-sm text-amber-900">Reading transcript and analyzing against dashboard data...</p>
              <p className="text-xs text-amber-600 mt-1">This may take 20-30 seconds</p>
            </div>
          )}
        </div>
      )}

      {/* Generated Notes */}
      {displayNotes && (
        <div className="space-y-6">
          {/* Meeting Info */}
          {displayNotes.meetingDate && (
            <p className="text-sm text-gray-500">Meeting Date: <span className="font-medium text-gray-900">{displayNotes.meetingDate}</span></p>
          )}

          {/* Executive Summary */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Executive Summary</h3>
              <EditButton section="summary" />
            </div>
            {editingSection === "summary" ? (
              <textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                rows={4}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y"
              />
            ) : (
              <p className="text-sm leading-relaxed">{displayNotes.summary}</p>
            )}
          </div>

          {/* Key Decisions */}
          {(displayNotes.keyDecisions && displayNotes.keyDecisions.length > 0) || editingSection === "decisions" ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Key Decisions</h3>
                <EditButton section="decisions" />
              </div>
              {editingSection === "decisions" ? (
                <div className="space-y-2">
                  {editDecisions.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={d}
                        onChange={(e) => { const u = [...editDecisions]; u[i] = e.target.value; setEditDecisions(u); }}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1942]"
                      />
                      <button onClick={() => setEditDecisions(editDecisions.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  <button onClick={() => setEditDecisions([...editDecisions, ""])} className="flex items-center gap-1 text-xs text-[#4A1942] hover:underline"><Plus size={12} /> Add decision</button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {displayNotes.keyDecisions?.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-900">
                      <CheckCircle size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {/* Meeting Notes */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Meeting Notes</h3>
              <EditButton section="meetingNotes" />
            </div>
            {editingSection === "meetingNotes" ? (
              <div className="space-y-4">
                {editMeetingNotes.map((section, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        value={section.topic}
                        onChange={(e) => { const u = [...editMeetingNotes]; u[i] = { ...u[i], topic: e.target.value }; setEditMeetingNotes(u); }}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#4A1942]"
                        placeholder="Section topic"
                      />
                      <button onClick={() => setEditMeetingNotes(editMeetingNotes.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                    {section.points.map((point, j) => (
                      <div key={j} className="flex items-center gap-2 ml-4">
                        <span className="text-gray-400">•</span>
                        <input
                          value={point}
                          onChange={(e) => { const u = [...editMeetingNotes]; u[i] = { ...u[i], points: [...u[i].points] }; u[i].points[j] = e.target.value; setEditMeetingNotes(u); }}
                          className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#4A1942]"
                        />
                        <button onClick={() => { const u = [...editMeetingNotes]; u[i] = { ...u[i], points: u[i].points.filter((_, k) => k !== j) }; setEditMeetingNotes(u); }} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                      </div>
                    ))}
                    <button onClick={() => { const u = [...editMeetingNotes]; u[i] = { ...u[i], points: [...u[i].points, ""] }; setEditMeetingNotes(u); }} className="ml-4 flex items-center gap-1 text-xs text-[#4A1942] hover:underline"><Plus size={12} /> Add point</button>
                  </div>
                ))}
                <button onClick={() => setEditMeetingNotes([...editMeetingNotes, { topic: "", points: [""] }])} className="flex items-center gap-1 text-xs text-[#4A1942] hover:underline"><Plus size={12} /> Add section</button>
              </div>
            ) : Array.isArray(displayNotes.meetingNotes) ? (
              <div className="space-y-5">
                {displayNotes.meetingNotes.map((section, i) => (
                  <div key={i}>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4A1942]" />
                      {section.topic}
                    </h4>
                    <ul className="space-y-1.5 ml-4">
                      {section.points.map((point, j) => (
                        <li key={j} className="text-sm text-gray-700 leading-relaxed flex items-start gap-2">
                          <span className="text-gray-400 mt-1.5 flex-shrink-0">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{displayNotes.meetingNotes}</div>
            )}
          </div>

          {/* Data Insights */}
          {(displayNotes.dataInsights && displayNotes.dataInsights.length > 0) || editingSection === "dataInsights" ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wider">Data Insights from Dashboard</h3>
                <EditButton section="dataInsights" />
              </div>
              {editingSection === "dataInsights" ? (
                <div className="space-y-2">
                  {editDataInsights.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={d}
                        onChange={(e) => { const u = [...editDataInsights]; u[i] = e.target.value; setEditDataInsights(u); }}
                        className="flex-1 border border-blue-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <button onClick={() => setEditDataInsights(editDataInsights.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  <button onClick={() => setEditDataInsights([...editDataInsights, ""])} className="flex items-center gap-1 text-xs text-blue-700 hover:underline"><Plus size={12} /> Add insight</button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {displayNotes.dataInsights?.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-blue-900">
                      <Sparkles size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                      {insight}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {/* Agency Action Items */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span />
              <EditButton section="agencyActions" />
            </div>
            {editingSection === "agencyActions" ? (
              <EditableActionItems
                title="Agency Action Items"
                subtitle="Tasks for the Club She Is team"
                emoji="🏢"
                items={editAgencyActions}
                setItems={setEditAgencyActions}
                borderColor="#4A1942"
                onSave={() => saveEdit("agencyActions")}
                onCancel={cancelEdit}
              />
            ) : (
              <ActionItemsTable
                title="Agency Action Items"
                subtitle="Tasks for the Club She Is team"
                emoji="🏢"
                items={displayNotes.agencyActions || []}
                onToggle={(id) => toggleStatus("agency", id)}
                borderColor="#4A1942"
              />
            )}
          </div>

          {/* Client Action Items */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span />
              <EditButton section="clientActions" />
            </div>
            {editingSection === "clientActions" ? (
              <EditableActionItems
                title="Client Action Items"
                subtitle="Tasks for the client to complete"
                emoji="👤"
                items={editClientActions}
                setItems={setEditClientActions}
                borderColor="#059669"
                onSave={() => saveEdit("clientActions")}
                onCancel={cancelEdit}
              />
            ) : (
              <ActionItemsTable
                title="Client Action Items"
                subtitle="Tasks for the client to complete"
                emoji="👤"
                items={displayNotes.clientActions || []}
                onToggle={(id) => toggleStatus("client", id)}
                borderColor="#059669"
              />
            )}
          </div>

          {/* Push to ClickUp */}
          {((displayNotes.agencyActions?.length || 0) > 0 || (displayNotes.clientActions?.length || 0) > 0) && (
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={pushToClickUp}
                disabled={clickupPushing || clickupPushed}
                className={`flex items-center gap-2 px-5 py-2.5 font-medium text-sm rounded-lg transition-all ${
                  clickupPushed
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                    : "bg-[#7B68EE] text-white hover:bg-[#6A5ACD] disabled:opacity-50"
                }`}
              >
                {clickupPushed ? (
                  <>
                    <CheckCircle size={16} />
                    Pushed to ClickUp ✓
                  </>
                ) : clickupPushing ? (
                  <>
                    <ExternalLink size={16} className="animate-pulse" />
                    Creating tasks...
                  </>
                ) : (
                  <>
                    <ExternalLink size={16} />
                    Push to ClickUp
                  </>
                )}
              </button>
              <a
                href={CLICKUP_LIST_URLS[slug] || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 font-medium text-sm rounded-lg border border-[#7B68EE] text-[#7B68EE] hover:bg-[#7B68EE]/5 transition-all"
              >
                <ExternalLink size={16} />
                Open in ClickUp
              </a>
              <button
                onClick={exportNotes}
                className="flex items-center gap-2 px-5 py-2.5 font-medium text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
              >
                <Download size={16} />
                Export Notes
              </button>
              {clickupResult && (
                <span className="text-sm text-emerald-600">
                  {clickupResult.created} of {clickupResult.total} tasks created
                </span>
              )}
            </div>
          )}

          {/* Show/hide transcript */}
          {displayNotes.transcript && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="w-full px-6 py-3 flex items-center justify-between text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <span>Original Transcript</span>
                {showTranscript ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showTranscript && (
                <div className="px-6 pb-4 text-xs text-gray-500 whitespace-pre-wrap max-h-96 overflow-y-auto border-t border-gray-100">
                  {displayNotes.transcript}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!displayNotes && !showUpload && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Upload size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No strategy notes for this period yet.</p>
          <p className="text-gray-400 text-xs mt-1">Upload a meeting transcript to get AI-generated notes, action items, and data insights.</p>
        </div>
      )}
    </div>
  );
}

function EditableActionItems({
  title, subtitle, emoji, items, setItems, borderColor, onSave, onCancel,
}: {
  title: string;
  subtitle: string;
  emoji: string;
  items: ActionItem[];
  setItems: (items: ActionItem[]) => void;
  borderColor: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  function addItem() {
    setItems([...items, {
      id: `new-${Date.now()}`,
      description: "",
      owner: "",
      dueDate: "",
      priority: "medium",
      status: "pending",
    }]);
  }

  function updateItem(index: number, field: keyof ActionItem, value: string) {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setItems(updated);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200" style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}>
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <span>{emoji}</span> {title}
        </h3>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      <div className="p-4 space-y-3">
        {items.map((item, i) => (
          <div key={item.id} className="flex items-start gap-2 border border-gray-100 rounded-lg p-3">
            <div className="flex-1 space-y-2">
              <input
                value={item.description}
                onChange={(e) => updateItem(i, "description", e.target.value)}
                placeholder="Task description"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#4A1942]"
              />
              <div className="flex items-center gap-2">
                <input
                  value={item.owner}
                  onChange={(e) => updateItem(i, "owner", e.target.value)}
                  placeholder="Owner"
                  className="w-32 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#4A1942]"
                />
                <input
                  value={item.dueDate}
                  onChange={(e) => updateItem(i, "dueDate", e.target.value)}
                  placeholder="Due date"
                  className="w-28 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#4A1942]"
                />
                <select
                  value={item.priority}
                  onChange={(e) => updateItem(i, "priority", e.target.value)}
                  className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#4A1942]"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 mt-1"><Trash2 size={14} /></button>
          </div>
        ))}
        <div className="flex items-center justify-between pt-2">
          <button onClick={addItem} className="flex items-center gap-1 text-xs text-[#4A1942] hover:underline"><Plus size={12} /> Add task</button>
          <div className="flex items-center gap-2">
            <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
            <button onClick={onSave} className="flex items-center gap-1 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700"><Save size={12} /> Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionItemsTable({
  title, subtitle, emoji, items, onToggle, borderColor,
}: {
  title: string;
  subtitle: string;
  emoji: string;
  items: ActionItem[];
  onToggle: (id: string) => void;
  borderColor: string;
}) {
  if (!items.length) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200" style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}>
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <span>{emoji}</span> {title}
        </h3>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">Owner</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Due</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => {
              const st = statusStyles[item.status];
              const pr = priorityStyles[item.priority];
              const StatusIcon = st.icon;
              return (
                <tr key={item.id} className={`hover:bg-gray-50 ${item.status === "done" ? "opacity-60" : ""}`}>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => onToggle(item.id)}
                      className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                      title={`Click to change: ${st.label}`}
                    >
                      <StatusIcon size={18} style={{ color: st.text }} />
                    </button>
                  </td>
                  <td className={`px-4 py-3 text-gray-900 ${item.status === "done" ? "line-through" : ""}`}>
                    {item.description}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.owner}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{item.dueDate}</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-[0.6rem] font-bold uppercase px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: pr.bg, color: pr.text }}
                    >
                      {item.priority}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
