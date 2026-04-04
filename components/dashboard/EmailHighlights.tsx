"use client";

import { useDashboardData } from "@/lib/use-dashboard-data";
import { KPICardTinted } from "./KPICardTinted";

interface EmailData {
  kpis: {
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    deliveryRate: string;
    campaignCount: number;
  };
}

export function EmailHighlights({ slug }: { slug: string }) {
  const { data } = useDashboardData<EmailData>(slug, "email");

  if (!data?.kpis) return null;

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-gray-900 flex items-center gap-2">
        <span>📧</span> Email Marketing
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
        <KPICardTinted tint="green" label="Emails Sent" value={data.kpis.totalSent.toLocaleString()} badge={`${data.kpis.campaignCount} campaigns`} />
        <KPICardTinted tint="green" label="Delivered" value={data.kpis.totalDelivered.toLocaleString()} badge={data.kpis.deliveryRate} />
        <KPICardTinted tint="red" label="Failed" value={data.kpis.totalFailed.toLocaleString()} badge="↓ Bounced / invalid" />
      </div>
    </div>
  );
}
