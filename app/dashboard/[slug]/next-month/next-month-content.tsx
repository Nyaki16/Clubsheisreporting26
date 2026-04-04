"use client";

import { useDashboardData } from "@/lib/use-dashboard-data";
import { RecommendationCard } from "@/components/dashboard/RecommendationCard";
import { TargetsTable } from "@/components/dashboard/TargetsTable";
import { LoadingSkeleton } from "@/components/dashboard/LoadingSkeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import type { NextMonthData } from "@/types/dashboard";

export function NextMonthContent({ slug }: { slug: string }) {
  const { data, loading } = useDashboardData<NextMonthData>(slug, "nextMonth");

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
