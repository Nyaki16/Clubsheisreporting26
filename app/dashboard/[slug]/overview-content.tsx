"use client";

import { useDashboardData } from "@/lib/use-dashboard-data";
import { KPICard } from "@/components/dashboard/KPICard";
import { KPICardTinted } from "@/components/dashboard/KPICardTinted";
import { RevenueVsFailedChart } from "@/components/dashboard/RevenueVsFailedChart";
import { PerformanceTrendChart } from "@/components/dashboard/PerformanceTrendChart";
import { CampaignSpendChart } from "@/components/dashboard/CampaignSpendChart";
import { LoadingSkeleton } from "@/components/dashboard/LoadingSkeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import type { OverviewData } from "@/types/dashboard";

export function OverviewContent({ slug }: { slug: string }) {
  const { data, loading } = useDashboardData<OverviewData>(slug, "overview");

  if (loading) return <LoadingSkeleton />;
  if (!data) return <EmptyState message="No overview data available for this period." />;

  return (
    <div className="space-y-8">
      {/* Monthly Snapshot */}
      <div>
        <h2 className="font-serif text-xl font-semibold text-gray-900">Monthly Snapshot</h2>
        <p className="text-sm text-gray-500 mb-4">A high-level view of performance across all channels this month.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {data.kpis.slice(0, 5).map((kpi) => (
            <KPICard key={kpi.label} label={kpi.label} value={kpi.value} badge={kpi.badge} direction={kpi.direction} icon={kpi.icon} />
          ))}
        </div>
        {data.kpis.length > 5 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {data.kpis.slice(5).map((kpi) => (
              <KPICard key={kpi.label} label={kpi.label} value={kpi.value} badge={kpi.badge} direction={kpi.direction} icon={kpi.icon} />
            ))}
          </div>
        )}
      </div>

      {/* Paystack Payments */}
      {data.paystack && (
        <div>
          <h2 className="font-serif text-xl font-semibold text-gray-900 flex items-center gap-2">
            <span>💳</span> Paystack Payments
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <KPICard label="Paystack Revenue" value={data.paystack.revenueFormatted} badge={data.paystack.revenueBadge} direction="up" />
            {data.paystack.activeMemberships !== undefined && (
              <KPICard label="Active Memberships" value={String(data.paystack.activeMemberships)} badge={data.paystack.membershipBreakdown} direction="up" />
            )}
            <KPICard label="Failed Transactions" value={data.paystack.failedFormatted} badge={data.paystack.failedBadge} direction="down" />
            <KPICard label="Abandoned" value={data.paystack.abandonedFormatted} badge={data.paystack.abandonedBadge} direction="down" />
          </div>
        </div>
      )}

      {/* Missed Revenue */}
      {data.missedRevenue && (
        <div>
          <h2 className="font-serif text-xl font-semibold text-gray-900 flex items-center gap-2">
            <span>⚠️</span> Missed Revenue Opportunities
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
            <KPICardTinted tint="red" label="Total Lost Revenue" value={data.missedRevenue.totalLostFormatted} badge="▼ Failed + abandoned + reversed" />
            <KPICardTinted tint="red" label="Failed Payments" value={`R ${data.missedRevenue.failedPayments.toLocaleString()}`} badge={data.missedRevenue.failedPaymentsBadge} />
            <KPICardTinted tint="red" label="Abandoned Carts" value={`R ${data.missedRevenue.abandonedCarts.toLocaleString()}`} badge={data.missedRevenue.abandonedCartsBadge} />
            <KPICardTinted tint="red" label="Reversed / Chargebacks" value={`R ${data.missedRevenue.reversedChargebacks.toLocaleString()}`} badge={data.missedRevenue.reversedChargebacksBadge} />
            <KPICardTinted tint="red" label="Revenue Recovery Rate" value={`${data.missedRevenue.recoveryRate}%`} badge={data.missedRevenue.recoveryRateBadge} />
          </div>
        </div>
      )}

      {/* Revenue vs Failed Chart */}
      {data.revenueVsFailedChart && (
        <RevenueVsFailedChart
          successful={data.revenueVsFailedChart.successful}
          failed={data.revenueVsFailedChart.failed}
          abandoned={data.revenueVsFailedChart.abandoned}
        />
      )}

      {/* Performance Trend */}
      {data.performanceTrend && (
        <PerformanceTrendChart data={data.performanceTrend} />
      )}

      {/* Campaign Spend */}
      {data.campaignSpend && data.campaignSpend.length > 0 && (
        <CampaignSpendChart campaigns={data.campaignSpend} />
      )}

      {/* Social Highlights */}
      {data.socialHighlights && (
        <div>
          <h2 className="font-serif text-xl font-semibold text-gray-900 flex items-center gap-2">
            <span>📱</span> Social Media Highlights
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
            <KPICardTinted tint="green" label="Instagram Followers" value={data.socialHighlights.instagramFollowers.value} badge={data.socialHighlights.instagramFollowers.badge} />
            <KPICardTinted tint="green" label="Facebook Fans" value={data.socialHighlights.facebookFans.value} badge={data.socialHighlights.facebookFans.badge} />
            <KPICardTinted tint="green" label="FB Organic Reach" value={data.socialHighlights.fbOrganicReach.value} badge={data.socialHighlights.fbOrganicReach.badge} />
            <KPICardTinted tint="green" label="FB Engagements" value={data.socialHighlights.fbEngagements.value} badge={data.socialHighlights.fbEngagements.badge} />
            <KPICardTinted tint="green" label="IG Monthly Reach" value={data.socialHighlights.igMonthlyReach.value} badge={data.socialHighlights.igMonthlyReach.badge} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <KPICardTinted tint="green" label="Engagement Rate" value={data.socialHighlights.engagementRate.value} badge={data.socialHighlights.engagementRate.badge} />
          </div>
        </div>
      )}
    </div>
  );
}
