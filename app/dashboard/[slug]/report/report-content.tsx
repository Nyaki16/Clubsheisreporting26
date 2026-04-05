"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Download, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ClientInfo { name: string; id: string }
interface PeriodInfo { label: string; id: string }
interface SectionInsight { headline?: string; insights?: string[]; recommendation?: string }
interface ReportInsights {
  overview?: SectionInsight;
  revenue?: SectionInsight;
  metaAds?: SectionInsight;
  social?: SectionInsight;
  email?: SectionInsight;
  churn?: SectionInsight;
  nextMonth?: { topPriority?: string; quickWins?: string[]; bigBets?: string[] };
  generatedAt?: string;
}

export function ReportContent({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const periodParam = searchParams.get("period");
  const reportRef = useRef<HTMLDivElement>(null);
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [period, setPeriod] = useState<PeriodInfo | null>(null);
  const [sections, setSections] = useState<Record<string, Record<string, unknown>>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportInsights, setReportInsights] = useState<ReportInsights | null>(null);

  const loadData = useCallback(async () => {
    const { data: c } = await supabase.from("clients").select("id, name").eq("slug", slug).single();
    if (!c) return;
    setClient(c);

    let pid = periodParam;
    if (!pid) {
      const { data: p } = await supabase.from("reporting_periods").select("id, label").eq("is_current", true).single();
      if (p) { pid = p.id; setPeriod(p); }
    } else {
      const { data: p } = await supabase.from("reporting_periods").select("id, label").eq("id", pid).single();
      if (p) setPeriod(p);
    }
    if (!pid) return;

    const { data: rows } = await supabase
      .from("dashboard_data")
      .select("section, data")
      .eq("client_id", c.id)
      .eq("period_id", pid);

    const s: Record<string, Record<string, unknown>> = {};
    for (const r of rows || []) s[r.section] = r.data as Record<string, unknown>;
    setSections(s);
    if (s.reportInsights) setReportInsights(s.reportInsights as unknown as ReportInsights);
    setLoading(false);
  }, [slug, periodParam]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleGenerateInsights() {
    if (!client || !period) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/report-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer 1234" },
        body: JSON.stringify({ clientId: client.id, periodId: period.id }),
      });
      const result = await res.json();
      if (result.success) setReportInsights(result.insights);
      else alert("Failed: " + result.error);
    } catch (e) { alert("Error: " + String(e)); }
    setGenerating(false);
  }

  function handlePrint() {
    window.print();
  }

  if (loading) return <div className="p-10 text-center text-gray-400">Loading report...</div>;

  const hasNotes = !!sections.notes;
  const overview = sections.overview || {};
  const kpis = (overview.kpis as Array<{ label: string; value: string; badge?: string }>) || [];
  const paystack = overview.paystack as { revenueFormatted?: string; revenueBadge?: string; failedFormatted?: string; abandonedFormatted?: string; activeMemberships?: number; membershipBreakdown?: string } | undefined;
  const socialH = overview.socialHighlights as Record<string, { value: string; badge?: string }> | undefined;
  const meta = sections.meta as { kpis?: Array<{ label: string; value: string; change?: string }>; campaigns?: Array<{ name: string; spend: number; impressions: number; clicks: number; ctr: string; cpc: string; reach: number }> } | undefined;
  const email = sections.email as { kpis?: { totalSent: number; totalDelivered: number; totalFailed: number; deliveryRate: string; campaignCount: number }; campaigns?: Array<{ name: string; subject: string; date: string; sent: number; delivered: number; failed: number; deliveryRate: string }> } | undefined;
  const insights = sections.insights as { wins?: Array<{ text: string }>; alerts?: Array<{ text: string }> } | undefined;
  const strategy = sections.strategy as { summary?: string; revenueOpportunities?: Array<{ title: string; insight: string; action: string; impact: string }>; adOptimization?: Array<{ title: string; insight: string; action: string; impact: string }>; growthPlays?: Array<{ title: string; insight: string; action: string; impact: string }> } | undefined;
  const notes = sections.notes as { summary?: string; agencyActions?: Array<{ description: string; owner: string; status: string }>; clientActions?: Array<{ description: string; owner: string; status: string }> } | undefined;
  const performanceTrend = overview.performanceTrend as { labels?: string[]; adSpend?: number[]; newContacts?: number[]; revenue?: number[] } | undefined;
  const socialTrend = (sections.social as { trend?: { labels?: string[]; instagramReach?: number[]; facebookReach?: number[] } } | undefined)?.trend;

  return (
    <>
      {/* Print Controls - hidden when printing */}
      <div className="print:hidden bg-white border-b border-gray-200 sticky top-0 z-50 px-6 py-3 flex items-center justify-between">
        <Link href={`/dashboard/${slug}`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateInsights}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium text-sm rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50"
          >
            <Sparkles size={16} className={generating ? "animate-spin" : ""} />
            {generating ? "Generating..." : reportInsights ? "Regenerate Insights" : "Generate Insights"}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-[#4A1942] text-white font-medium text-sm rounded-lg hover:bg-[#3a1335]"
          >
            <Download size={16} /> Export PDF
          </button>
        </div>
        <p className="text-[0.65rem] text-gray-400 mt-1">Tip: In the print dialog, enable &quot;Background graphics&quot; to keep the cover page colours.</p>
      </div>

      {/* Transcript suggestion */}
      {!hasNotes && (
        <div className="print:hidden max-w-[210mm] mx-auto mt-4 mb-2">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-4 flex items-start gap-3">
            <Sparkles size={20} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-900">Want richer insights?</p>
              <p className="text-xs text-amber-700 mt-1">
                Upload your strategy meeting transcript on the{" "}
                <Link href={`/dashboard/${slug}/notes`} className="underline font-medium hover:text-amber-900">Strategy Notes</Link>{" "}
                tab first. The AI will reference what was discussed, track action items, and connect your data to decisions made in meetings.
              </p>
            </div>
          </div>
        </div>
      )}

      {hasNotes && !reportInsights && (
        <div className="print:hidden max-w-[210mm] mx-auto mt-4 mb-2">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-5 py-4 flex items-start gap-3">
            <Sparkles size={20} className="text-emerald-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-900">Strategy notes detected</p>
              <p className="text-xs text-emerald-700 mt-1">
                Meeting notes are available for this period. Click <strong>Generate Insights</strong> to create a report that references your strategy discussions, action items, and data performance.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Report */}
      <div ref={reportRef} className="max-w-[210mm] mx-auto bg-white print:max-w-none">

        {/* Cover Page */}
        <div className="h-[297mm] flex flex-col justify-between p-16 print:p-12" style={{ background: "linear-gradient(135deg, #4A1942 0%, #8B3A62 50%, #C4956A 100%)" }}>
          <div>
            <p className="text-white/60 text-sm font-medium tracking-widest uppercase">Club She Is.</p>
          </div>
          <div>
            <p className="text-white/60 text-sm tracking-widest uppercase mb-4">Monthly Performance Report</p>
            <h1 className="text-white text-5xl font-serif font-bold mb-6">{client?.name}</h1>
            <div className="w-20 h-1 bg-white/40 mb-6"></div>
            <p className="text-white/80 text-xl">{period?.label}</p>
          </div>
          <div className="flex justify-between items-end">
            <p className="text-white/40 text-xs">Confidential — Prepared by Club She Is Agency</p>
            <p className="text-white/40 text-xs">Generated {new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </div>

        {/* Page 2: Executive Summary + KPIs */}
        <div className="p-16 print:p-12 print:break-before-page">
          <SectionHeader title="Monthly Snapshot" />

          {/* Overview Insight */}
          {reportInsights?.overview && (
            <InsightBlock headline={reportInsights.overview.headline} insights={reportInsights.overview.insights} />
          )}

          {/* KPI Grid */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {kpis.map((kpi, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <p className="text-[0.6rem] uppercase tracking-wider text-gray-400 font-medium">{kpi.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                {kpi.badge && <p className="text-xs text-emerald-600 mt-1">{kpi.badge}</p>}
              </div>
            ))}
          </div>

          {/* Performance Trend Chart */}
          {performanceTrend?.labels && performanceTrend.labels.length > 0 && (
            <div className="mb-10 border border-gray-200 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Performance Trend — All Channels</h3>
              <p className="text-xs text-gray-500 mb-4">Monthly revenue, ad spend, and contacts across all sources.</p>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={performanceTrend.labels.map((label, i) => ({
                  name: label,
                  revenue: performanceTrend.revenue?.[i] || 0,
                  adSpend: performanceTrend.adSpend?.[i] || 0,
                  contacts: performanceTrend.newContacts?.[i] || 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `R ${v >= 1000 ? (v / 1000).toFixed(0) + "K" : v}`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Tooltip formatter={(v: any, name: any) => String(name) === "Contacts" ? Number(v).toLocaleString() : `R ${Number(v).toLocaleString()}`} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#059669" name="Revenue (R)" strokeWidth={2} dot={{ r: 4 }} />
                  <Line yAxisId="left" type="monotone" dataKey="adSpend" stroke="#1F2937" name="Ad Spend (R)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="contacts" stroke="#D97706" name="Contacts" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Social Reach Trend */}
          {socialTrend?.labels && socialTrend.labels.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-gray-900 mb-3">Instagram Reach Trend</h3>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={socialTrend.labels.map((label, i) => ({ name: label, reach: socialTrend.instagramReach?.[i] || 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                    <YAxis tick={{ fontSize: 8 }} tickFormatter={(v: number) => v >= 1000 ? (v / 1000).toFixed(0) + "K" : String(v)} />
                    <Line type="monotone" dataKey="reach" stroke="#8B3A62" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-gray-900 mb-3">Facebook Reach Trend</h3>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={socialTrend.labels.map((label, i) => ({ name: label, reach: socialTrend.facebookReach?.[i] || 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                    <YAxis tick={{ fontSize: 8 }} tickFormatter={(v: number) => v >= 1000 ? (v / 1000).toFixed(0) + "K" : String(v)} />
                    <Line type="monotone" dataKey="reach" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Paystack Summary */}
          {paystack && (
            <>
              <SectionHeader title="Paystack Payments" />
              <div className="grid grid-cols-3 gap-4 mb-10">
                <StatBox label="Revenue" value={paystack.revenueFormatted || "—"} sub={paystack.revenueBadge} />
                {paystack.activeMemberships !== undefined && (
                  <StatBox label="Active Memberships" value={String(paystack.activeMemberships)} sub={paystack.membershipBreakdown} />
                )}
                <StatBox label="Failed" value={paystack.failedFormatted || "—"} sub="Recovery opportunity" negative />
                <StatBox label="Abandoned" value={paystack.abandonedFormatted || "—"} sub="Incomplete checkouts" negative />
              </div>
              {reportInsights?.revenue && (
                <InsightBlock headline={reportInsights.revenue.headline} insights={reportInsights.revenue.insights} recommendation={reportInsights.revenue.recommendation} />
              )}
              {reportInsights?.churn && (
                <InsightBlock headline={reportInsights.churn.headline} insights={reportInsights.churn.insights} recommendation={reportInsights.churn.recommendation} />
              )}
            </>
          )}

          {/* Social Highlights */}
          {socialH && (
            <>
              <SectionHeader title="Social Media Highlights" />
              <div className="grid grid-cols-3 gap-4 mb-10">
                <StatBox label="Instagram Followers" value={socialH.instagramFollowers?.value || "—"} />
                <StatBox label="Facebook Fans" value={socialH.facebookFans?.value || "—"} />
                <StatBox label="FB Organic Reach" value={socialH.fbOrganicReach?.value || "—"} />
                <StatBox label="FB Engagements" value={socialH.fbEngagements?.value || "—"} />
                <StatBox label="IG Monthly Reach" value={socialH.igMonthlyReach?.value || "—"} />
                <StatBox label="Engagement Rate" value={socialH.engagementRate?.value || "—"} />
              </div>
              {reportInsights?.social && (
                <InsightBlock headline={reportInsights.social.headline} insights={reportInsights.social.insights} recommendation={reportInsights.social.recommendation} />
              )}
            </>
          )}
        </div>

        {/* Page 3: Meta Ads */}
        {meta?.kpis && (
          <div className="p-16 print:p-12 print:break-before-page">
            <SectionHeader title="Meta Ads Performance" />
            <div className="grid grid-cols-3 gap-4 mb-8">
              {meta.kpis.map((kpi, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4">
                  <p className="text-[0.6rem] uppercase tracking-wider text-gray-400 font-medium">{kpi.label}</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                  {kpi.change && <p className="text-xs text-gray-500 mt-1">{kpi.change}</p>}
                </div>
              ))}
            </div>

            {meta.campaigns && meta.campaigns.length > 0 && (
              <>
                {reportInsights?.metaAds && (
                  <InsightBlock headline={reportInsights.metaAds.headline} insights={reportInsights.metaAds.insights} recommendation={reportInsights.metaAds.recommendation} />
                )}
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Campaign Breakdown</h3>
                <table className="w-full text-xs border-collapse mb-10">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-2 font-medium text-gray-500">Campaign</th>
                      <th className="text-right py-2 font-medium text-gray-500">Spend</th>
                      <th className="text-right py-2 font-medium text-gray-500">Impressions</th>
                      <th className="text-right py-2 font-medium text-gray-500">Clicks</th>
                      <th className="text-right py-2 font-medium text-gray-500">CTR</th>
                      <th className="text-right py-2 font-medium text-gray-500">CPC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meta.campaigns.map((c, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 text-gray-900">{c.name}</td>
                        <td className="py-2 text-right">R{c.spend.toLocaleString()}</td>
                        <td className="py-2 text-right">{c.impressions.toLocaleString()}</td>
                        <td className="py-2 text-right">{c.clicks.toLocaleString()}</td>
                        <td className="py-2 text-right">{c.ctr}</td>
                        <td className="py-2 text-right">{c.cpc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* Email Marketing */}
            {email?.kpis && (
              <>
                <SectionHeader title="Email Marketing" />
                {reportInsights?.email && (
                  <InsightBlock headline={reportInsights.email.headline} insights={reportInsights.email.insights} recommendation={reportInsights.email.recommendation} />
                )}
                <div className="grid grid-cols-4 gap-4 mb-8">
                  <StatBox label="Emails Sent" value={email.kpis.totalSent.toLocaleString()} sub={`${email.kpis.campaignCount} campaigns`} />
                  <StatBox label="Delivered" value={email.kpis.totalDelivered.toLocaleString()} />
                  <StatBox label="Failed" value={email.kpis.totalFailed.toLocaleString()} negative />
                  <StatBox label="Delivery Rate" value={email.kpis.deliveryRate} />
                </div>

                {email.campaigns && email.campaigns.length > 0 && (
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="text-left py-2 font-medium text-gray-500">Date</th>
                        <th className="text-left py-2 font-medium text-gray-500">Campaign</th>
                        <th className="text-right py-2 font-medium text-gray-500">Sent</th>
                        <th className="text-right py-2 font-medium text-gray-500">Delivered</th>
                        <th className="text-right py-2 font-medium text-gray-500">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {email.campaigns.slice(0, 10).map((c, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-1.5 text-gray-600">{c.date}</td>
                          <td className="py-1.5 text-gray-900">{c.name}</td>
                          <td className="py-1.5 text-right">{c.sent.toLocaleString()}</td>
                          <td className="py-1.5 text-right">{c.delivered.toLocaleString()}</td>
                          <td className="py-1.5 text-right">{c.deliveryRate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        )}

        {/* Page 4: Insights & Strategy */}
        <div className="p-16 print:p-12 print:break-before-page">
          {/* Wins & Alerts */}
          {insights && (
            <>
              <SectionHeader title="Wins & Insights" />
              {insights.wins && insights.wins.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">Wins</h3>
                  {insights.wins.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 mb-2">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      <p className="text-sm text-gray-700">{w.text}</p>
                    </div>
                  ))}
                </div>
              )}
              {insights.alerts && insights.alerts.length > 0 && (
                <div className="mb-10">
                  <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-2">Alerts</h3>
                  {insights.alerts.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 mb-2">
                      <span className="text-red-500 mt-0.5">!</span>
                      <p className="text-sm text-gray-700">{a.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* AI Strategy */}
          {strategy?.summary && (
            <>
              <SectionHeader title="Strategic Recommendations" />
              <div className="bg-gray-50 rounded-lg p-5 mb-6">
                <p className="text-sm text-gray-700 leading-relaxed">{strategy.summary}</p>
              </div>
              {strategy.revenueOpportunities && strategy.revenueOpportunities.length > 0 && (
                <StrategyList title="Revenue Opportunities" items={strategy.revenueOpportunities} />
              )}
              {strategy.adOptimization && strategy.adOptimization.length > 0 && (
                <StrategyList title="Ad Optimization" items={strategy.adOptimization} />
              )}
              {strategy.growthPlays && strategy.growthPlays.length > 0 && (
                <StrategyList title="Growth Plays" items={strategy.growthPlays} />
              )}
            </>
          )}

          {/* Action Items */}
          {/* Next Month Priorities */}
          {reportInsights?.nextMonth && (
            <>
              <SectionHeader title="Next Month Priorities" />
              <div className="bg-[#4A1942] rounded-lg p-5 mb-6 text-white">
                <p className="text-xs uppercase tracking-wider text-white/60 mb-1">Top Priority</p>
                <p className="text-sm font-medium">{reportInsights.nextMonth.topPriority}</p>
              </div>
              {reportInsights.nextMonth.quickWins && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">Quick Wins</h3>
                  {reportInsights.nextMonth.quickWins.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 mb-2">
                      <span className="text-emerald-500 mt-0.5">→</span>
                      <p className="text-sm text-gray-700">{w}</p>
                    </div>
                  ))}
                </div>
              )}
              {reportInsights.nextMonth.bigBets && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-[#4A1942] uppercase tracking-wider mb-2">Big Bets</h3>
                  {reportInsights.nextMonth.bigBets.map((b, i) => (
                    <div key={i} className="flex items-start gap-2 mb-2">
                      <span className="text-[#4A1942] mt-0.5">★</span>
                      <p className="text-sm text-gray-700">{b}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {notes && (notes.agencyActions?.length || notes.clientActions?.length) ? (
            <>
              <SectionHeader title="Action Items" />
              {notes.agencyActions && notes.agencyActions.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-[#4A1942] uppercase tracking-wider mb-2">Agency Tasks</h3>
                  {notes.agencyActions.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 mb-2 text-sm">
                      <span className={a.status === "done" ? "text-emerald-500" : "text-gray-400"}>{a.status === "done" ? "☑" : "☐"}</span>
                      <span className={`flex-1 ${a.status === "done" ? "line-through text-gray-400" : "text-gray-700"}`}>{a.description}</span>
                      <span className="text-xs text-gray-400">{a.owner}</span>
                    </div>
                  ))}
                </div>
              )}
              {notes.clientActions && notes.clientActions.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">Client Tasks</h3>
                  {notes.clientActions.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 mb-2 text-sm">
                      <span className={a.status === "done" ? "text-emerald-500" : "text-gray-400"}>{a.status === "done" ? "☑" : "☐"}</span>
                      <span className={`flex-1 ${a.status === "done" ? "line-through text-gray-400" : "text-gray-700"}`}>{a.description}</span>
                      <span className="text-xs text-gray-400">{a.owner}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Back Cover */}
        <div className="h-[297mm] flex flex-col justify-center items-center print:break-before-page" style={{ background: "linear-gradient(135deg, #4A1942 0%, #8B3A62 50%, #C4956A 100%)" }}>
          <p className="text-white font-serif text-3xl font-bold mb-2">Club She Is.</p>
          <p className="text-white/60 text-sm tracking-wider">Monthly Performance Report</p>
          <div className="w-16 h-0.5 bg-white/30 my-6"></div>
          <p className="text-white/40 text-xs">www.clubsheis.com</p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print\\:hidden { display: none !important; }
          .print\\:break-before-page { break-before: page; }
          .print\\:p-12 { padding: 3rem !important; }
          .print\\:max-w-none { max-width: none !important; }
          @page { size: A4; margin: 0; }
          .grid { break-inside: avoid; }
          table { break-inside: avoid; }
          .rounded-lg, .rounded-xl { break-inside: avoid; }
          h2, h3 { break-after: avoid; }
          .mb-6, .mb-10 { break-inside: avoid; }
        }
      `}</style>
    </>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-serif font-semibold text-gray-900">{title}</h2>
      <div className="w-12 h-0.5 bg-[#4A1942] mt-1"></div>
    </div>
  );
}

function StatBox({ label, value, sub, negative }: { label: string; value: string; sub?: string; negative?: boolean }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <p className="text-[0.6rem] uppercase tracking-wider text-gray-400 font-medium">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className={`text-xs mt-1 ${negative ? "text-red-500" : "text-emerald-600"}`}>{sub}</p>}
    </div>
  );
}

function InsightBlock({ headline, insights, recommendation }: { headline?: string; insights?: string[]; recommendation?: string }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
      {headline && <p className="text-sm font-semibold text-amber-900 mb-2">{headline}</p>}
      {insights && insights.map((insight, i) => (
        <div key={i} className="flex items-start gap-2 mb-1">
          <span className="text-amber-500 text-xs mt-0.5">●</span>
          <p className="text-xs text-amber-900">{insight}</p>
        </div>
      ))}
      {recommendation && (
        <p className="text-xs font-medium text-amber-800 mt-2 pt-2 border-t border-amber-200">→ {recommendation}</p>
      )}
    </div>
  );
}

function StrategyList({ title, items }: { title: string; items: Array<{ title: string; insight: string; action: string; impact: string }> }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">{title}</h3>
      {items.map((item, i) => (
        <div key={i} className="mb-3 pl-4 border-l-2 border-gray-200">
          <p className="text-sm font-semibold text-gray-900">{item.title} <span className="text-[0.6rem] uppercase font-bold text-gray-400 ml-1">{item.impact}</span></p>
          <p className="text-xs text-gray-600 mt-0.5">{item.insight}</p>
          <p className="text-xs text-[#4A1942] font-medium mt-0.5">→ {item.action}</p>
        </div>
      ))}
    </div>
  );
}
