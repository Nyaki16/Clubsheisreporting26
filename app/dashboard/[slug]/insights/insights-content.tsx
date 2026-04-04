"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDashboardData } from "@/lib/use-dashboard-data";
import { supabase } from "@/lib/supabase";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { StrategySection } from "@/components/dashboard/StrategySection";
import { LoadingSkeleton } from "@/components/dashboard/LoadingSkeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Sparkles } from "lucide-react";
import type { InsightsData } from "@/types/dashboard";

interface StrategyItem {
  title: string;
  insight: string;
  action: string;
  impact: "high" | "medium" | "low";
}

interface StrategyData {
  summary: string;
  revenueOpportunities: StrategyItem[];
  adOptimization: StrategyItem[];
  growthPlays: StrategyItem[];
  churnPrevention: StrategyItem[];
  generatedAt?: string;
}

export function InsightsContent({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const { data, loading } = useDashboardData<InsightsData>(slug, "insights");
  const { data: strategyData, loading: strategyLoading } = useDashboardData<StrategyData>(slug, "strategy");
  const [generating, setGenerating] = useState(false);
  const [strategy, setStrategy] = useState<StrategyData | null>(null);

  const displayStrategy = strategy || strategyData;

  async function generateStrategy() {
    setGenerating(true);
    try {
      // Get client ID and period ID
      const { data: client } = await supabase
        .from("clients").select("id").eq("slug", slug).single();
      if (!client) throw new Error("Client not found");

      const periodParam = searchParams.get("period");
      let periodId = periodParam;
      if (!periodId) {
        const { data: period } = await supabase
          .from("reporting_periods").select("id").eq("is_current", true).single();
        periodId = period?.id || null;
      }
      if (!periodId) throw new Error("No period found");

      const res = await fetch("/api/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer 1234" },
        body: JSON.stringify({ clientId: client.id, periodId }),
      });

      const result = await res.json();
      if (result.success) {
        setStrategy(result.strategy);
      } else {
        console.error("Strategy error:", result.error);
        alert("Failed to generate strategy. Please try again.");
      }
    } catch (e) {
      console.error("Strategy generation error:", e);
      alert("Failed to generate strategy.");
    }
    setGenerating(false);
  }

  if (loading || strategyLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState message="No insights available yet. Data will be generated after the next sync." />;

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

      {/* AI Strategic Recommendations */}
      <div className="border-t border-gray-200 pt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-serif text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles size={20} className="text-amber-500" />
              AI Strategic Recommendations
            </h2>
            <p className="text-sm text-gray-500">
              {displayStrategy
                ? `Generated ${displayStrategy.generatedAt ? new Date(displayStrategy.generatedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "previously"}`
                : "Get data-driven strategy recommendations powered by AI."}
            </p>
          </div>
          <button
            onClick={generateStrategy}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium text-sm rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 shadow-sm"
          >
            <Sparkles size={16} className={generating ? "animate-spin" : ""} />
            {generating ? "Analyzing..." : displayStrategy ? "Regenerate" : "Generate Strategy"}
          </button>
        </div>

        {generating && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <Sparkles size={24} className="mx-auto text-amber-500 animate-pulse mb-2" />
            <p className="text-sm font-medium text-amber-900">Analyzing your data and generating strategic recommendations...</p>
            <p className="text-xs text-amber-600 mt-1">This may take 15-30 seconds</p>
          </div>
        )}

        {displayStrategy && !generating && (
          <div className="space-y-6">
            {/* Executive Summary */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-2">Executive Summary</h3>
              <p className="text-sm leading-relaxed">{displayStrategy.summary}</p>
            </div>

            {displayStrategy.revenueOpportunities?.length > 0 && (
              <StrategySection
                title="Revenue Opportunities"
                emoji="💰"
                items={displayStrategy.revenueOpportunities}
                color="emerald"
              />
            )}

            {displayStrategy.adOptimization?.length > 0 && (
              <StrategySection
                title="Ad Optimization"
                emoji="📊"
                items={displayStrategy.adOptimization}
                color="blue"
              />
            )}

            {displayStrategy.growthPlays?.length > 0 && (
              <StrategySection
                title="Growth Plays"
                emoji="🚀"
                items={displayStrategy.growthPlays}
                color="purple"
              />
            )}

            {displayStrategy.churnPrevention?.length > 0 && (
              <StrategySection
                title="Churn Prevention"
                emoji="🛡️"
                items={displayStrategy.churnPrevention}
                color="red"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
