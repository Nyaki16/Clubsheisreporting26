"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useDashboardData } from "@/lib/use-dashboard-data";
import { LoadingSkeleton } from "@/components/dashboard/LoadingSkeleton";
import { Upload, Sparkles, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

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
      ...displayNotes.agencyActions.map((a) => ({
        description: a.description,
        owner: a.owner,
        due: a.dueDate,
        priority: a.priority,
        type: "agency" as const,
      })),
      ...displayNotes.clientActions.map((a) => ({
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
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-2">Executive Summary</h3>
            <p className="text-sm leading-relaxed">{displayNotes.summary}</p>
          </div>

          {/* Key Decisions */}
          {displayNotes.keyDecisions && displayNotes.keyDecisions.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Key Decisions</h3>
              <ul className="space-y-2">
                {displayNotes.keyDecisions.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-900">
                    <CheckCircle size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Meeting Notes */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Meeting Notes</h3>
            {Array.isArray(displayNotes.meetingNotes) ? (
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
          {displayNotes.dataInsights && displayNotes.dataInsights.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wider mb-3">Data Insights from Dashboard</h3>
              <ul className="space-y-2">
                {displayNotes.dataInsights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-blue-900">
                    <Sparkles size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Agency Action Items */}
          <ActionItemsTable
            title="Agency Action Items"
            subtitle="Tasks for the Club She Is team"
            emoji="🏢"
            items={displayNotes.agencyActions}
            onToggle={(id) => toggleStatus("agency", id)}
            borderColor="#4A1942"
          />

          {/* Client Action Items */}
          <ActionItemsTable
            title="Client Action Items"
            subtitle="Tasks for the client to complete"
            emoji="👤"
            items={displayNotes.clientActions}
            onToggle={(id) => toggleStatus("client", id)}
            borderColor="#059669"
          />

          {/* Push to ClickUp */}
          {(displayNotes.agencyActions.length > 0 || displayNotes.clientActions.length > 0) && (
            <div className="flex items-center gap-4">
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
