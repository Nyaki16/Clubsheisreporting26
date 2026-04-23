"use client";

import { useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  Copy as CopyIcon,
  Download,
  Sparkles,
  Check,
  X,
  Upload,
  Image as ImageIcon,
  Save,
  RefreshCw,
  Wand2,
  ChevronDown,
  ChevronRight,
  Pencil,
} from "lucide-react";
import { buildDraftHtml, swapPlaceholders } from "@/lib/email-generator/html-builder";
import type { AICopy, ImageSlot, ProductInput, SlotUrlMap } from "@/lib/email-generator/types";
import { LookbookSection, type LookbookSavedState } from "./lookbook-section";

const ACCESS_SLUG = "link-interiors";

interface ProductRow {
  name: string;
  priceZar: string;
  productUrl: string;
  description: string;
  dimensions: string;
  curated: boolean;
}

const EMPTY_ROW: ProductRow = {
  name: "",
  priceZar: "",
  productUrl: "",
  description: "",
  dimensions: "",
  curated: true,
};

interface SlotState {
  uploading: boolean;
  url?: string;
  fileName?: string;
  error?: string;
  previewDataUrl?: string;
}

interface DraftData {
  html: string;
  copy: AICopy;
  slots: ImageSlot[];
  curatedTotalZar: number;
  curatedCount: number;
  individualCount: number;
}

interface ThemeSuggestion {
  name: string;
  reasoning: string;
  direction: string;
}

async function safeJson(res: Response): Promise<{ error?: string; data?: { url: string; fileId?: string } } | null> {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  const text = await res.text().catch(() => "");
  return { error: text.slice(0, 180) || `HTTP ${res.status}` };
}

const CSV_TEMPLATE = `name,priceZar,productUrl,description,dimensions,curated
The Ava,32500,https://linkinterior.co.za/products/the-ava,Sculptural Floor Lamp · Matte Black,H 180cm · W 120cm · D 45cm,true
The Noor,18900,https://linkinterior.co.za/products/the-noor,Accent Side Table · Travertine,,true
The Mila,9500,https://linkinterior.co.za/products/the-mila,Ceramic Vase · Ivory,,false
`;

function detectDelimiter(firstLine: string): string {
  const commas = (firstLine.match(/,/g) || []).length;
  const semis = (firstLine.match(/;/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;
  if (semis > commas && semis > tabs) return ";";
  if (tabs > commas && tabs > semis) return "\t";
  return ",";
}

function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
      } else {
        cell += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === delimiter) {
        row.push(cell);
        cell = "";
        i++;
      } else if (ch === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
        i++;
      } else if (ch === "\r") {
        i++;
      } else {
        cell += ch;
        i++;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function parseProductsCsv(text: string): { rows: ProductRow[]; errors: string[] } {
  // Strip UTF-8 BOM that Excel adds to the first cell
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const delimiter = detectDelimiter(firstLine);
  const parsed = parseCsv(text, delimiter).filter((r) => r.some((c) => c.trim() !== ""));
  if (parsed.length === 0) return { rows: [], errors: ["CSV is empty"] };
  const normalize = (s: string) =>
    s.trim().toLowerCase().replace(/[\s_()-]/g, "");
  const header = parsed[0].map(normalize);
  const findCol = (...names: string[]) => {
    for (const n of names) {
      const idx = header.indexOf(normalize(n));
      if (idx >= 0) return idx;
    }
    return -1;
  };
  const idxName = findCol("name", "product name", "product", "item");
  const idxPrice = findCol("pricezar", "price", "price zar", "cost");
  const idxUrl = findCol("producturl", "url", "link", "product link");
  const idxDesc = findCol("description", "desc", "short description");
  const idxDims = findCol("dimensions", "size", "dim", "measurements");
  const idxCurated = findCol("curated", "iscurated", "edit", "incollection");
  if (idxName < 0 || idxPrice < 0 || idxUrl < 0) {
    const foundHeaders = parsed[0].map((h) => h.trim()).filter(Boolean).join(", ") || "(empty)";
    const missing = [
      idxName < 0 ? "name" : null,
      idxPrice < 0 ? "priceZar" : null,
      idxUrl < 0 ? "productUrl" : null,
    ].filter(Boolean).join(", ");
    return {
      rows: [],
      errors: [
        `Missing columns: ${missing}. Found headers: ${foundHeaders}. (Delimiter detected: "${delimiter === "\t" ? "TAB" : delimiter}")`,
      ],
    };
  }
  const rows: ProductRow[] = [];
  const errors: string[] = [];
  for (let i = 1; i < parsed.length; i++) {
    const r = parsed[i];
    const name = (r[idxName] || "").trim();
    const priceRaw = (r[idxPrice] || "").trim().replace(/[Rr,\s]/g, "");
    const productUrl = (r[idxUrl] || "").trim();
    if (!name && !priceRaw && !productUrl) continue;
    if (!name) {
      errors.push(`Row ${i + 1}: missing name`);
      continue;
    }
    const priceZar = Number(priceRaw);
    if (!Number.isFinite(priceZar) || priceZar <= 0) {
      errors.push(`Row ${i + 1}: invalid price "${r[idxPrice]}"`);
      continue;
    }
    if (!/^https?:\/\//i.test(productUrl)) {
      errors.push(`Row ${i + 1}: invalid URL`);
      continue;
    }
    let curated = true;
    if (idxCurated >= 0) {
      const raw = (r[idxCurated] || "").trim().toLowerCase();
      if (["false", "no", "n", "0", "individual"].includes(raw)) curated = false;
      else if (["true", "yes", "y", "1", "curated", ""].includes(raw)) curated = true;
    }
    rows.push({
      name,
      priceZar: String(priceZar),
      productUrl,
      description: idxDesc >= 0 ? (r[idxDesc] || "").trim() : "",
      dimensions: idxDims >= 0 ? (r[idxDims] || "").trim() : "",
      curated,
    });
  }
  if (rows.length === 0 && errors.length === 0) {
    errors.push("No product rows found in CSV");
  }
  return { rows, errors };
}

function downloadBlob(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "just now";
  const sec = Math.floor(diff / 1000);
  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

async function resizeImageIfNeeded(
  file: File,
  maxEdge: number,
  quality: number
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read image"));
      el.src = url;
    });
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    const smallEnough = file.size < 3.5 * 1024 * 1024;
    if (longest <= maxEdge && smallEnough) return file;
    const scale = Math.min(1, maxEdge / longest);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob) return file;
    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function EmailGeneratorContent({ slug }: { slug: string }) {
  const [campaignDate, setCampaignDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [theme, setTheme] = useState("");
  const [products, setProducts] = useState<ProductRow[]>([{ ...EMPTY_ROW }]);

  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftData | null>(null);

  const [slotStates, setSlotStates] = useState<Record<string, SlotState>>({});
  const [finalHtml, setFinalHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);

  const [loadingSaved, setLoadingSaved] = useState(slug === ACCESS_SLUG);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvInfo, setCsvInfo] = useState<string | null>(null);
  const [themeSuggestions, setThemeSuggestions] = useState<ThemeSuggestion[] | null>(null);
  const [suggestingThemes, setSuggestingThemes] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [lookbookState, setLookbookState] = useState<LookbookSavedState | null>(null);
  const [editingEmailCopy, setEditingEmailCopy] = useState(false);
  const loadedOnce = useRef(false);

  useEffect(() => {
    if (slug !== ACCESS_SLUG) return;
    if (loadedOnce.current) return;
    loadedOnce.current = true;
    (async () => {
      try {
        const res = await fetch("/api/email-generator/state", { method: "GET" });
        if (!res.ok) {
          setLoadingSaved(false);
          return;
        }
        const result = await res.json();
        const saved = result?.data;
        if (saved && typeof saved === "object") {
          if (saved.form?.campaignDate) setCampaignDate(saved.form.campaignDate);
          if (typeof saved.form?.theme === "string") setTheme(saved.form.theme);
          if (Array.isArray(saved.form?.products) && saved.form.products.length > 0) {
            const normalized: ProductRow[] = (saved.form.products as Partial<ProductRow>[]).map(
              (p) => ({
                name: p.name || "",
                priceZar: p.priceZar || "",
                productUrl: p.productUrl || "",
                description: p.description || "",
                dimensions: p.dimensions || "",
                curated: p.curated === undefined ? true : Boolean(p.curated),
              })
            );
            setProducts(normalized);
          }
          if (saved.draft && saved.draft.html) setDraft(saved.draft as DraftData);
          if (saved.slotUrls && typeof saved.slotUrls === "object") {
            const restored: Record<string, SlotState> = {};
            for (const [id, v] of Object.entries(saved.slotUrls as Record<string, { url: string; fileName?: string }>)) {
              restored[id] = { uploading: false, url: v.url, fileName: v.fileName };
            }
            setSlotStates(restored);
          }
          if (saved.lookbook && typeof saved.lookbook === "object") {
            setLookbookState(saved.lookbook as LookbookSavedState);
          }
          if (result.updatedAt) setLastSavedAt(result.updatedAt);
        }
      } catch {
        // fall through; user just won't have restored state
      } finally {
        setLoadingSaved(false);
      }
    })();
  }, [slug]);

  const hasHydrated = useRef(false);
  useEffect(() => {
    if (loadingSaved) return;
    if (!hasHydrated.current) {
      hasHydrated.current = true;
      return;
    }
    setDirty(true);
  }, [campaignDate, theme, products, draft, slotStates, lookbookState, loadingSaved]);

  const addRow = () => setProducts((ps) => [...ps, { ...EMPTY_ROW }]);
  const removeRow = (i: number) =>
    setProducts((ps) => ps.filter((_, idx) => idx !== i));
  const updateRow = (i: number, patch: Partial<ProductRow>) =>
    setProducts((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const curatedCount = products.filter((p) => p.curated !== false).length;
  const individualCount = products.length - curatedCount;
  const curatedTotal = products
    .filter((p) => p.curated !== false)
    .reduce((sum, p) => sum + (Number(p.priceZar) || 0), 0);
  const individualTotal = products
    .filter((p) => p.curated === false)
    .reduce((sum, p) => sum + (Number(p.priceZar) || 0), 0);

  const canSubmit =
    products.length > 0 &&
    products.every(
      (p) =>
        p.name.trim() &&
        p.productUrl.trim() &&
        Number(p.priceZar) > 0
    ) &&
    curatedCount > 0;

  const handleGenerateDraft = useCallback(async () => {
    setDraftError(null);
    setDraftLoading(true);
    setDraft(null);
    setSlotStates({});
    setFinalHtml(null);
    setLookbookState(null);

    const payload = {
      campaignDate,
      theme: theme.trim(),
      products: products.map((p) => ({
        name: p.name.trim(),
        priceZar: Number(p.priceZar) || 0,
        productUrl: p.productUrl.trim(),
        description: p.description.trim() || undefined,
        dimensions: p.dimensions.trim() || undefined,
        curated: p.curated !== false,
      })),
    };

    try {
      const res = await fetch("/api/email-generator/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        setDraftError(result.error || "Failed to generate draft");
      } else {
        setDraft(result.data as DraftData);
      }
    } catch (e) {
      setDraftError(String(e));
    } finally {
      setDraftLoading(false);
    }
  }, [campaignDate, theme, products]);

  const handleFileForSlot = useCallback(
    async (slotId: string, file: File) => {
      if (!draft) return;
      const slot = draft.slots.find((s) => s.id === slotId);

      const reader = new FileReader();
      reader.onload = () => {
        setSlotStates((s) => ({
          ...s,
          [slotId]: {
            uploading: true,
            previewDataUrl: reader.result as string,
          },
        }));
      };
      reader.readAsDataURL(file);

      let upload: File = file;
      try {
        upload = await resizeImageIfNeeded(file, 1800, 0.88);
      } catch {
        // fall through with original file; server will reject if too large
      }

      const form = new FormData();
      form.append("file", upload);
      form.append("slotId", slotId);
      form.append("campaignDate", campaignDate);
      if (slot?.productName) form.append("productName", slot.productName);

      try {
        const res = await fetch("/api/email-generator/upload-image", {
          method: "POST",
          body: form,
        });
        const result = await safeJson(res);
        if (!res.ok) {
          const msg =
            res.status === 413
              ? "File still too large after resizing. Try a smaller source image."
              : result?.error || `Upload failed (HTTP ${res.status})`;
          setSlotStates((s) => ({
            ...s,
            [slotId]: {
              uploading: false,
              error: msg,
              previewDataUrl: s[slotId]?.previewDataUrl,
            },
          }));
          return;
        }
        if (!result?.data?.url) {
          setSlotStates((s) => ({
            ...s,
            [slotId]: {
              uploading: false,
              error: "Upload succeeded but no URL returned",
              previewDataUrl: s[slotId]?.previewDataUrl,
            },
          }));
          return;
        }
        setSlotStates((s) => ({
          ...s,
          [slotId]: {
            uploading: false,
            url: result.data!.url,
            fileName: file.name,
            previewDataUrl: s[slotId]?.previewDataUrl,
          },
        }));
      } catch (e) {
        setSlotStates((s) => ({
          ...s,
          [slotId]: {
            uploading: false,
            error: String(e),
          },
        }));
      }
      setFinalHtml(null);
    },
    [draft, campaignDate]
  );

  const allUploaded = useMemo(() => {
    if (!draft) return false;
    return draft.slots.every((s) => slotStates[s.id]?.url);
  }, [draft, slotStates]);

  const handleGenerateFinal = useCallback(() => {
    if (!draft) return;
    const urls: SlotUrlMap = {};
    for (const slot of draft.slots) {
      const url = slotStates[slot.id]?.url;
      if (url) urls[slot.id] = url;
    }
    const finalDoc = swapPlaceholders(draft.html, urls, draft.slots);
    setFinalHtml(finalDoc);
  }, [draft, slotStates]);

  const updateCopy = useCallback(
    (patch: Partial<AICopy>) => {
      setDraft((d) => {
        if (!d) return d;
        const newCopy = { ...d.copy, ...patch };
        const productInputs: ProductInput[] = products.map((p) => ({
          name: p.name.trim(),
          priceZar: Number(p.priceZar) || 0,
          productUrl: p.productUrl.trim(),
          description: p.description.trim() || undefined,
          dimensions: p.dimensions.trim() || undefined,
          curated: p.curated !== false,
        }));
        const newHtml = buildDraftHtml({
          products: productInputs,
          copy: newCopy,
          curatedTotalZar: d.curatedTotalZar,
        });
        if (finalHtml) {
          const urls: SlotUrlMap = {};
          for (const slot of d.slots) {
            const url = slotStates[slot.id]?.url;
            if (url) urls[slot.id] = url;
          }
          setFinalHtml(swapPlaceholders(newHtml, urls, d.slots));
        }
        return { ...d, copy: newCopy, html: newHtml };
      });
    },
    [products, slotStates, finalHtml]
  );

  const updateStat = useCallback(
    (idx: 0 | 1 | 2, value: string) => {
      if (!draft) return;
      const stats: [string, string, string] = [
        draft.copy.statsStrip[0],
        draft.copy.statsStrip[1],
        draft.copy.statsStrip[2],
      ];
      stats[idx] = value;
      updateCopy({ statsStrip: stats });
    },
    [draft, updateCopy]
  );

  const updateProductDescription = useCallback(
    (idx: number, value: string) => {
      if (!draft) return;
      const descs = [...draft.copy.productDescriptions];
      descs[idx] = value;
      updateCopy({ productDescriptions: descs });
    },
    [draft, updateCopy]
  );

  const handleCopyFinal = useCallback(async () => {
    if (!finalHtml) return;
    await navigator.clipboard.writeText(finalHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [finalHtml]);

  const handleCopySubject = useCallback(async () => {
    if (!draft) return;
    await navigator.clipboard.writeText(draft.copy.subjectLine);
    setCopiedSubject(true);
    setTimeout(() => setCopiedSubject(false), 1500);
  }, [draft]);

  const handleDownload = useCallback(() => {
    if (!finalHtml) return;
    const blob = new Blob([finalHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `link-interiors-${campaignDate}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [finalHtml, campaignDate]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const slotUrls: Record<string, { url: string; fileName?: string }> = {};
      for (const [id, s] of Object.entries(slotStates)) {
        if (s?.url) slotUrls[id] = { url: s.url, fileName: s.fileName };
      }
      const payload = {
        form: { campaignDate, theme, products },
        draft,
        slotUrls,
        lookbook: lookbookState,
      };
      const res = await fetch("/api/email-generator/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(result.error || `Save failed (HTTP ${res.status})`);
        return;
      }
      setLastSavedAt(result.updatedAt || new Date().toISOString());
      setDirty(false);
    } catch (e) {
      setSaveError(String(e));
    } finally {
      setSaving(false);
    }
  }, [campaignDate, theme, products, draft, slotStates, lookbookState]);

  const handleDownloadTemplate = useCallback(() => {
    downloadBlob("link-interiors-products-template.csv", "text/csv;charset=utf-8;", CSV_TEMPLATE);
  }, []);

  const handleCsvUpload = useCallback(async (file: File) => {
    setCsvError(null);
    setCsvInfo(null);
    try {
      const text = await file.text();
      const { rows, errors } = parseProductsCsv(text);
      if (rows.length === 0) {
        setCsvError(errors.join(" · ") || "No valid rows found");
        return;
      }
      setProducts(rows);
      if (errors.length > 0) {
        setCsvInfo(
          `Imported ${rows.length} product${rows.length === 1 ? "" : "s"} · Skipped: ${errors.join("; ")}`
        );
      } else {
        setCsvInfo(`Imported ${rows.length} product${rows.length === 1 ? "" : "s"} from CSV`);
      }
    } catch (e) {
      setCsvError(String(e));
    }
  }, []);

  const canSuggestThemes =
    products.length > 0 && products.some((p) => p.name.trim());

  const handleSuggestThemes = useCallback(async () => {
    setThemeError(null);
    setSuggestingThemes(true);
    try {
      const payload = {
        campaignDate,
        products: products
          .filter((p) => p.name.trim())
          .map((p) => ({
            name: p.name.trim(),
            priceZar: Number(p.priceZar) || 0,
            productUrl: p.productUrl.trim(),
            description: p.description.trim() || undefined,
            dimensions: p.dimensions.trim() || undefined,
            curated: p.curated !== false,
          })),
      };
      const res = await fetch("/api/email-generator/suggest-themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setThemeError(result.error || `Failed (HTTP ${res.status})`);
        return;
      }
      setThemeSuggestions(result.data?.suggestions || []);
    } catch (e) {
      setThemeError(String(e));
    } finally {
      setSuggestingThemes(false);
    }
  }, [campaignDate, products]);

  const applyThemeSuggestion = useCallback((s: ThemeSuggestion) => {
    setTheme(`${s.name}. ${s.direction}`);
    setSelectedSuggestion(s.name);
  }, []);

  const handleStartAgain = useCallback(async () => {
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        "Discard current campaign and start over? This clears the form, the draft, and uploaded image references. The images themselves stay in your GHL media library."
      );
      if (!ok) return;
    }
    try {
      await fetch("/api/email-generator/state", { method: "DELETE" });
    } catch {
      // proceed anyway — clear local state even if the delete failed
    }
    setCampaignDate(new Date().toISOString().slice(0, 10));
    setTheme("");
    setProducts([{ ...EMPTY_ROW }]);
    setDraft(null);
    setDraftError(null);
    setSlotStates({});
    setFinalHtml(null);
    setLastSavedAt(null);
    setDirty(false);
    setSaveError(null);
    setThemeSuggestions(null);
    setSelectedSuggestion(null);
    setThemeError(null);
    setLookbookState(null);
  }, []);

  if (slug !== ACCESS_SLUG) {
    return (
      <div className="space-y-4">
        <h2 className="font-serif text-xl font-semibold text-gray-900">Email Generator</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-600">
            This tool is only available for Link Interiors.
          </p>
        </div>
      </div>
    );
  }

  const statusText = loadingSaved
    ? "Loading saved campaign…"
    : saving
    ? "Saving…"
    : dirty
    ? lastSavedAt
      ? "Unsaved changes"
      : "Not saved yet"
    : lastSavedAt
    ? `Saved ${formatRelativeTime(lastSavedAt)}`
    : "";

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-serif text-xl font-semibold text-gray-900">
            Email Generator
          </h2>
          <p className="text-sm text-gray-500">
            Weekly product email for Link Interiors — AI-drafted copy, branded template, images uploaded straight to the GHL media library.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {statusText && (
            <span
              className={`text-xs ${
                dirty && !saving
                  ? "text-amber-600"
                  : saving
                  ? "text-gray-500"
                  : "text-emerald-600"
              }`}
            >
              {statusText}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-[#4A1942] hover:bg-[#3a1335] px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save
          </button>
          <button
            onClick={handleStartAgain}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Start again
          </button>
        </div>
      </div>

      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      )}

      {/* 1. Campaign inputs */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">1. Campaign details</h3>
          <span className="text-xs text-gray-500">Step 1 of 3</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Campaign date
            </label>
            <input
              type="date"
              value={campaignDate}
              onChange={(e) => setCampaignDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#4A1942] focus:ring-1 focus:ring-[#4A1942]"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <label className="block text-xs font-medium text-gray-700">
                Theme <span className="text-gray-400">(optional)</span>
              </label>
              <button
                onClick={handleSuggestThemes}
                type="button"
                disabled={!canSuggestThemes || suggestingThemes}
                className="flex items-center gap-1 text-xs font-medium text-[#4A1942] hover:text-[#3a1335] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {suggestingThemes ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5" />
                )}
                {suggestingThemes ? "Thinking…" : "Suggest themes"}
              </button>
            </div>
            <textarea
              value={theme}
              onChange={(e) => {
                setTheme(e.target.value);
                setSelectedSuggestion(null);
              }}
              rows={3}
              placeholder="e.g. Autumn Arrivals, Weekend Sale, The Lighting Edit — or click Suggest themes for AI-picked options based on your products, the season, and last month's strategy notes."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#4A1942] focus:ring-1 focus:ring-[#4A1942] resize-y"
            />
          </div>
        </div>

        {themeError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
            {themeError}
          </div>
        )}

        {themeSuggestions && themeSuggestions.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs font-medium text-gray-700 flex items-center justify-between">
              <span>AI theme suggestions · click one to use, edit freely after</span>
              <button
                onClick={() => {
                  setThemeSuggestions(null);
                  setSelectedSuggestion(null);
                }}
                type="button"
                className="text-gray-400 hover:text-gray-700"
              >
                Dismiss
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {themeSuggestions.map((s) => {
                const isSelected = selectedSuggestion === s.name;
                return (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => applyThemeSuggestion(s)}
                    className={`text-left border rounded-lg p-3 transition-colors ${
                      isSelected
                        ? "border-[#4A1942] bg-[#4A1942]/5"
                        : "border-gray-200 bg-white hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="font-serif text-base font-semibold text-gray-900 leading-tight">
                        {s.name}
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#4A1942] flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                    <div className="text-xs text-gray-600 leading-relaxed mb-2">
                      {s.reasoning}
                    </div>
                    <div className="text-xs text-gray-500 italic leading-relaxed border-t border-gray-100 pt-2">
                      {s.direction}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Products */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-xs font-medium text-gray-700">
              Products
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadTemplate}
                type="button"
                className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900"
              >
                <Download className="w-3.5 h-3.5" /> Template
              </button>
              <label className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> Upload CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCsvUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          {csvError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
              {csvError}
            </div>
          )}
          {csvInfo && !csvError && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700">
              {csvInfo}
            </div>
          )}

          <div className="space-y-3">
            {products.map((p, i) => (
              <div
                key={i}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-center justify-between mb-3 gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-medium text-gray-600">
                      Product {i + 1}
                    </span>
                    <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={p.curated !== false}
                        onChange={(e) => updateRow(i, { curated: e.target.checked })}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-[#4A1942] focus:ring-[#4A1942] focus:ring-offset-0"
                      />
                      <span
                        className={
                          p.curated !== false ? "text-[#4A1942]" : "text-gray-500"
                        }
                      >
                        {p.curated !== false ? "Part of curated edit" : "Also available"}
                      </span>
                    </label>
                  </div>
                  {products.length > 1 && (
                    <button
                      onClick={() => removeRow(i)}
                      type="button"
                      className="text-gray-400 hover:text-red-600"
                      aria-label="Remove product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => updateRow(i, { name: e.target.value })}
                      placeholder="Product name (e.g. The Ava)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#4A1942] focus:ring-1 focus:ring-[#4A1942]"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      value={p.priceZar}
                      onChange={(e) => updateRow(i, { priceZar: e.target.value })}
                      placeholder="Price (ZAR, e.g. 32500)"
                      min={0}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#4A1942] focus:ring-1 focus:ring-[#4A1942]"
                    />
                  </div>
                  <div>
                    <input
                      type="url"
                      value={p.productUrl}
                      onChange={(e) => updateRow(i, { productUrl: e.target.value })}
                      placeholder="Product URL (https://linkinterior.co.za/...)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#4A1942] focus:ring-1 focus:ring-[#4A1942]"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={p.description}
                      onChange={(e) => updateRow(i, { description: e.target.value })}
                      placeholder="Description hint (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#4A1942] focus:ring-1 focus:ring-[#4A1942]"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={p.dimensions}
                      onChange={(e) => updateRow(i, { dimensions: e.target.value })}
                      placeholder="Dimensions, optional (H 180cm · W 120cm)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#4A1942] focus:ring-1 focus:ring-[#4A1942]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 gap-3 flex-wrap">
          <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
            <span className="font-medium text-[#4A1942]">
              {curatedCount} curated · R {curatedTotal.toLocaleString("en-ZA")}
            </span>
            {individualCount > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <span>
                  {individualCount} also available · R {individualTotal.toLocaleString("en-ZA")}
                </span>
              </>
            )}
            {curatedCount === 0 && products.length > 0 && (
              <span className="text-amber-600 ml-2">
                At least one product must be part of the curated edit
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={addRow}
              type="button"
              className="flex items-center gap-1.5 text-sm font-medium text-[#4A1942] bg-white border border-[#4A1942]/30 hover:bg-[#4A1942]/5 px-3 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add product
            </button>
            <button
              onClick={handleGenerateDraft}
              disabled={!canSubmit || draftLoading}
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-[#4A1942] hover:bg-[#3a1335] px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {draftLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {draftLoading ? "Drafting..." : "Generate draft"}
            </button>
          </div>
        </div>

        {draftError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {draftError}
          </div>
        )}
      </section>

      {/* 2. Draft preview + image slots */}
      {draft && (
        <>
          <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                2. Draft preview & subject line
              </h3>
              <span className="text-xs text-gray-500">Step 2 of 3</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 space-y-1">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject line
                </div>
                <div className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {draft.copy.subjectLine}
                  </div>
                  <button
                    onClick={handleCopySubject}
                    className="flex-shrink-0 text-gray-500 hover:text-gray-900"
                    aria-label="Copy subject"
                  >
                    {copiedSubject ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <CopyIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preheader
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 truncate">
                  {draft.copy.preheader}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Preview (with placeholder image boxes)
              </div>
              <iframe
                srcDoc={draft.html}
                title="Email draft preview"
                className="w-full rounded-lg border border-gray-200"
                style={{ height: "600px", backgroundColor: "#0A0A0A" }}
                sandbox=""
              />
            </div>

            <div className="border border-gray-200 rounded-lg">
              <button
                type="button"
                onClick={() => setEditingEmailCopy((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50 rounded-lg"
              >
                <span className="flex items-center gap-2">
                  {editingEmailCopy ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <Pencil className="w-3.5 h-3.5 text-[#4A1942]" />
                  Edit email copy
                </span>
                <span className="text-xs text-gray-500">
                  {editingEmailCopy ? "Changes update the preview live" : ""}
                </span>
              </button>
              {editingEmailCopy && (
                <div className="px-4 pb-4 space-y-5">
                  <CopyGroup title="Header">
                    <CopyField
                      label="Subject line"
                      value={draft.copy.subjectLine}
                      onChange={(v) => updateCopy({ subjectLine: v })}
                    />
                    <CopyField
                      label="Preheader (hidden preview text)"
                      value={draft.copy.preheader}
                      onChange={(v) => updateCopy({ preheader: v })}
                    />
                  </CopyGroup>

                  <CopyGroup title="Hero">
                    <CopyField
                      label="Collection label (uppercase eyebrow)"
                      value={draft.copy.collectionLabel}
                      onChange={(v) => updateCopy({ collectionLabel: v })}
                    />
                    <CopyField
                      label="Hero headline"
                      value={draft.copy.heroHeadline}
                      onChange={(v) => updateCopy({ heroHeadline: v })}
                    />
                    <CopyField
                      label="Hero subheadline"
                      value={draft.copy.heroSubheadline}
                      onChange={(v) => updateCopy({ heroSubheadline: v })}
                      multiline
                      rows={2}
                    />
                    <CopyField
                      label="Lead paragraph"
                      value={draft.copy.leadParagraph}
                      onChange={(v) => updateCopy({ leadParagraph: v })}
                      multiline
                      rows={5}
                    />
                  </CopyGroup>

                  <CopyGroup title="Stats strip">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {([0, 1, 2] as const).map((i) => (
                        <CopyField
                          key={i}
                          label={`Stat ${i + 1}`}
                          value={draft.copy.statsStrip[i] || ""}
                          onChange={(v) => updateStat(i, v)}
                        />
                      ))}
                    </div>
                  </CopyGroup>

                  <CopyGroup title="The Curated Edit">
                    <CopyField
                      label="Section label"
                      value={draft.copy.collectionIntroLabel}
                      onChange={(v) => updateCopy({ collectionIntroLabel: v })}
                    />
                    <CopyField
                      label="Section tagline"
                      value={draft.copy.collectionIntroTagline}
                      onChange={(v) => updateCopy({ collectionIntroTagline: v })}
                    />
                  </CopyGroup>

                  <CopyGroup title="Product taglines">
                    <div className="space-y-2">
                      {products.map((p, i) => (
                        <CopyField
                          key={i}
                          label={p.name || `Product ${i + 1}`}
                          value={draft.copy.productDescriptions[i] || ""}
                          onChange={(v) => updateProductDescription(i, v)}
                        />
                      ))}
                    </div>
                  </CopyGroup>

                  <CopyGroup title="Shop The Collection banner">
                    <CopyField
                      label="Above the total price (e.g. 'Dress All Four Rooms From')"
                      value={draft.copy.completeTheLookLine}
                      onChange={(v) => updateCopy({ completeTheLookLine: v })}
                    />
                  </CopyGroup>

                  <CopyGroup title="Also Available">
                    <CopyField
                      label="Section label"
                      value={draft.copy.individualSectionLabel}
                      onChange={(v) => updateCopy({ individualSectionLabel: v })}
                    />
                    <CopyField
                      label="Section tagline"
                      value={draft.copy.individualSectionTagline}
                      onChange={(v) => updateCopy({ individualSectionTagline: v })}
                    />
                    <CopyField
                      label="Narrative (between first 4 and remaining items)"
                      value={draft.copy.individualNarrative}
                      onChange={(v) => updateCopy({ individualNarrative: v })}
                      multiline
                      rows={3}
                    />
                  </CopyGroup>

                  <CopyGroup title="Footer">
                    <CopyField
                      label="Brand promise (italic quote)"
                      value={draft.copy.brandPromise}
                      onChange={(v) => updateCopy({ brandPromise: v })}
                      multiline
                      rows={3}
                    />
                    <CopyField
                      label="Final CTA headline"
                      value={draft.copy.finalCtaHeadline}
                      onChange={(v) => updateCopy({ finalCtaHeadline: v })}
                    />
                    <CopyField
                      label="Final CTA body"
                      value={draft.copy.finalCtaBody}
                      onChange={(v) => updateCopy({ finalCtaBody: v })}
                      multiline
                      rows={3}
                    />
                  </CopyGroup>
                </div>
              )}
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                3. Drop polished images
              </h3>
              <span className="text-xs text-gray-500">Step 3 of 3</span>
            </div>
            <p className="text-sm text-gray-600 -mt-2">
              Drag and drop one image per slot. Each uploads to the Link Interiors GHL media library immediately — the hosted URL is used in the final email HTML.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {draft.slots.map((slot) => (
                <SlotTile
                  key={slot.id}
                  slot={slot}
                  state={slotStates[slot.id]}
                  onFile={(f) => handleFileForSlot(slot.id, f)}
                />
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-gray-500">
                {
                  Object.values(slotStates).filter((s) => s?.url).length
                }{" "}
                of {draft.slots.length} image
                {draft.slots.length === 1 ? "" : "s"} uploaded
              </div>
              <button
                onClick={handleGenerateFinal}
                disabled={!allUploaded}
                className="flex items-center gap-1.5 text-sm font-medium text-white bg-[#4A1942] hover:bg-[#3a1335] px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate final HTML
              </button>
            </div>
          </section>
        </>
      )}

      {/* 3. Final output */}
      {finalHtml && (
        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Final HTML</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyFinal}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied
                  </>
                ) : (
                  <>
                    <CopyIcon className="w-3.5 h-3.5" /> Copy HTML
                  </>
                )}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 text-sm font-medium text-white bg-[#4A1942] hover:bg-[#3a1335] px-3 py-1.5 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download .html
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            Paste into GoHighLevel's <strong>Custom HTML</strong> email block and send. All images are already hosted on your GHL CDN.
          </p>

          <iframe
            srcDoc={finalHtml}
            title="Final email preview"
            className="w-full rounded-lg border border-gray-200"
            style={{ height: "720px", backgroundColor: "#0A0A0A" }}
            sandbox=""
          />
        </section>
      )}

      {draft && (
        <LookbookSection
          theme={theme}
          campaignDate={campaignDate}
          products={products.map((p) => ({
            name: p.name.trim(),
            priceZar: Number(p.priceZar) || 0,
            productUrl: p.productUrl.trim(),
            description: p.description.trim() || undefined,
            dimensions: p.dimensions.trim() || undefined,
            curated: p.curated !== false,
          }))}
          copy={draft.copy}
          slots={draft.slots}
          slotUrls={(() => {
            const map: Record<string, string> = {};
            for (const [id, s] of Object.entries(slotStates)) {
              if (s && s.url) map[id] = s.url;
            }
            return map;
          })()}
          initialState={lookbookState}
          onStateChange={(s) => setLookbookState(s)}
        />
      )}
    </div>
  );
}

function CopyGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function CopyField({
  label,
  value,
  onChange,
  multiline,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-gray-600 mb-1">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          rows={rows ?? 2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#4A1942] focus:ring-1 focus:ring-[#4A1942] resize-y"
        />
      ) : (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#4A1942] focus:ring-1 focus:ring-[#4A1942]"
        />
      )}
    </div>
  );
}

function SlotTile({
  slot,
  state,
  onFile,
}: {
  slot: ImageSlot;
  state?: SlotState;
  onFile: (f: File) => void;
}) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) onFile(file);
    },
    [onFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
      e.target.value = "";
    },
    [onFile]
  );

  const label =
    slot.layout === "hero"
      ? "Hero image"
      : slot.productName || `Product ${(slot.productIndex ?? 0) + 1}`;

  const layoutLabel =
    slot.layout === "hero"
      ? "600×420"
      : slot.layout === "full"
      ? "570×400"
      : "270×260";

  const hasPreview = !!state?.previewDataUrl || !!state?.url;
  const showImg = state?.previewDataUrl || state?.url;

  return (
    <label
      htmlFor={`file-${slot.id}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative block cursor-pointer rounded-lg overflow-hidden border-2 transition-colors ${
        dragging
          ? "border-[#4A1942] bg-[#4A1942]/5"
          : state?.error
          ? "border-red-300 bg-red-50"
          : state?.url
          ? "border-emerald-300 bg-white"
          : "border-dashed border-gray-300 bg-gray-50 hover:border-gray-400"
      }`}
    >
      <input
        id={`file-${slot.id}`}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="sr-only"
      />
      <div className="aspect-[4/3] relative flex items-center justify-center bg-gray-900">
        {hasPreview && showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={showImg}
            alt={label}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center text-gray-400">
            <ImageIcon className="w-8 h-8 mb-1" />
            <span className="text-xs">Drop image</span>
          </div>
        )}
        {state?.uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Uploading…
          </div>
        )}
        {state?.url && !state.uploading && (
          <div className="absolute top-2 right-2 bg-emerald-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow">
            <Check className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      <div className="p-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-gray-900 truncate">
            {label}
          </div>
          <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
            <span>{layoutLabel}</span>
            {state?.fileName && (
              <>
                <span>·</span>
                <span className="truncate">{state.fileName}</span>
              </>
            )}
          </div>
          {state?.error && (
            <div className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
              <X className="w-3 h-3" /> {state.error}
            </div>
          )}
        </div>
        {!state?.url && !state?.uploading && (
          <Upload className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        )}
      </div>
    </label>
  );
}
