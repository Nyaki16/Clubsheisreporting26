"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { RecommendationCard } from "@/components/dashboard/RecommendationCard";
import { TargetsTable } from "@/components/dashboard/TargetsTable";
import { LoadingSkeleton } from "@/components/dashboard/LoadingSkeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import type { NextMonthData } from "@/types/dashboard";

export function NextMonthContent({ slug }: { slug: string }) {
  const [data, setData] = useState<NextMonthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: client } = await supabase.from("clients").select("id").eq("slug", slug).single();
      if (!client) { setLoading(false); return; }
      const { data: period } = await supabase.from("reporting_periods").select("id").eq("is_current", true).single();
      if (!period) { setLoading(false); return; }
      const { data: section } = await supabase
        .from("dashboard_data").select("data")
        .eq("client_id", client.id).eq("period_id", period.id).eq("section", "nextMonth").single();
      if (section?.data) setData(section.data as NextMonthData);
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) return <LoadingSkeleton />;
  if (!data) return <EmptyState message="Next month recommendations will be generated after the next sync." />;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-xl font-semibold text-gray-900">Next Month</h2>
        <p className="text-sm text-gray-500 mb-4">Focus areas and targets for the coming month.</p>
      </div>

      {data.focusAreas && data.focusAreas.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Focus Areas</h3>
          <div className="space-y-3">
            {(data.focusAreas as unknown as Record<string, string>[]).map((area, i) => {
              // Support both formats: {priority, area, recommendation} or {icon, text}
              if (area.priority && area.area && area.recommendation) {
                return <RecommendationCard key={i} priority={area.priority as "high" | "medium" | "low"} area={area.area} recommendation={area.recommendation} />;
              }
              // Fallback for {icon, text} format from actual DB
              return (
                <div key={i} className="bg-white border border-gray-200 rounded-xl px-5 py-4" style={{ borderLeftWidth: 4, borderLeftColor: "#059669" }}>
                  <p className="text-sm text-gray-900">{area.text || area.recommendation || ""}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.targets && data.targets.length > 0 && (
        <TargetsTable targets={data.targets} />
      )}
    </div>
  );
}
