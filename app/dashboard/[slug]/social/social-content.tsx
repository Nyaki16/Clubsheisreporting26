"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { KPICard } from "@/components/dashboard/KPICard";
import { LoadingSkeleton } from "@/components/dashboard/LoadingSkeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import type { SocialData } from "@/types/dashboard";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";

export function SocialContent({ slug }: { slug: string }) {
  const [data, setData] = useState<SocialData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: client } = await supabase.from("clients").select("id").eq("slug", slug).single();
      if (!client) { setLoading(false); return; }
      const { data: period } = await supabase.from("reporting_periods").select("id").eq("is_current", true).single();
      if (!period) { setLoading(false); return; }
      const { data: section } = await supabase
        .from("dashboard_data").select("data")
        .eq("client_id", client.id).eq("period_id", period.id).eq("section", "social").single();
      if (section?.data) setData(section.data as SocialData);
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) return <LoadingSkeleton />;
  if (!data) return <EmptyState message="No social media data available for this client." />;

  const trendData = data.trend
    ? data.trend.labels.map((label, i) => ({
        name: label,
        igReach: data.trend!.instagramReach[i],
        fbReach: data.trend!.facebookReach[i],
        followers: data.trend!.followers[i],
      }))
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-xl font-semibold text-gray-900">Social Media</h2>
        <p className="text-sm text-gray-500 mb-4">Performance across Instagram and Facebook organic channels.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {data.kpis.map((kpi) => (
            <KPICard key={kpi.label} label={kpi.label} value={kpi.value} badge={kpi.badge || kpi.change} direction={kpi.direction} />
          ))}
        </div>
      </div>

      {trendData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Instagram Reach Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => Number(v).toLocaleString()} />
                <Line type="monotone" dataKey="igReach" stroke="#8B3A62" name="IG Reach" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Facebook Reach Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => Number(v).toLocaleString()} />
                <Line type="monotone" dataKey="fbReach" stroke="#0D9488" name="FB Reach" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {trendData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Follower Growth</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={["dataMin - 100", "dataMax + 100"]} />
                <Tooltip formatter={(v) => Number(v).toLocaleString()} />
                <Line type="monotone" dataKey="followers" stroke="#4A1942" name="Instagram Followers" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Platform Comparison</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[
                { name: "Reach", ig: trendData[trendData.length - 1]?.igReach || 0, fb: trendData[trendData.length - 1]?.fbReach || 0 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => Number(v).toLocaleString()} />
                <Legend />
                <Bar dataKey="ig" fill="#8B3A62" name="Instagram" radius={[6, 6, 0, 0]} />
                <Bar dataKey="fb" fill="#0D9488" name="Facebook" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
