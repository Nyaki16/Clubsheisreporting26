"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { KPICard } from "@/components/dashboard/KPICard";
import { CampaignSpendChart } from "@/components/dashboard/CampaignSpendChart";
import { LoadingSkeleton } from "@/components/dashboard/LoadingSkeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import type { MetaData } from "@/types/dashboard";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export function MetaContent({ slug }: { slug: string }) {
  const [data, setData] = useState<MetaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: client } = await supabase.from("clients").select("id").eq("slug", slug).single();
      if (!client) { setLoading(false); return; }
      const { data: period } = await supabase.from("reporting_periods").select("id").eq("is_current", true).single();
      if (!period) { setLoading(false); return; }
      const { data: section } = await supabase
        .from("dashboard_data").select("data")
        .eq("client_id", client.id).eq("period_id", period.id).eq("section", "meta").single();
      if (section?.data) setData(section.data as MetaData);
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) return <LoadingSkeleton />;
  if (!data) return <EmptyState message="No Meta Ads data available. This client may not have Meta Ads connected." />;

  const trendData = data.trend
    ? data.trend.labels.map((label, i) => ({
        name: label,
        spend: data.trend!.spend[i],
        impressions: data.trend!.impressions[i],
        clicks: data.trend!.clicks[i],
      }))
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-xl font-semibold text-gray-900">Meta Ads</h2>
        <p className="text-sm text-gray-500 mb-4">Campaign performance and spend breakdown from Meta (Facebook & Instagram) ads.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {data.kpis.map((kpi) => (
            <KPICard key={kpi.label} label={kpi.label} value={kpi.value} badge={kpi.change} direction={kpi.direction} />
          ))}
        </div>
      </div>

      {trendData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Ad Spend Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R ${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v) => `R ${Number(v).toLocaleString("en-ZA")}`} />
              <Legend />
              <Line type="monotone" dataKey="spend" stroke="#1F2937" name="Ad Spend" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.campaigns && data.campaigns.length > 0 && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Campaign Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase">Campaign</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Spend</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Impressions</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Clicks</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">CTR</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">CPC</th>
                    <th className="text-right py-2 pl-3 text-xs font-medium text-gray-500 uppercase">Reach</th>
                  </tr>
                </thead>
                <tbody>
                  {data.campaigns.map((c) => (
                    <tr key={c.name} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 pr-4 font-medium text-gray-900">{c.name}</td>
                      <td className="py-3 px-3 text-right text-gray-700">R {c.spend.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right text-gray-700">{c.impressions.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right text-gray-700">{c.clicks.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right text-gray-700">{c.ctr}</td>
                      <td className="py-3 px-3 text-right text-gray-700">{c.cpc}</td>
                      <td className="py-3 pl-3 text-right text-gray-700">{c.reach.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <CampaignSpendChart campaigns={data.campaigns.map((c) => ({ name: c.name, spend: c.spend }))} />
        </>
      )}
    </div>
  );
}
