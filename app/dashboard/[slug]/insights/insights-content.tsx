"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { LoadingSkeleton } from "@/components/dashboard/LoadingSkeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import type { InsightsData } from "@/types/dashboard";

export function InsightsContent({ slug }: { slug: string }) {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: client } = await supabase.from("clients").select("id").eq("slug", slug).single();
      if (!client) { setLoading(false); return; }
      const { data: period } = await supabase.from("reporting_periods").select("id").eq("is_current", true).single();
      if (!period) { setLoading(false); return; }
      const { data: section } = await supabase
        .from("dashboard_data").select("data")
        .eq("client_id", client.id).eq("period_id", period.id).eq("section", "insights").single();
      if (section?.data) setData(section.data as InsightsData);
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) return <LoadingSkeleton />;
  if (!data) return <EmptyState message="No insights available yet. Data will be generated after the next sync." />;

  // Support both formats: {icon, text} or {title}
  const rawData = data as unknown as Record<string, unknown>;
  const wins = ((rawData.wins || []) as Record<string, string>[]).map((w) => ({
    icon: w.icon || "trending-up",
    text: w.text || w.title || "",
  }));
  const alerts = ((rawData.alerts || rawData.improvements || []) as Record<string, string>[]).map((a) => ({
    icon: a.icon || "alert-triangle",
    text: a.text || a.title || "",
  }));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-xl font-semibold text-gray-900">Wins & Insights</h2>
        <p className="text-sm text-gray-500 mb-4">Highlights and observations from this month&apos;s performance.</p>
      </div>

      {wins.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Wins</h3>
          <div className="space-y-3">
            {wins.map((win, i) => (
              <InsightCard key={i} icon={win.icon} text={win.text} type="win" />
            ))}
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Alerts</h3>
          <div className="space-y-3">
            {alerts.map((alert, i) => (
              <InsightCard key={i} icon={alert.icon} text={alert.text} type="alert" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
