import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

function checkAuth(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return true;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;
  const adminCookie = request.cookies.get("admin_session");
  return adminCookie?.value === "true";
}

const SYSTEM_PROMPT = `You are a senior magazine editor writing copy for a Link Interiors lookbook.

Link Interiors is a South African luxury interior design and furniture brand based in Johannesburg.

Voice:
- Magazine editorial — warm, luxurious, unhurried
- Short, intentional sentences
- Elevated luxury, never salesy
- Suggest the room, the mood, the way the pieces are used
- Do not invent prices or dimensions; do not re-list what the reader can already see
- South African English spelling
- No exclamation marks, no hashtags, no emojis, no marketing clichés

You will receive:
- A campaign theme
- Groups of 3–4 products per page, each page belonging to a section ("The Curated Edit" or "Also Available")

For EACH page, write a 3–4 sentence narrative that:
- Sits at the top of the page as an editorial intro
- Evokes the mood or room these specific pieces could anchor
- References what these items have in common (material, silhouette, role in the room)
- Flows from the campaign theme

Return a single JSON object, no prose, no markdown fences:

{
  "pages": [
    { "narrative": "3–4 sentence narrative for page 1" },
    { "narrative": "..." }
  ]
}

The pages array length must match the number of pages provided, in order.`;

interface PageInput {
  sectionLabel: string;
  products: Array<{
    name: string;
    description?: string;
    dimensions?: string;
  }>;
}

function buildUserPrompt(theme: string, campaignDate: string, pages: PageInput[]): string {
  const pageBlocks = pages
    .map((page, i) => {
      const items = page.products
        .map((p, j) => {
          const bits = [`    ${j + 1}. ${p.name}`];
          if (p.description) bits.push(`       — ${p.description}`);
          if (p.dimensions) bits.push(`       ${p.dimensions}`);
          return bits.join("\n");
        })
        .join("\n");
      return `Page ${i + 1} · ${page.sectionLabel}:\n${items}`;
    })
    .join("\n\n");

  return `Campaign date: ${campaignDate}
Campaign theme: ${theme || "(none provided — use a quiet, seasonal instinct)"}

Pages (${pages.length} total):

${pageBlocks}

Return the JSON now with ${pages.length} narratives, one per page, in order.`;
}

export async function POST(request: NextRequest) {
  try {
    if (!checkAuth(request)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const theme = typeof body?.theme === "string" ? body.theme : "";
    const campaignDate = typeof body?.campaignDate === "string" ? body.campaignDate : "";
    const rawPages = Array.isArray(body?.pages) ? body.pages : [];
    const pages: PageInput[] = rawPages
      .filter((p: unknown) => p && typeof p === "object")
      .map((p: unknown) => {
        const obj = p as Record<string, unknown>;
        const sectionLabel = typeof obj.sectionLabel === "string" ? obj.sectionLabel : "The Curated Edit";
        const products = Array.isArray(obj.products)
          ? (obj.products as unknown[])
              .filter((it) => it && typeof it === "object")
              .map((it) => {
                const o = it as Record<string, unknown>;
                return {
                  name: typeof o.name === "string" ? o.name : "",
                  description: typeof o.description === "string" ? o.description : undefined,
                  dimensions: typeof o.dimensions === "string" ? o.dimensions : undefined,
                };
              })
              .filter((it) => it.name)
          : [];
        return { sectionLabel, products };
      })
      .filter((p: PageInput) => p.products.length > 0);

    if (pages.length === 0) {
      return Response.json({ error: "At least one page with products is required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey });
    const userPrompt = buildUserPrompt(theme, campaignDate, pages);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return Response.json({ error: "Empty AI response" }, { status: 502 });
    }
    let parsed: { pages?: Array<{ narrative?: string }> };
    try {
      const match = textBlock.text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : textBlock.text);
    } catch {
      return Response.json(
        { error: "Failed to parse AI response", raw: textBlock.text.slice(0, 500) },
        { status: 502 }
      );
    }
    const narratives = (parsed.pages || []).map((p) => String(p?.narrative || "").trim());
    while (narratives.length < pages.length) narratives.push("");

    return Response.json({
      success: true,
      data: { narratives },
    });
  } catch (e) {
    console.error("Lookbook copy error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("rate_limit") || msg.includes("429")) {
      return Response.json({ error: "AI rate limit reached. Try again shortly." }, { status: 429 });
    }
    return Response.json({ error: "Failed to generate lookbook copy: " + msg }, { status: 500 });
  }
}
