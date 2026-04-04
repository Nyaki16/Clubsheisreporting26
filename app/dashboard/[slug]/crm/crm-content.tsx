"use client";

import { useDashboardSections } from "@/lib/use-dashboard-data";
import { KPICard } from "@/components/dashboard/KPICard";
import { KPICardTinted } from "@/components/dashboard/KPICardTinted";
import { ContactsBySourceChart } from "@/components/dashboard/ContactsBySourceChart";
import { WeeklyContactsRevenueChart } from "@/components/dashboard/WeeklyContactsRevenue";
import { ContactSourceTable } from "@/components/dashboard/ContactSourceTable";
import { ProductSalesChart } from "@/components/dashboard/ProductSalesChart";
import { TopTagsChart } from "@/components/dashboard/TopTagsChart";
import { TrafficSourcesTable } from "@/components/dashboard/TrafficSourcesTable";
import { LoadingSkeleton } from "@/components/dashboard/LoadingSkeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import type { GHLData, SystemeData } from "@/types/dashboard";

export function CRMContent({ slug }: { slug: string }) {
  const { data: sections, loading } = useDashboardSections(slug, ["ghl", "systeme"]);
  const ghlData = sections.ghl as GHLData | undefined || null;
  const systemeData = sections.systeme as SystemeData | undefined || null;

  if (loading) return <LoadingSkeleton />;
  if (!ghlData && !systemeData) return <EmptyState message="No CRM data available for this client." />;

  return (
    <div className="space-y-8">
      {/* Ghutte Section */}
      {ghlData && (
        <>
          <div>
            <h2 className="font-serif text-xl font-semibold text-gray-900">CRM — Ghutte</h2>
            <p className="text-sm text-gray-500 mb-4">New contacts, revenue, opportunities, and pipeline from Ghutte.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {ghlData.kpis.slice(0, 5).map((kpi) => (
                <KPICard key={kpi.label} label={kpi.label} value={kpi.value} badge={kpi.badge} direction={kpi.direction} />
              ))}
            </div>
            {ghlData.kpis.length > 5 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {ghlData.kpis.slice(5).map((kpi) => (
                  <KPICard key={kpi.label} label={kpi.label} value={kpi.value} badge={kpi.badge} direction={kpi.direction} />
                ))}
              </div>
            )}
          </div>

          {/* Charts side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {ghlData.contactsBySource && (
              <ContactsBySourceChart labels={ghlData.contactsBySource.labels} values={ghlData.contactsBySource.values} />
            )}
            {ghlData.weeklyContactsRevenue && (
              <WeeklyContactsRevenueChart
                labels={ghlData.weeklyContactsRevenue.labels}
                contacts={ghlData.weeklyContactsRevenue.contacts}
                revenue={ghlData.weeklyContactsRevenue.revenue}
              />
            )}
          </div>

          {/* Contact Source Breakdown */}
          {ghlData.sourceBreakdown && ghlData.sourceBreakdown.length > 0 && (
            <ContactSourceTable data={ghlData.sourceBreakdown} />
          )}
        </>
      )}

      {/* Systeme.io Section */}
      {systemeData && (
        <>
          <div>
            <h2 className="font-serif text-xl font-semibold text-gray-900 flex items-center gap-2">
              <span>📊</span> Systeme.io
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {systemeData.kpis.map((kpi) => (
                <KPICardTinted key={kpi.label} tint="green" label={kpi.label} value={kpi.value} badge={kpi.badge} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {systemeData.productSales && systemeData.productSales.length > 0 && (
              <ProductSalesChart data={systemeData.productSales} />
            )}
            {systemeData.topTags && systemeData.topTags.length > 0 && (
              <TopTagsChart data={systemeData.topTags} />
            )}
          </div>

          {systemeData.trafficSources && systemeData.trafficSources.length > 0 && (
            <TrafficSourcesTable data={systemeData.trafficSources} />
          )}
        </>
      )}
    </div>
  );
}
