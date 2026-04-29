import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getServiceClient } from "@/lib/supabase";
import { getBrand, type Brand } from "@/lib/email-generator/brand";
import { isAuthorized } from "@/lib/email-generator/auth";
import type { ProductInput } from "@/lib/email-generator/types";

export const maxDuration = 60;

function southAfricanSeason(dateIso: string): string {
  const d = new Date(dateIso);
  const m = Number.isFinite(d.getTime()) ? d.getUTCMonth() + 1 : new Date().getUTCMonth() + 1;
  if (m === 12 || m <= 2) return "summer";
  if (m <= 5) return "autumn";
  if (m <= 8) return "winter";
  return "spring";
}

interface NoteSummary {
  period: string;
  summary?: string;
  agencyActions?: unknown[];
  clientActions?: unknown[];
}

function buildSystemPrompt(brand: Brand): string {
  return `You are a senior creative director for ${brand.wordmark}.

About the brand:
${brand.voice.description}

Tone: ${brand.voice.tone}.

Your job: propose 3 distinct thematic angles for a weekly product email.

Each proposed theme must:
- Fit the products on offer (their type, style, price range)
- Reflect the time of year in South Africa (or a timely cultural moment)
- Where relevant, connect to or extend something in the recent strategy notes provided
- Feel genuinely different from the other two suggestions — not variations of one idea

Return a single JSON object. No prose, no markdown fences:

{
  "suggestions": [
    {
      "name": "Short theme name (max 5 words, editorial not punny)",
      "reasoning": "3-4 sentences explaining WHY this theme works — how it suits these products, this season, and any relevant prior-month context. Be specific — cite product types or note points.",
      "direction": "1-2 sentences of creative direction for the copywriter — hero tone, imagery cues, what the headline should lean into. This populates the theme field when the user picks it."
    }
  ]
}

Rules:
- Output must be parseable JSON — no trailing commas, no comments
- Exactly 3 suggestions`;
}

async function fetchRecentNotes(
  supabase: ReturnType<typeof getServiceClient>,
  clientId: string
): Promise<NoteSummary[]> {
  const { data: periods } = await supabase
    .from("reporting_periods")
    .select("id, label")
    .order("start_date", { ascending: false })
    .limit(3);
  const notes: NoteSummary[] = [];
  for (const p of periods || []) {
    const { data: row } = await supabase
      .from("dashboard_data")
      .select("data")
      .eq("client_id", clientId)
      .eq("period_id", p.id)
      .eq("section", "notes")
      .maybeSingle();
    if (row?.data) {
      const n = row.data as Record<string, unknown>;
      notes.push({
        period: p.label,
        summary: typeof n.summary === "string" ? n.summary : undefined,
        agencyActions: Array.isArray(n.agencyActions) ? n.agencyActions : undefined,
        clientActions: Array.isArray(n.clientActions) ? n.clientActions : undefined,
      });
    }
  }
  return notes;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    if (!slug) {
      return Response.json({ error: "slug required" }, { status: 400 });
    }
    if (!isAuthorized(request, slug)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const brand = getBrand(slug);
    if (!brand) {
      return Response.json(
        { error: `Email generator not configured for "${slug}"` },
        { status: 400 }
      );
    }
    const campaignDate =
      typeof body?.campaignDate === "string"
        ? body.campaignDate
        : new Date().toISOString().slice(0, 10);
    const rawProducts = Array.isArray(body?.products) ? body.products : [];
    const products: ProductInput[] = rawProducts
      .map((r: unknown) => (r && typeof r === "object" ? (r as Partial<ProductInput>) : null))
      .filter((r: Partial<ProductInput> | null): r is Partial<ProductInput> => r !== null && !!r.name)
      .map((r: Partial<ProductInput>) => ({
        name: String(r.name || "").trim(),
        priceZar: typeof r.priceZar === "number" ? r.priceZar : parseFloat(String(r.priceZar || 0)),
        productUrl: String(r.productUrl || "").trim(),
        description: r.description ? String(r.description).trim() : undefined,
        dimensions: r.dimensions ? String(r.dimensions).trim() : undefined,
        curated: r.curated === undefined ? true : Boolean(r.curated),
      }));
    if (products.length === 0) {
      return Response.json(
        { error: "Add at least one product with a name before suggesting themes" },
        { status: 400 }
      );
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
    }

    const supabase = getServiceClient();
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!client) {
      return Response.json({ error: `Client "${slug}" not found` }, { status: 404 });
    }

    const notes = await fetchRecentNotes(supabase, client.id as string);
    const season = southAfricanSeason(campaignDate);

    const productList = products
      .map((p, i) => {
        const tag = p.curated === false ? "[individual]" : "[curated]";
        const parts = [`${i + 1}. ${tag} ${p.name} — R ${p.priceZar.toLocaleString("en-ZA")}`];
        if (p.description) parts.push(`   type/style: ${p.description}`);
        if (p.dimensions) parts.push(`   size: ${p.dimensions}`);
        return parts.join("\n");
      })
      .join("\n\n");

    const notesContext =
      notes.length > 0
        ? "\n\nRecent strategy notes (most recent first, truncated):\n" +
          notes
            .map((n) => {
              const bits = [`- ${n.period}`];
              if (n.summary) bits.push(`summary: ${n.summary.slice(0, 400)}`);
              if (n.agencyActions && n.agencyActions.length > 0) {
                bits.push(`agency actions: ${JSON.stringify(n.agencyActions).slice(0, 300)}`);
              }
              return bits.join(" · ");
            })
            .join("\n")
        : "\n\n(No recent strategy notes found for this client.)";

    const userPrompt = `Campaign date: ${campaignDate}
Season in Johannesburg, South Africa: ${season}
Products in this campaign (${products.length} total):
${productList}${notesContext}

Propose 3 distinct theme options for this weekly email. Return the JSON only.`;

    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: [
        { type: "text", text: buildSystemPrompt(brand), cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return Response.json({ error: "Empty AI response" }, { status: 502 });
    }

    let parsed: { suggestions?: Array<{ name?: string; reasoning?: string; direction?: string }> };
    try {
      const match = textBlock.text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : textBlock.text);
    } catch {
      return Response.json(
        { error: "Failed to parse AI response", raw: textBlock.text.slice(0, 500) },
        { status: 502 }
      );
    }
    if (!Array.isArray(parsed?.suggestions)) {
      return Response.json({ error: "Invalid response shape" }, { status: 502 });
    }
    const suggestions = parsed.suggestions
      .filter((s) => s && typeof s.name === "string" && typeof s.direction === "string")
      .slice(0, 3)
      .map((s) => ({
        name: String(s.name).trim(),
        reasoning: String(s.reasoning || "").trim(),
        direction: String(s.direction).trim(),
      }));
    if (suggestions.length === 0) {
      return Response.json({ error: "No valid suggestions returned" }, { status: 502 });
    }

    return Response.json({
      success: true,
      data: {
        suggestions,
        context: { season, notesCount: notes.length },
      },
    });
  } catch (e) {
    console.error("Theme suggestions error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("rate_limit") || msg.includes("429")) {
      return Response.json({ error: "AI rate limit reached. Try again shortly." }, { status: 429 });
    }
    return Response.json({ error: "Failed to suggest themes: " + msg }, { status: 500 });
  }
}
