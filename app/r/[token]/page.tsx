import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface SectionInsight {
  headline?: string;
  insights?: string[];
  recommendation?: string;
}
interface ReportInsights {
  overview?: SectionInsight;
  revenue?: SectionInsight;
  metaAds?: SectionInsight;
  social?: SectionInsight;
  email?: SectionInsight;
  churn?: SectionInsight;
  nextMonth?: { topPriority?: string; quickWins?: string[]; bigBets?: string[] };
}

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Find the export record by scanning report_export sections
  const { data: exports } = await supabase
    .from("dashboard_data")
    .select("client_id, period_id, data")
    .eq("section", "report_export");

  const exportRecord = exports?.find(
    (e) => (e.data as Record<string, unknown>)?.token === token
  );

  if (!exportRecord) notFound();

  const { client_id, period_id } = exportRecord;

  // Fetch client and period info
  const [{ data: client }, { data: period }, { data: rows }] = await Promise.all([
    supabase.from("clients").select("name").eq("id", client_id).single(),
    supabase.from("reporting_periods").select("label").eq("id", period_id).single(),
    supabase.from("dashboard_data").select("section, data").eq("client_id", client_id).eq("period_id", period_id),
  ]);

  if (!client || !period) notFound();

  const sections: Record<string, Record<string, unknown>> = {};
  for (const r of rows || []) sections[r.section] = r.data as Record<string, unknown>;

  const clientName = client.name;
  const periodLabel = period.label;
  const generatedDate = new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });

  // Extract data
  const overview = sections.overview || {};
  const kpis = (overview.kpis as Array<{ label: string; value: string; badge?: string }>) || [];
  const paystack = overview.paystack as {
    revenueFormatted?: string; revenueBadge?: string; failedFormatted?: string;
    abandonedFormatted?: string; activeMemberships?: number; membershipBreakdown?: string;
  } | undefined;
  const socialH = overview.socialHighlights as Record<string, { value: string; badge?: string }> | undefined;
  const meta = sections.meta as {
    kpis?: Array<{ label: string; value: string; change?: string }>;
    campaigns?: Array<{ name: string; spend: number; impressions: number; clicks: number; ctr: string; cpc: string }>;
  } | undefined;
  const email = sections.email as {
    kpis?: { totalSent: number; totalDelivered: number; totalFailed: number; deliveryRate: string; campaignCount: number };
    campaigns?: Array<{ name: string; subject: string; date: string; sent: number; delivered: number; failed: number; deliveryRate: string }>;
  } | undefined;
  const insights = sections.insights as { wins?: Array<{ text: string }>; alerts?: Array<{ text: string }> } | undefined;
  const strategy = sections.strategy as {
    summary?: string;
    revenueOpportunities?: Array<{ title: string; insight: string; action: string; impact: string }>;
    adOptimization?: Array<{ title: string; insight: string; action: string; impact: string }>;
    growthPlays?: Array<{ title: string; insight: string; action: string; impact: string }>;
  } | undefined;
  const notes = sections.notes as {
    summary?: string;
    agencyActions?: Array<{ description: string; owner: string; status: string }>;
    clientActions?: Array<{ description: string; owner: string; status: string }>;
  } | undefined;
  const reportInsights = sections.reportInsights as unknown as ReportInsights | undefined;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{clientName} — {periodLabel} Performance Report</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; color: #1f2937; background: #FAF7F2; }
          .serif { font-family: 'Playfair Display', serif; }

          /* Cover */
          .cover {
            min-height: 100vh; display: flex; flex-direction: column; justify-content: space-between; padding: 4rem;
            background: linear-gradient(135deg, #4A1942 0%, #8B3A62 50%, #C4956A 100%);
          }
          .cover-label { color: rgba(255,255,255,0.6); font-size: 0.875rem; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; }
          .cover-subtitle { color: rgba(255,255,255,0.6); font-size: 0.875rem; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 1rem; }
          .cover-title { color: #fff; font-size: 3rem; font-weight: 700; margin-bottom: 1.5rem; }
          .cover-divider { width: 5rem; height: 4px; background: rgba(255,255,255,0.4); margin-bottom: 1.5rem; }
          .cover-period { color: rgba(255,255,255,0.8); font-size: 1.25rem; }
          .cover-footer { display: flex; justify-content: space-between; color: rgba(255,255,255,0.4); font-size: 0.75rem; }

          /* Content */
          .content { max-width: 800px; margin: 0 auto; padding: 3rem 2rem; }
          .section-header { margin-bottom: 1.5rem; }
          .section-header h2 { font-size: 1.125rem; font-weight: 600; color: #1f2937; }
          .section-header .bar { width: 3rem; height: 3px; background: #4A1942; margin-top: 0.25rem; }
          .section-divider { border: none; border-top: 1px solid #e5e7eb; margin: 2.5rem 0; }

          /* KPI Grid */
          .grid { display: grid; gap: 1rem; margin-bottom: 2rem; }
          .grid-3 { grid-template-columns: repeat(3, 1fr); }
          .grid-4 { grid-template-columns: repeat(4, 1fr); }
          @media (max-width: 640px) { .grid-3, .grid-4 { grid-template-columns: 1fr 1fr; } }
          .stat-box { border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem; background: #fff; }
          .stat-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; font-weight: 500; }
          .stat-value { font-size: 1.25rem; font-weight: 700; color: #1f2937; margin-top: 0.25rem; }
          .stat-sub { font-size: 0.75rem; margin-top: 0.25rem; color: #059669; }
          .stat-sub.negative { color: #ef4444; }

          /* Insight Block */
          .insight-block { background: #fffbeb; border: 1px solid #fde68a; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1.5rem; }
          .insight-headline { font-size: 0.875rem; font-weight: 600; color: #78350f; margin-bottom: 0.5rem; }
          .insight-item { display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.25rem; }
          .insight-dot { color: #f59e0b; font-size: 0.75rem; margin-top: 2px; flex-shrink: 0; }
          .insight-text { font-size: 0.75rem; color: #78350f; }
          .insight-rec { font-size: 0.75rem; font-weight: 500; color: #92400e; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #fde68a; }

          /* Table */
          table { width: 100%; border-collapse: collapse; font-size: 0.75rem; margin-bottom: 2rem; }
          th { text-align: left; padding: 0.5rem 0; font-weight: 500; color: #6b7280; border-bottom: 1px solid #d1d5db; }
          th.right { text-align: right; }
          td { padding: 0.375rem 0; color: #1f2937; border-bottom: 1px solid #f3f4f6; }
          td.right { text-align: right; }

          /* Strategy */
          .strategy-item { margin-bottom: 0.75rem; padding-left: 1rem; border-left: 2px solid #e5e7eb; }
          .strategy-title { font-size: 0.875rem; font-weight: 600; color: #1f2937; }
          .strategy-impact { font-size: 0.6rem; text-transform: uppercase; font-weight: 700; color: #9ca3af; margin-left: 0.25rem; }
          .strategy-insight { font-size: 0.75rem; color: #6b7280; margin-top: 0.125rem; }
          .strategy-action { font-size: 0.75rem; color: #4A1942; font-weight: 500; margin-top: 0.125rem; }

          /* Priority */
          .priority-box { background: #4A1942; border-radius: 0.5rem; padding: 1.25rem; margin-bottom: 1.5rem; color: #fff; }
          .priority-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.6); margin-bottom: 0.25rem; }
          .priority-text { font-size: 0.875rem; font-weight: 500; }
          .action-row { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.5rem; font-size: 0.875rem; }
          .action-check { color: #9ca3af; margin-top: 2px; }
          .action-check.done { color: #059669; }
          .action-desc.done { text-decoration: line-through; color: #9ca3af; }
          .action-owner { font-size: 0.75rem; color: #9ca3af; margin-left: auto; white-space: nowrap; }

          /* Back cover */
          .back-cover {
            min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center;
            background: linear-gradient(135deg, #4A1942 0%, #8B3A62 50%, #C4956A 100%);
            margin-top: 3rem;
          }
          .back-title { color: #fff; font-size: 1.875rem; font-weight: 700; margin-bottom: 0.5rem; }
          .back-subtitle { color: rgba(255,255,255,0.6); font-size: 0.875rem; letter-spacing: 0.15em; }
          .back-divider { width: 4rem; height: 2px; background: rgba(255,255,255,0.3); margin: 1.5rem 0; }
          .back-url { color: rgba(255,255,255,0.4); font-size: 0.75rem; }

          .summary-box { background: #f9fafb; border-radius: 0.5rem; padding: 1.25rem; margin-bottom: 1.5rem; }
          .summary-text { font-size: 0.875rem; color: #4b5563; line-height: 1.6; }
          .win-row, .alert-row { display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem; }
          .win-icon { color: #059669; margin-top: 2px; }
          .alert-icon { color: #ef4444; margin-top: 2px; }
          .subsection-title { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem; }
          .subsection-title.wins { color: #047857; }
          .subsection-title.alerts { color: #b91c1c; }
          .subsection-title.agency { color: #4A1942; }
          .subsection-title.client { color: #047857; }
          .subsection-title.quick { color: #047857; }
          .subsection-title.big { color: #4A1942; }

          @media print {
            body { background: #fff; }
            .cover { min-height: auto; page-break-after: always; }
            .content { padding: 2rem; }
            .back-cover { page-break-before: always; min-height: auto; padding: 4rem 0; }
            .stat-box, .insight-block, .strategy-item, table { page-break-inside: avoid; }
          }
        `}} />
      </head>
      <body>
        {/* Cover */}
        <div className="cover">
          <div><p className="cover-label">Club She Is.</p></div>
          <div>
            <p className="cover-subtitle">Monthly Performance Report</p>
            <h1 className="cover-title serif">{clientName}</h1>
            <div className="cover-divider" />
            <p className="cover-period">{periodLabel}</p>
          </div>
          <div className="cover-footer">
            <span>Confidential — Prepared by Club She Is Agency</span>
            <span>Generated {generatedDate}</span>
          </div>
        </div>

        {/* Report Content */}
        <div className="content">

          {/* Executive Summary */}
          <div className="section-header"><h2 className="serif">Monthly Snapshot</h2><div className="bar" /></div>

          {reportInsights?.overview && (
            <InsightBlock headline={reportInsights.overview.headline} insights={reportInsights.overview.insights} />
          )}

          {kpis.length > 0 && (
            <div className="grid grid-3">
              {kpis.map((kpi, i) => (
                <div key={i} className="stat-box">
                  <p className="stat-label">{kpi.label}</p>
                  <p className="stat-value">{kpi.value}</p>
                  {kpi.badge && <p className="stat-sub">{kpi.badge}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Paystack */}
          {paystack && (
            <>
              <hr className="section-divider" />
              <div className="section-header"><h2 className="serif">Paystack Payments</h2><div className="bar" /></div>
              <div className="grid grid-3">
                <div className="stat-box">
                  <p className="stat-label">Revenue</p>
                  <p className="stat-value">{paystack.revenueFormatted || "—"}</p>
                  {paystack.revenueBadge && <p className="stat-sub">{paystack.revenueBadge}</p>}
                </div>
                {paystack.activeMemberships !== undefined && (
                  <div className="stat-box">
                    <p className="stat-label">Active Memberships</p>
                    <p className="stat-value">{String(paystack.activeMemberships)}</p>
                    {paystack.membershipBreakdown && <p className="stat-sub">{paystack.membershipBreakdown}</p>}
                  </div>
                )}
                <div className="stat-box">
                  <p className="stat-label">Failed</p>
                  <p className="stat-value">{paystack.failedFormatted || "—"}</p>
                  <p className="stat-sub negative">Recovery opportunity</p>
                </div>
                <div className="stat-box">
                  <p className="stat-label">Abandoned</p>
                  <p className="stat-value">{paystack.abandonedFormatted || "—"}</p>
                  <p className="stat-sub negative">Incomplete checkouts</p>
                </div>
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
              <hr className="section-divider" />
              <div className="section-header"><h2 className="serif">Social Media Highlights</h2><div className="bar" /></div>
              <div className="grid grid-3">
                {[
                  { key: "instagramFollowers", label: "Instagram Followers" },
                  { key: "facebookFans", label: "Facebook Fans" },
                  { key: "fbOrganicReach", label: "FB Organic Reach" },
                  { key: "fbEngagements", label: "FB Engagements" },
                  { key: "igMonthlyReach", label: "IG Monthly Reach" },
                  { key: "engagementRate", label: "Engagement Rate" },
                ].map(({ key, label }) => (
                  <div key={key} className="stat-box">
                    <p className="stat-label">{label}</p>
                    <p className="stat-value">{socialH[key]?.value || "—"}</p>
                  </div>
                ))}
              </div>
              {reportInsights?.social && (
                <InsightBlock headline={reportInsights.social.headline} insights={reportInsights.social.insights} recommendation={reportInsights.social.recommendation} />
              )}
            </>
          )}

          {/* Meta Ads */}
          {meta?.kpis && (
            <>
              <hr className="section-divider" />
              <div className="section-header"><h2 className="serif">Meta Ads Performance</h2><div className="bar" /></div>
              <div className="grid grid-3">
                {meta.kpis.map((kpi, i) => (
                  <div key={i} className="stat-box">
                    <p className="stat-label">{kpi.label}</p>
                    <p className="stat-value">{kpi.value}</p>
                    {kpi.change && <p className="stat-sub">{kpi.change}</p>}
                  </div>
                ))}
              </div>
              {reportInsights?.metaAds && (
                <InsightBlock headline={reportInsights.metaAds.headline} insights={reportInsights.metaAds.insights} recommendation={reportInsights.metaAds.recommendation} />
              )}
              {meta.campaigns && meta.campaigns.length > 0 && (
                <table>
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th className="right">Spend</th>
                      <th className="right">Impressions</th>
                      <th className="right">Clicks</th>
                      <th className="right">CTR</th>
                      <th className="right">CPC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meta.campaigns.map((c, i) => (
                      <tr key={i}>
                        <td>{c.name}</td>
                        <td className="right">R{(c.spend ?? 0).toLocaleString()}</td>
                        <td className="right">{(c.impressions ?? 0).toLocaleString()}</td>
                        <td className="right">{(c.clicks ?? 0).toLocaleString()}</td>
                        <td className="right">{c.ctr ?? "—"}</td>
                        <td className="right">{c.cpc ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {/* Email */}
          {email?.kpis && (
            <>
              <hr className="section-divider" />
              <div className="section-header"><h2 className="serif">Email Marketing</h2><div className="bar" /></div>
              {reportInsights?.email && (
                <InsightBlock headline={reportInsights.email.headline} insights={reportInsights.email.insights} recommendation={reportInsights.email.recommendation} />
              )}
              <div className="grid grid-4">
                <div className="stat-box">
                  <p className="stat-label">Emails Sent</p>
                  <p className="stat-value">{(email.kpis.totalSent ?? 0).toLocaleString()}</p>
                  <p className="stat-sub">{email.kpis.campaignCount ?? 0} campaigns</p>
                </div>
                <div className="stat-box">
                  <p className="stat-label">Delivered</p>
                  <p className="stat-value">{(email.kpis.totalDelivered ?? 0).toLocaleString()}</p>
                </div>
                <div className="stat-box">
                  <p className="stat-label">Failed</p>
                  <p className="stat-value">{(email.kpis.totalFailed ?? 0).toLocaleString()}</p>
                </div>
                <div className="stat-box">
                  <p className="stat-label">Delivery Rate</p>
                  <p className="stat-value">{email.kpis.deliveryRate}</p>
                </div>
              </div>
              {email.campaigns && email.campaigns.length > 0 && (
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Campaign</th>
                      <th className="right">Sent</th>
                      <th className="right">Delivered</th>
                      <th className="right">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {email.campaigns.slice(0, 10).map((c, i) => (
                      <tr key={i}>
                        <td>{c.date}</td>
                        <td>{c.name}</td>
                        <td className="right">{(c.sent ?? 0).toLocaleString()}</td>
                        <td className="right">{(c.delivered ?? 0).toLocaleString()}</td>
                        <td className="right">{c.deliveryRate ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {/* Wins & Alerts */}
          {insights && (
            <>
              <hr className="section-divider" />
              <div className="section-header"><h2 className="serif">Wins & Insights</h2><div className="bar" /></div>
              {insights.wins && insights.wins.length > 0 && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <p className="subsection-title wins">Wins</p>
                  {insights.wins.map((w, i) => (
                    <div key={i} className="win-row">
                      <span className="win-icon">&#10003;</span>
                      <p style={{ fontSize: "0.875rem", color: "#4b5563" }}>{w.text}</p>
                    </div>
                  ))}
                </div>
              )}
              {insights.alerts && insights.alerts.length > 0 && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <p className="subsection-title alerts">Alerts</p>
                  {insights.alerts.map((a, i) => (
                    <div key={i} className="alert-row">
                      <span className="alert-icon">!</span>
                      <p style={{ fontSize: "0.875rem", color: "#4b5563" }}>{a.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Strategy */}
          {strategy?.summary && (
            <>
              <hr className="section-divider" />
              <div className="section-header"><h2 className="serif">Strategic Recommendations</h2><div className="bar" /></div>
              <div className="summary-box"><p className="summary-text">{strategy.summary}</p></div>
              {strategy.revenueOpportunities && strategy.revenueOpportunities.length > 0 && (
                <StrategySection title="Revenue Opportunities" items={strategy.revenueOpportunities} />
              )}
              {strategy.adOptimization && strategy.adOptimization.length > 0 && (
                <StrategySection title="Ad Optimization" items={strategy.adOptimization} />
              )}
              {strategy.growthPlays && strategy.growthPlays.length > 0 && (
                <StrategySection title="Growth Plays" items={strategy.growthPlays} />
              )}
            </>
          )}

          {/* Next Month Priorities */}
          {reportInsights?.nextMonth && (
            <>
              <hr className="section-divider" />
              <div className="section-header"><h2 className="serif">Next Month Priorities</h2><div className="bar" /></div>
              <div className="priority-box">
                <p className="priority-label">Top Priority</p>
                <p className="priority-text">{reportInsights.nextMonth.topPriority}</p>
              </div>
              {reportInsights.nextMonth.quickWins && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <p className="subsection-title quick">Quick Wins</p>
                  {reportInsights.nextMonth.quickWins.map((w, i) => (
                    <div key={i} className="win-row">
                      <span style={{ color: "#059669" }}>&rarr;</span>
                      <p style={{ fontSize: "0.875rem", color: "#4b5563" }}>{w}</p>
                    </div>
                  ))}
                </div>
              )}
              {reportInsights.nextMonth.bigBets && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <p className="subsection-title big">Big Bets</p>
                  {reportInsights.nextMonth.bigBets.map((b, i) => (
                    <div key={i} className="win-row">
                      <span style={{ color: "#4A1942" }}>&starf;</span>
                      <p style={{ fontSize: "0.875rem", color: "#4b5563" }}>{b}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Action Items */}
          {notes && (notes.agencyActions?.length || notes.clientActions?.length) ? (
            <>
              <hr className="section-divider" />
              <div className="section-header"><h2 className="serif">Action Items</h2><div className="bar" /></div>
              {notes.agencyActions && notes.agencyActions.length > 0 && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <p className="subsection-title agency">Agency Tasks</p>
                  {notes.agencyActions.map((a, i) => (
                    <div key={i} className="action-row">
                      <span className={`action-check ${a.status === "done" ? "done" : ""}`}>{a.status === "done" ? "\u2611" : "\u2610"}</span>
                      <span className={`action-desc ${a.status === "done" ? "done" : ""}`} style={{ flex: 1, fontSize: "0.875rem", color: a.status === "done" ? "#9ca3af" : "#4b5563" }}>{a.description}</span>
                      <span className="action-owner">{a.owner}</span>
                    </div>
                  ))}
                </div>
              )}
              {notes.clientActions && notes.clientActions.length > 0 && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <p className="subsection-title client">Client Tasks</p>
                  {notes.clientActions.map((a, i) => (
                    <div key={i} className="action-row">
                      <span className={`action-check ${a.status === "done" ? "done" : ""}`}>{a.status === "done" ? "\u2611" : "\u2610"}</span>
                      <span className={`action-desc ${a.status === "done" ? "done" : ""}`} style={{ flex: 1, fontSize: "0.875rem", color: a.status === "done" ? "#9ca3af" : "#4b5563" }}>{a.description}</span>
                      <span className="action-owner">{a.owner}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Back Cover */}
        <div className="back-cover">
          <p className="back-title serif">Club She Is.</p>
          <p className="back-subtitle">Monthly Performance Report</p>
          <div className="back-divider" />
          <p className="back-url">www.clubsheis.com</p>
        </div>
      </body>
    </html>
  );
}

function InsightBlock({ headline, insights, recommendation }: { headline?: string; insights?: string[]; recommendation?: string }) {
  return (
    <div className="insight-block">
      {headline && <p className="insight-headline">{headline}</p>}
      {insights?.map((insight, i) => (
        <div key={i} className="insight-item">
          <span className="insight-dot">&bull;</span>
          <p className="insight-text">{insight}</p>
        </div>
      ))}
      {recommendation && <p className="insight-rec">&rarr; {recommendation}</p>}
    </div>
  );
}

function StrategySection({ title, items }: { title: string; items: Array<{ title: string; insight: string; action: string; impact: string }> }) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <p className="subsection-title" style={{ color: "#6b7280" }}>{title}</p>
      {items.map((item, i) => (
        <div key={i} className="strategy-item">
          <p className="strategy-title">{item.title}<span className="strategy-impact">{item.impact}</span></p>
          <p className="strategy-insight">{item.insight}</p>
          <p className="strategy-action">&rarr; {item.action}</p>
        </div>
      ))}
    </div>
  );
}
