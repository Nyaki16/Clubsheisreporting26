"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useDashboardData } from "@/lib/use-dashboard-data";
import { KPICard } from "@/components/dashboard/KPICard";
import { LoadingSkeleton } from "@/components/dashboard/LoadingSkeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Mail, Send, CheckCircle, XCircle, RefreshCw } from "lucide-react";

interface EmailData {
  kpis: {
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    deliveryRate: string;
    campaignCount: number;
  };
  campaigns: {
    name: string;
    subject: string;
    date: string;
    sent: number;
    delivered: number;
    failed: number;
    deliveryRate: string;
  }[];
}

export function EmailContent({ slug }: { slug: string }) {
  const { data, loading } = useDashboardData<EmailData>(slug, "email");
  const searchParams = useSearchParams();
  const periodParam = searchParams.get("period");
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncedData, setSyncedData] = useState<EmailData | null>(null);

  // Use synced data if available, otherwise use data from hook
  const emailData = syncedData || data;

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);

    try {
      // Resolve clientId from slug
      const { data: client } = await supabase
        .from("clients").select("id").eq("slug", slug).single();
      if (!client) {
        setSyncError("Client not found");
        setSyncing(false);
        return;
      }

      // Resolve periodId
      let periodId = periodParam;
      if (!periodId) {
        const { data: period } = await supabase
          .from("reporting_periods").select("id").eq("is_current", true).single();
        periodId = period?.id || null;
      }
      if (!periodId) {
        setSyncError("No active period found");
        setSyncing(false);
        return;
      }

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
            <KPICard
              label="Total Emails Sent"
              value={emailData.kpis.totalSent.toLocaleString()}
              icon="mail"
            />
            <KPICard
              label="Delivered"
              value={emailData.kpis.totalDelivered.toLocaleString()}
              icon="check-circle"
            />
            <KPICard
              label="Failed"
              value={emailData.kpis.totalFailed.toLocaleString()}
              icon="trending-down"
            />
            <KPICard
              label="Delivery Rate"
              value={emailData.kpis.deliveryRate}
              icon="percent"
            />
            <KPICard
              label="Campaigns"
              value={emailData.kpis.campaignCount.toString()}
              icon="mail"
            />
          </div>

          {/* Campaigns Table */}
          {emailData.campaigns.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Email Campaigns</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign Name</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Sent</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Delivered</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Failed</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Delivery %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {emailData.campaigns.map((campaign, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{campaign.date}</td>
                        <td className="px-6 py-3 text-gray-900 font-medium">{campaign.name}</td>
                        <td className="px-6 py-3 text-gray-600 max-w-xs truncate">{campaign.subject}</td>
                        <td className="px-6 py-3 text-gray-900 text-right">{campaign.sent.toLocaleString()}</td>
                        <td className="px-6 py-3 text-emerald-700 text-right">{campaign.delivered.toLocaleString()}</td>
                        <td className="px-6 py-3 text-red-600 text-right">{campaign.failed.toLocaleString()}</td>
                        <td className="px-6 py-3 text-gray-900 text-right font-medium">{campaign.deliveryRate}</td>
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
