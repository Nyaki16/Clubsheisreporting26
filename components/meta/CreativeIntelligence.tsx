"use client";

import { useEffect, useState, useCallback } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import type { IntelligenceResponse } from "@/lib/meta/types";
import type { DateRangeValue } from "./DateRangePicker";
import { WinnerCard } from "./WinnerCard";
import { LoserCard } from "./LoserCard";
import { PatternBlock } from "./PatternBlock";

interface Props {
  slug: string;
  hasMetaAds: boolean;
  range: DateRangeValue;
}

interface CachedResponse {
  cached: IntelligenceResponse | null;
  updatedAt?: string;
}

export function CreativeIntelligence({ slug, hasMetaAds, range }: Props) {
  const [data, setData] = useState<IntelligenceResponse | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCached = useCallback(async () => {
    if (!hasMetaAds) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/creatives/${slug}/intelligence`);
      const json = (await res.json()) as CachedResponse;
      if (!res.ok) throw new Error("Failed to load cached insights");
      setData(json.cached || null);
      setUpdatedAt(json.updatedAt || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [slug, hasMetaAds]);

  useEffect(() => {
    loadCached();
  }, [loadCached]);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/creatives/${slug}/intelligence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date_range: { start: range.start, end: range.end } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      setData(json as IntelligenceResponse);
      setUpdatedAt(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  if (!hasMetaAds) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">What&apos;s Working & Why</h3>
        <p className="text-sm text-gray-500">Meta Ads is not connected for this client.</p>
      </div>
    );
  }

  const fresh = data && data.dateRange.start === range.start && data.dateRange.end === range.end;
  const hasRevenue = data ? Object.values(data.adMetrics).some((a) => a.metrics.revenue !== null) : false;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-gray-700" />
          <h3 className="text-sm font-semibold text-gray-900">What&apos;s Working & Why</h3>
        </div>
        <div className="flex items-center gap-3">
          {updatedAt && (
            <span className="text-xs text-gray-500">
              Generated {new Date(updatedAt).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}
              {data && !fresh ? " · for a different date range" : ""}
            </span>
          )}
          <button
            onClick={generate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating…" : data ? "Regenerate" : "Generate insights"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-500">
          Loading cached insights…
        </div>
      )}

      {!loading && !data && !generating && !error && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-700 font-medium">No insights generated yet.</p>
          <p className="text-xs text-gray-500 mt-1">Click <span className="font-medium">Generate insights</span> to analyze the top and bottom performing ads in the selected date range.</p>
        </div>
      )}

      {generating && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-500">
          Analyzing creative across {range.start} → {range.end}. This usually takes 15–30 seconds.
        </div>
      )}

      {data && (
        <>
          {data.winners.length > 0 && (
            <section className="space-y-3">
              <div className="text-[10px] uppercase tracking-wide text-emerald-700 font-semibold">The winners</div>
              {data.winners.map((w) => {
                const ad = data.adMetrics[w.ad_id];
                if (!ad) return null;
                return <WinnerCard key={w.ad_id} insight={w} ad={ad} hasRevenue={hasRevenue} />;
              })}
            </section>
          )}

          {data.losers.length > 0 && (
            <section className="space-y-3">
              <div className="text-[10px] uppercase tracking-wide text-rose-700 font-semibold">The losers</div>
              {data.losers.map((l) => {
                const ad = data.adMetrics[l.ad_id];
                if (!ad) return null;
                return <LoserCard key={l.ad_id} insight={l} ad={ad} hasRevenue={hasRevenue} />;
              })}
            </section>
          )}

          <PatternBlock pattern={data.pattern} />
        </>
      )}
    </div>
  );
}
