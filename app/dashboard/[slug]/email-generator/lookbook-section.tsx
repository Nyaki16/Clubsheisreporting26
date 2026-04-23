"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Sparkles, Download, BookOpen } from "lucide-react";
import { BRAND } from "@/lib/email-generator/brand";
import {
  buildLookbookProducts,
  groupProducts,
  type LookbookPage,
  type LookbookProduct,
} from "@/lib/email-generator/lookbook-plan";
import type { AICopy, ImageSlot, ProductInput } from "@/lib/email-generator/types";
import {
  LookbookPageView,
  LOOKBOOK_PAGE_WIDTH,
  LOOKBOOK_PAGE_HEIGHT,
} from "./lookbook-pages";

const PREVIEW_SCALE = 0.35;

export interface LookbookSavedState {
  narratives?: string[];
}

interface ProductPagePlan {
  sectionLabel: string;
  products: LookbookProduct[];
}

interface Props {
  theme: string;
  campaignDate: string;
  products: ProductInput[];
  copy: AICopy;
  slots: ImageSlot[];
  slotUrls: Record<string, string>;
  initialState?: LookbookSavedState | null;
  onStateChange?: (state: LookbookSavedState) => void;
}

export function LookbookSection({
  theme,
  campaignDate,
  products,
  copy,
  slotUrls,
  initialState,
  onStateChange,
}: Props) {
  const [narratives, setNarratives] = useState<string[] | null>(
    initialState?.narratives && initialState.narratives.length > 0
      ? initialState.narratives
      : null
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<"pdf" | "png" | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const id = "lookbook-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300&family=Montserrat:wght@300;400;500&display=swap";
    document.head.appendChild(link);
  }, []);

  const { productPagesPlan, pages } = useMemo(() => {
    const { curated, individual } = buildLookbookProducts(
      products.map((p) => ({
        name: p.name,
        priceZar: p.priceZar,
        productUrl: p.productUrl,
        description: p.description,
        dimensions: p.dimensions,
        curated: p.curated,
      })),
      copy.productDescriptions || [],
      slotUrls
    );
    const plan: ProductPagePlan[] = [];
    const curatedGroups = groupProducts(curated);
    curatedGroups.forEach((g) =>
      plan.push({ sectionLabel: "The Curated Edit", products: g })
    );
    const individualGroups = groupProducts(individual);
    individualGroups.forEach((g) =>
      plan.push({ sectionLabel: "Also Available", products: g })
    );

    const built: LookbookPage[] = [];
    built.push({
      kind: "cover",
      heroUrl: slotUrls["hero"],
      theme: copy.heroHeadline || "The Edit",
      subheadline: copy.collectionLabel || "",
      lead: copy.leadParagraph || copy.heroSubheadline || "",
      wordmark: BRAND.wordmark,
    });
    plan.forEach((p, idx) => {
      built.push({
        kind: "products",
        sectionLabel: p.sectionLabel,
        narrative: narratives?.[idx] || "",
        products: p.products,
      });
    });
    built.push({
      kind: "contact",
      whatsapp: BRAND.contact.whatsapp,
      phone: BRAND.contact.phone,
      website: BRAND.contact.website,
      instagram: BRAND.contact.instagram,
    });

    return { productPagesPlan: plan, pages: built };
  }, [products, copy, slotUrls, narratives]);

  const pagesContainerRef = useRef<HTMLDivElement | null>(null);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setGenerating(true);
    try {
      const payload = {
        theme,
        campaignDate,
        pages: productPagesPlan.map((p) => ({
          sectionLabel: p.sectionLabel,
          products: p.products.map((it) => ({
            name: it.name,
            description: it.description || undefined,
            dimensions: it.dimensions || undefined,
          })),
        })),
      };
      const res = await fetch("/api/email-generator/lookbook-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(result.error || `Failed (HTTP ${res.status})`);
        return;
      }
      const ns: string[] = Array.isArray(result.data?.narratives)
        ? result.data.narratives
        : [];
      setNarratives(ns);
      onStateChange?.({ narratives: ns });
    } catch (e) {
      setError(String(e));
    } finally {
      setGenerating(false);
    }
  }, [theme, campaignDate, productPagesPlan, onStateChange]);

  const capturePage = useCallback(
    async (idx: number): Promise<HTMLCanvasElement | null> => {
      const container = pagesContainerRef.current;
      if (!container) return null;
      const node = container.querySelector<HTMLElement>(
        `[data-lookbook-page="${idx}"]`
      );
      if (!node) return null;
      const html2canvasMod = await import("html2canvas-pro");
      const html2canvas = html2canvasMod.default;
      return html2canvas(node, {
        width: LOOKBOOK_PAGE_WIDTH,
        height: LOOKBOOK_PAGE_HEIGHT,
        scale: 2,
        useCORS: true,
        backgroundColor: BRAND.palette.black,
        logging: false,
      });
    },
    []
  );

  const handleDownloadPdf = useCallback(async () => {
    setError(null);
    setDownloading("pdf");
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      for (let i = 0; i < pages.length; i++) {
        const canvas = await capturePage(i);
        if (!canvas) continue;
        const img = canvas.toDataURL("image/jpeg", 0.92);
        if (i > 0) pdf.addPage();
        pdf.addImage(img, "JPEG", 0, 0, pageWidth, pageHeight);
      }
      pdf.save(`link-interiors-lookbook-${campaignDate}.pdf`);
    } catch (e) {
      setError("PDF export failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setDownloading(null);
    }
  }, [pages, capturePage, campaignDate]);

  const handleDownloadPngs = useCallback(async () => {
    setError(null);
    setDownloading("png");
    try {
      const JSZipMod = await import("jszip");
      const JSZip = JSZipMod.default;
      const zip = new JSZip();
      for (let i = 0; i < pages.length; i++) {
        const canvas = await capturePage(i);
        if (!canvas) continue;
        const blob: Blob | null = await new Promise((resolve) =>
          canvas.toBlob((b) => resolve(b), "image/png")
        );
        if (blob) {
          zip.file(`page-${String(i + 1).padStart(2, "0")}.png`, blob);
        }
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `link-interiors-lookbook-${campaignDate}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError("PNG export failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setDownloading(null);
    }
  }, [pages, capturePage, campaignDate]);

  const ready = narratives && narratives.length >= productPagesPlan.length;

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#4A1942]" />
          <h3 className="text-sm font-semibold text-gray-900">Lookbook</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating || productPagesPlan.length === 0}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-[#4A1942] hover:bg-[#3a1335] px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {ready ? "Regenerate copy" : "Generate lookbook"}
          </button>
          {ready && (
            <>
              <button
                onClick={handleDownloadPdf}
                disabled={!!downloading}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {downloading === "pdf" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                PDF
              </button>
              <button
                onClick={handleDownloadPngs}
                disabled={!!downloading}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {downloading === "png" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                PNGs
              </button>
            </>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-600">
        Magazine-style spread using the same images, prices, and theme as the email — 4 products per page, 3–4 sentence editorial narrative per page, cover and contact spread included.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!ready && !generating && productPagesPlan.length > 0 && (
        <div className="text-sm text-gray-500">
          {productPagesPlan.length} product page{productPagesPlan.length === 1 ? "" : "s"} planned · click Generate lookbook to write the narratives and produce the spread.
        </div>
      )}

      {productPagesPlan.length === 0 && (
        <div className="text-sm text-amber-600">
          Upload images first so each product has an image for the lookbook page.
        </div>
      )}

      {ready && (
        <div
          ref={pagesContainerRef}
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${Math.round(
              LOOKBOOK_PAGE_WIDTH * PREVIEW_SCALE
            )}px, 1fr))`,
          }}
        >
          {pages.map((page, i) => (
            <div
              key={i}
              style={{
                width: Math.round(LOOKBOOK_PAGE_WIDTH * PREVIEW_SCALE),
                height: Math.round(LOOKBOOK_PAGE_HEIGHT * PREVIEW_SCALE),
                overflow: "hidden",
                position: "relative",
                boxShadow: "0 6px 20px -4px rgba(0,0,0,0.25)",
                borderRadius: 4,
              }}
            >
              <div
                style={{
                  transform: `scale(${PREVIEW_SCALE})`,
                  transformOrigin: "top left",
                  width: LOOKBOOK_PAGE_WIDTH,
                  height: LOOKBOOK_PAGE_HEIGHT,
                }}
              >
                <LookbookPageView page={page} pageNumber={i} />
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: 6,
                  right: 8,
                  fontFamily: "monospace",
                  fontSize: 10,
                  color: "rgba(255,255,255,0.5)",
                  background: "rgba(0,0,0,0.45)",
                  padding: "2px 6px",
                  borderRadius: 3,
                }}
              >
                {i + 1}/{pages.length}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
