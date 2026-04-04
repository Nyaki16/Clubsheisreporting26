"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useDashboardData } from "@/lib/use-dashboard-data";
import { KPICard } from "@/components/dashboard/KPICard";
import { LoadingSkeleton } from "@/components/dashboard/LoadingSkeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { RefreshCw, Save, Pencil } from "lucide-react";

interface Campaign {
  name: string;
  subject: string;
  date: string;
  sent: number;
  delivered: number;
  failed: number;
  deliveryRate: string;
  openRate?: string;
  ctr?: string;
}

interface EmailData {
  kpis: {
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    deliveryRate: string;
    campaignCount: number;
  };
  campaigns: Campaign[];
}

export function EmailContent({ slug }: { slug: string }) {
  const { data, loading } = useDashboardData<EmailData>(slug, "email");
  const searchParams = useSearchParams();
  const periodParam = searchParams.get("period");
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncedData, setSyncedData] = useState<EmailData | null>(null);
  const [editing, setEditing] = useState(false);
  const [editCampaigns, setEditCampaigns] = useState<Campaign[]>([]);
  const [saving, setSaving] = useState(false);

  const emailData = syncedData || data;

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);

    try {
      const { data: client } = await supabase
        .from("clients").select("id").eq("slug", slug).single();
      if (!client) { setSyncError("Client not found"); setSyncing(false); return; }

      let periodId = periodParam;
      if (!periodId) {
        const { data: period } = await supabase
          .from("reporting_periods").select("id").eq("is_current", true).single();
        periodId = period?.id || null;
      }
      if (!periodId) { setSyncError("No active period found"); setSyncing(false); return; }

      const res = await fetch("/api/email-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: client.id, periodId }),
      });

      const result = await res.json();
      if (!res.ok) {
        setSyncError(result.error || "Sync failed");
      } else {
        setSyncedData(result.data);
      }
    } catch (e) {
      setSyncError(String(e));
    } finally {
      setSyncing(false);
    }
  }, [slug, periodParam]);

  function startEdit() {
    if (!emailData) return;
    setEditCampaigns(emailData.campaigns.map(c => ({ ...c })));
    setEditing(true);
  }

  function updateCampaign(idx: number, field: "openRate" | "ctr", value: string) {
    const next = [...editCampaigns];
    next[idx] = { ...next[idx], [field]: value };
    setEditCampaigns(next);
  }

  async function saveRates() {
    if (!emailData) return;
    setSaving(true);

    try {
      const { data: client } = await supabase
        .from("clients").select("id").eq("slug", slug).single();
      if (!client) { setSaving(false); return; }

      let periodId = periodParam;
      if (!periodId) {
        const { data: period } = await supabase
          .from("reporting_periods").select("id").eq("is_current", true).single();
        periodId = period?.id || null;
      }
      if (!periodId) { setSaving(false); return; }

      const updated: EmailData = {
        kpis: emailData.kpis,
        campaigns: editCampaigns,
      };

      await supabase
        .from("dashboard_data")
        .update({ data: updated, updated_at: new Date().toISOString() })
        .eq("client_id", client.id)
        .eq("period_id", periodId)
        .eq("section", "email");

      setSyncedData(updated);
      setEditing(false);
    } catch (e) {
      console.error("Save error:", e);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl font-semibold text-gray-900">Email Marketing</h2>
          <p className="text-sm text-gray-500">Email campaign performance from GoHighLevel.</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 text-sm font-medium text-white bg-[#4A1942] hover:bg-[#3a1335] px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync Email Data"}
        </button>
      </div>

      {syncError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {syncError}
        </div>
      )}

      {!emailData ? (
        <EmptyState message="No email data available. Click 'Sync Email Data' to fetch from GoHighLevel." />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <KPICard label="Total Emails Sent" value={emailData.kpis.totalSent.toLocaleString()} icon="mail" />
            <KPICard label="Delivered" value={emailData.kpis.totalDelivered.toLocaleString()} icon="check-circle" />
            <KPICard label="Failed" value={emailData.kpis.totalFailed.toLocaleString()} icon="trending-down" direction="down" />
            <KPICard label="Delivery Rate" value={emailData.kpis.deliveryRate} icon="percent" />
            <KPICard label="Campaigns" value={emailData.kpis.campaignCount.toString()} icon="mail" />
          </div>

          {/* Campaigns Table */}
          {emailData.campaigns.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Email Campaigns</h3>
                {!editing ? (
                  <button
                    onClick={startEdit}
                    className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-900 font-medium px-2 py-1 rounded hover:bg-emerald-50 transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit Open / CTR
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditing(false)}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveRates}
                      disabled={saving}
                      className="flex items-center gap-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded disabled:opacity-50"
                    >
                      <Save className="w-3 h-3" />
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Sent</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Delivered</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Failed</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Delivery %</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Open Rate</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">CTR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(editing ? editCampaigns : emailData.campaigns).map((campaign, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{campaign.date}</td>
                        <td className="px-4 py-3 text-gray-900 font-medium max-w-[200px] truncate">{campaign.name}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{campaign.subject}</td>
                        <td className="px-4 py-3 text-gray-900 text-right">{campaign.sent.toLocaleString()}</td>
                        <td className="px-4 py-3 text-emerald-700 text-right">{campaign.delivered.toLocaleString()}</td>
                        <td className="px-4 py-3 text-red-600 text-right">{campaign.failed.toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-900 text-right font-medium">{campaign.deliveryRate}</td>
                        <td className="px-4 py-3 text-right">
                          {editing ? (
                            <input
                              type="text"
                              value={editCampaigns[i]?.openRate || ""}
                              onChange={(e) => updateCampaign(i, "openRate", e.target.value)}
                              placeholder="e.g. 24.5%"
                              className="w-20 text-right border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          ) : (
                            <span className={campaign.openRate ? "text-blue-700 font-medium" : "text-gray-400"}>
                              {campaign.openRate || "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {editing ? (
                            <input
                              type="text"
                              value={editCampaigns[i]?.ctr || ""}
                              onChange={(e) => updateCampaign(i, "ctr", e.target.value)}
                              placeholder="e.g. 3.2%"
                              className="w-20 text-right border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          ) : (
                            <span className={campaign.ctr ? "text-purple-700 font-medium" : "text-gray-400"}>
                              {campaign.ctr || "—"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
