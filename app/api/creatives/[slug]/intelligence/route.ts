import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { authorizeForSlug } from "@/lib/meta/auth";
import { resolveClientBySlug } from "@/lib/meta/config";
import type { AdRow, CampaignsResponse } from "@/lib/meta/types";
import { getServiceClient } from "@/lib/supabase";
import { CREATIVE_INTELLIGENCE_SYSTEM, buildUserMessage } from "@/lib/prompts/creative-intelligence";

export const maxDuration = 60;

const MODEL = "claude-sonnet-4-20250514";
const SECTION = "metaIntelligence";
const CAMPAIGNS_SECTION = "metaCampaigns";

interface RequestBody {
  date_range?: { start: string; end: string };
}

function flattenCampaigns(campaigns: CampaignsResponse["campaigns"]): AdRow[] {
  const out: AdRow[] = [];
  for (const c of campaigns) for (const s of c.adSets) for (const a of s.ads) out.push(a);
  return out;
}

// GET = read latest cached intelligence (cheap, no Claude call)
export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const auth = await authorizeForSlug(request, slug);
  if (!auth.ok) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const client = await resolveClientBySlug(slug);
  if (!client) return Response.json({ error: "Client not found" }, { status: 404 });

  const supabase = getServiceClient();
  const { data: row } = await supabase
    .from("dashboard_data")
    .select("data, updated_at")
    .eq("client_id", client.id)
    .eq("section", SECTION)
    .is("period_id", null)
    .limit(1)
    .single();

  if (!row) return Response.json({ cached: null });
  return Response.json({ cached: row.data, updatedAt: row.updated_at });
}

// POST = generate fresh intelligence (burns Claude credits)
export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const auth = await authorizeForSlug(request, slug);
    if (!auth.ok) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as RequestBody;

    const client = await resolveClientBySlug(slug);
    if (!client) return Response.json({ error: "Client not found" }, { status: 404 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });

    // Read the synced metaCampaigns snapshot rather than calling Meta live.
    const supabase = getServiceClient();
    const { data: campRow } = await supabase
      .from("dashboard_data")
      .select("data")
      .eq("client_id", client.id)
      .eq("section", CAMPAIGNS_SECTION)
      .is("period_id", null)
      .limit(1)
      .maybeSingle();

    if (!campRow?.data) {
      return Response.json(
        { error: "No Meta data synced for this client yet. Run Sync Data first." },
        { status: 422 },
      );
    }

    const snapshot = campRow.data as CampaignsResponse;
    const range = body.date_range || snapshot.dateRange;
    const allAds = flattenCampaigns(snapshot.campaigns || []);
    const hasRevenue = snapshot.revenueSource === "meta";

    const scoreForWinning = (a: AdRow) => (hasRevenue ? a.roas ?? -Infinity : a.cpa === null ? Infinity : -a.cpa);
    const scoreForLosing = (a: AdRow) => (hasRevenue ? a.roas ?? Infinity : a.cpa === null ? -Infinity : a.cpa);

    const eligibleWinners = allAds.filter((a) => a.impressions >= 100);
    const winners = [...eligibleWinners].sort((a, b) => scoreForWinning(b) - scoreForWinning(a)).slice(0, 3);

    // Note: no creation-date filter (Windsor doesn't expose ad created_time).
    // The 1,000-impression threshold filters out brand-new ads in practice.
    const eligibleLosers = allAds.filter((a) => a.impressions >= 1000);
    const losers = [...eligibleLosers].sort((a, b) => scoreForLosing(b) - scoreForLosing(a)).slice(0, 3);

    if (winners.length === 0 && losers.length === 0) {
      return Response.json(
        { error: "Not enough ad data in this date range to generate intelligence." },
        { status: 422 },
      );
    }

    const adMetricsMap: Record<string, { name: string; thumbnailUrl: string | null; metrics: Record<string, number | null>; format: string }> = {};
    for (const a of [...winners, ...losers]) {
      adMetricsMap[a.id] = {
        name: a.name,
        thumbnailUrl: a.thumbnailUrl,
        format: a.format,
        metrics: {
          spend: a.spend,
          impressions: a.impressions,
          linkClicks: a.linkClicks,
          conversions: a.conversions,
          revenue: a.revenue,
          roas: a.roas,
          cpa: a.cpa,
          hookRate: a.hookRate,
          frequency: a.frequency,
        },
      };
    }

    const toPromptAd = (a: AdRow) => ({
      ad_id: a.id,
      name: a.name,
      body_text: a.bodyText,
      format: a.format,
      metrics: {
        spend: Math.round(a.spend),
        impressions: a.impressions,
        link_clicks: a.linkClicks,
        conversions: a.conversions,
        revenue: a.revenue === null ? null : Math.round(a.revenue),
        roas: a.roas === null ? null : Number(a.roas.toFixed(2)),
        cpa: a.cpa === null ? null : Math.round(a.cpa),
        hook_rate: a.hookRate === null ? null : Number(a.hookRate.toFixed(3)),
        frequency: Number(a.frequency.toFixed(2)),
      },
    });

    const userText = buildUserMessage({
      clientName: client.name,
      dateRange: range,
      winners: winners.map(toPromptAd),
      losers: losers.map(toPromptAd),
    });

    // Build content blocks: text + image-per-ad (only when we have a thumbnail).
    type ContentBlock =
      | { type: "text"; text: string }
      | { type: "image"; source: { type: "url"; url: string } };

    const contentBlocks: ContentBlock[] = [{ type: "text", text: userText }];
    for (const a of [...winners, ...losers]) {
      if (a.thumbnailUrl) {
        contentBlocks.push({ type: "text", text: `Image for ad_id ${a.id}:` });
        contentBlocks.push({ type: "image", source: { type: "url", url: a.thumbnailUrl } });
      }
    }

    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: CREATIVE_INTELLIGENCE_SYSTEM,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: [{ role: "user", content: contentBlocks as any }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return Response.json({ error: "No text response from Claude" }, { status: 502 });
    }
    const raw = textBlock.text;

    // Strip any accidental markdown fences before parse.
    const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

    let parsed: { winners: unknown[]; losers: unknown[]; pattern: { paragraph: string; rules: string[] } };
    try {
      parsed = JSON.parse(stripped);
    } catch {
      const match = stripped.match(/\{[\s\S]*\}/);
      if (!match) {
        console.error("Claude returned non-JSON:", raw.slice(0, 500));
        return Response.json(
          {
            error: "Could not parse Claude response",
            fallback: { winners: [], losers: [], pattern: { paragraph: "", rules: [] } },
          },
          { status: 502 },
        );
      }
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        console.error("Claude returned non-JSON:", raw.slice(0, 500));
        return Response.json(
          {
            error: "Could not parse Claude response",
            fallback: { winners: [], losers: [], pattern: { paragraph: "", rules: [] } },
          },
          { status: 502 },
        );
      }
    }

    const result = {
      winners: parsed.winners || [],
      losers: parsed.losers || [],
      pattern: parsed.pattern || { paragraph: "", rules: [] },
      generatedAt: new Date().toISOString(),
      dateRange: range,
      adMetrics: adMetricsMap,
    };

    // Cache. One row per client; overwritten each generation.
    const { data: existing } = await supabase
      .from("dashboard_data")
      .select("id")
      .eq("client_id", client.id)
      .eq("section", SECTION)
      .is("period_id", null)
      .limit(1)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("dashboard_data")
        .update({ data: result, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("dashboard_data").insert({
        client_id: client.id,
        period_id: null,
        section: SECTION,
        data: result,
      });
    }

    return Response.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Intelligence route error:", message);
    if (message.includes("rate_limit") || message.includes("429")) {
      return Response.json({ error: "Claude rate limit reached. Try again in a minute." }, { status: 429 });
    }
    return Response.json({ error: message }, { status: 500 });
  }
}
