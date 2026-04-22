import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildDraftHtml, planSlots } from "@/lib/email-generator/html-builder";
import { BRAND_SYSTEM_PROMPT, buildUserPrompt } from "@/lib/email-generator/prompts";
import type { AICopy, CampaignInput, ProductInput } from "@/lib/email-generator/types";

export const maxDuration = 60;

function checkAuth(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return true;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;
  const adminCookie = request.cookies.get("admin_session");
  return adminCookie?.value === "true";
}

function validate(input: unknown): { ok: true; data: CampaignInput } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Invalid body" };
  const i = input as Record<string, unknown>;
  const campaignDate = typeof i.campaignDate === "string" ? i.campaignDate : "";
  const theme = typeof i.theme === "string" ? i.theme : "";
  if (!campaignDate) return { ok: false, error: "campaignDate required" };
  if (!Array.isArray(i.products) || i.products.length === 0) {
    return { ok: false, error: "At least one product required" };
  }
  if (i.products.length > 12) {
    return { ok: false, error: "Maximum 12 products per campaign" };
  }
  const products: ProductInput[] = [];
  for (const raw of i.products as unknown[]) {
    if (!raw || typeof raw !== "object") return { ok: false, error: "Invalid product entry" };
    const p = raw as Record<string, unknown>;
    const name = typeof p.name === "string" ? p.name.trim() : "";
    const priceRaw = p.priceZar;
    const priceZar = typeof priceRaw === "number" ? priceRaw : parseFloat(String(priceRaw || 0));
    const productUrl = typeof p.productUrl === "string" ? p.productUrl.trim() : "";
    const description = typeof p.description === "string" ? p.description.trim() : "";
    const dimensions = typeof p.dimensions === "string" ? p.dimensions.trim() : "";
    const curated = p.curated === undefined || p.curated === null ? true : Boolean(p.curated);
    if (!name) return { ok: false, error: "Product name required" };
    if (!Number.isFinite(priceZar) || priceZar <= 0) {
      return { ok: false, error: `Valid price required for ${name}` };
    }
    if (!productUrl || !/^https?:\/\//.test(productUrl)) {
      return { ok: false, error: `Valid product URL required for ${name}` };
    }
    products.push({
      name,
      priceZar,
      productUrl,
      description: description || undefined,
      dimensions: dimensions || undefined,
      curated,
    });
  }
  if (!products.some((p) => p.curated !== false)) {
    return {
      ok: false,
      error: "At least one product must be part of the curated edit",
    };
  }
  return { ok: true, data: { campaignDate, theme, products } };
}

export async function POST(request: NextRequest) {
  try {
    if (!checkAuth(request)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = validate(body);
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }
    const { campaignDate, theme, products } = parsed.data;
    const curatedProducts = products.filter((p) => p.curated !== false);
    const individualProducts = products.filter((p) => p.curated === false);
    const curatedTotalZar = curatedProducts.reduce((sum, p) => sum + p.priceZar, 0);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
    }
    const anthropic = new Anthropic({ apiKey });

    const userPrompt = buildUserPrompt({
      theme,
      campaignDate,
      products,
      curatedTotalZar,
      curatedCount: curatedProducts.length,
      individualCount: individualProducts.length,
    });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: [
        {
          type: "text",
          text: BRAND_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return Response.json({ error: "Empty AI response" }, { status: 502 });
    }

    let copy: AICopy;
    try {
      const match = textBlock.text.match(/\{[\s\S]*\}/);
      copy = JSON.parse(match ? match[0] : textBlock.text) as AICopy;
    } catch {
      return Response.json(
        { error: "Failed to parse AI response", raw: textBlock.text.slice(0, 500) },
        { status: 502 }
      );
    }

    if (!Array.isArray(copy.productDescriptions) || copy.productDescriptions.length !== products.length) {
      copy.productDescriptions = products.map((p, i) => copy.productDescriptions?.[i] || p.description || p.name);
    }
    if (!Array.isArray(copy.statsStrip) || copy.statsStrip.length !== 3) {
      copy.statsStrip = [
        `${curatedProducts.length} Piece${curatedProducts.length === 1 ? "" : "s"}`,
        `R ${curatedTotalZar.toLocaleString("en-ZA")}`,
        "Made to Order",
      ];
    }
    copy.individualSectionLabel = copy.individualSectionLabel || "Also Available";
    copy.individualSectionTagline = copy.individualSectionTagline || "Handpicked additions";
    copy.individualNarrative = copy.individualNarrative || "";
    copy.leadParagraph = copy.leadParagraph || "";

    const html = buildDraftHtml({ products, copy, curatedTotalZar });
    const slots = planSlots(products);

    return Response.json({
      success: true,
      data: {
        html,
        copy,
        slots,
        curatedTotalZar,
        curatedCount: curatedProducts.length,
        individualCount: individualProducts.length,
      },
    });
  } catch (e) {
    console.error("Email generator draft error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("rate_limit") || msg.includes("429")) {
      return Response.json({ error: "AI rate limit reached. Try again shortly." }, { status: 429 });
    }
    return Response.json({ error: "Failed to generate draft: " + msg }, { status: 500 });
  }
}
