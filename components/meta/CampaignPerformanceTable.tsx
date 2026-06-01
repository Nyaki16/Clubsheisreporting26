"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { ChevronRight, ChevronDown, Search } from "lucide-react";
import type {
  CampaignsResponse,
  CampaignRow,
  AdSetRow,
  AdRow,
  RowStatus,
  AdFormat,
} from "@/lib/meta/types";
import type { DateRangeValue } from "./DateRangePicker";
import { FatigueDot } from "./FatigueDot";

interface Props {
  slug: string;
  hasMetaAds: boolean;
  range: DateRangeValue;
}

type SortKey =
  | "name"
  | "spend"
  | "impressions"
  | "reach"
  | "frequency"
  | "linkClicks"
  | "landingPageViews"
  | "conversions"
  | "revenue"
  | "roasOrCpa"
  | "hookRate";

const STATUS_LABEL: Record<RowStatus, string> = {
  active: "Active",
  paused: "Paused",
  learning: "Learning",
  in_review: "In review",
  disapproved: "Disapproved",
  unknown: "Unknown",
};

const STATUS_TONE: Record<RowStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  paused: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  learning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  in_review: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  disapproved: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  unknown: "bg-gray-100 text-gray-500 ring-1 ring-gray-200",
};

function fmtNum(n: number): string {
  return n.toLocaleString("en-ZA");
}
function fmtMoney(n: number): string {
  // Non-breaking space between "R" and the number so values never wrap mid-amount.
  return `R ${Math.round(n).toLocaleString("en-ZA")}`;
}
function fmtPct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}
function fmtRatio(n: number | null, digits = 2): string {
  return n === null ? "—" : n.toFixed(digits);
}

type AnyRow = CampaignRow | AdSetRow | AdRow;
function sortValue(row: AnyRow, key: SortKey, hasRevenue: boolean): number | string {
  switch (key) {
    case "name":
      return row.name.toLowerCase();
    case "roasOrCpa":
      if (hasRevenue) return row.roas ?? -Infinity;
      return row.cpa ?? Infinity;
    case "hookRate":
      return row.hookRate ?? -1;
    case "revenue":
      return row.revenue ?? -1;
    default:
      return row[key] as number;
  }
}

function sortRows<T extends AnyRow>(rows: T[], key: SortKey, dir: 1 | -1, hasRevenue: boolean): T[] {
  return [...rows].sort((a, b) => {
    const av = sortValue(a, key, hasRevenue);
    const bv = sortValue(b, key, hasRevenue);
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}

// Which metric columns have at least one non-zero / non-null value across the dataset.
// Used to hide columns Windsor isn't populating (LPV, conv, revenue, etc.) so the table
// shows only signal.
interface ColumnVisibility {
  landingPageViews: boolean;
  conversions: boolean;
  revenue: boolean;
  roasOrCpa: boolean;
  hookRate: boolean;
}

function computeVisibility(campaigns: CampaignRow[]): ColumnVisibility {
  const v: ColumnVisibility = {
    landingPageViews: false,
    conversions: false,
    revenue: false,
    roasOrCpa: false,
    hookRate: false,
  };
  const walk = (row: AnyRow) => {
    if (row.landingPageViews > 0) v.landingPageViews = true;
    if (row.conversions > 0) v.conversions = true;
    if (row.revenue !== null && row.revenue > 0) v.revenue = true;
    if (row.roas !== null || row.cpa !== null) v.roasOrCpa = true;
    if (row.hookRate !== null && row.hookRate > 0) v.hookRate = true;
  };
  for (const c of campaigns) {
    walk(c);
    for (const s of c.adSets) {
      walk(s);
      for (const a of s.ads) walk(a);
    }
  }
  return v;
}

interface MetricCellsProps {
  row: AnyRow;
  hasRevenue: boolean;
  visible: ColumnVisibility;
}
function MetricCells({ row, hasRevenue, visible }: MetricCellsProps) {
  const cellCls = "py-2 px-3 text-right tabular-nums text-gray-700 whitespace-nowrap";
  return (
    <>
      <td className={cellCls}>{fmtMoney(row.spend)}</td>
      <td className={cellCls}>{fmtNum(row.impressions)}</td>
      <td className={cellCls}>{fmtNum(row.reach)}</td>
      <td className={cellCls}>{row.frequency.toFixed(2)}</td>
      <td className={cellCls}>{fmtNum(row.linkClicks)}</td>
      {visible.landingPageViews && <td className={cellCls}>{fmtNum(row.landingPageViews)}</td>}
      {visible.conversions && <td className={cellCls}>{fmtNum(row.conversions)}</td>}
      {visible.revenue && (
        <td className={cellCls}>{row.revenue === null ? "—" : fmtMoney(row.revenue)}</td>
      )}
      {visible.roasOrCpa && (
        <td className={cellCls}>
          {hasRevenue ? fmtRatio(row.roas) : row.cpa === null ? "—" : fmtMoney(row.cpa)}
        </td>
      )}
      {visible.hookRate && (
        <td className={cellCls}>{row.hookRate === null ? "—" : fmtPct(row.hookRate)}</td>
      )}
      <td className="py-2 px-3 text-center">
        <FatigueDot level={row.fatigue} />
      </td>
    </>
  );
}

function StatusPill({ status }: { status: RowStatus }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${STATUS_TONE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function CampaignPerformanceTable({ slug, hasMetaAds, range }: Props) {
  const [statusFilter, setStatusFilter] = useState<"active" | "paused" | "all">("all");
  const [formatFilter, setFormatFilter] = useState<AdFormat | "all">("all");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<CampaignsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    if (!hasMetaAds) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date_range: { start: range.start, end: range.end },
          status_filter: statusFilter,
          format_filter: formatFilter === "unknown" ? "all" : formatFilter,
          search,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      setData(json as CampaignsResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [slug, range.start, range.end, statusFilter, formatFilter, search, hasMetaAds]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasRevenue = data?.revenueSource === "meta";

  const sortedCampaigns = useMemo(() => {
    if (!data) return [];
    const sorted = sortRows(data.campaigns, sortKey, sortDir, hasRevenue);
    return sorted.map((c) => ({
      ...c,
      adSets: sortRows(c.adSets, sortKey, sortDir, hasRevenue).map((s) => ({
        ...s,
        ads: sortRows(s.ads, sortKey, sortDir, hasRevenue),
      })),
    }));
  }, [data, sortKey, sortDir, hasRevenue]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir(sortDir === 1 ? -1 : 1);
    else {
      setSortKey(key);
      setSortDir(key === "name" ? 1 : -1);
    }
  }

  function toggleCampaign(id: string) {
    setExpandedCampaigns((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAdSet(id: string) {
    setExpandedAdSets((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (!hasMetaAds) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Campaign Performance</h3>
        <p className="text-sm text-gray-500">Meta Ads is not connected for this client.</p>
      </div>
    );
  }

  const visible = useMemo<ColumnVisibility>(
    () => computeVisibility(sortedCampaigns),
    [sortedCampaigns],
  );

  const headers: { key: SortKey; label: string; align: "left" | "right" | "center" }[] = [
    { key: "name", label: "Name", align: "left" },
    { key: "spend", label: "Spend", align: "right" },
    { key: "impressions", label: "Impressions", align: "right" },
    { key: "reach", label: "Reach", align: "right" },
    { key: "frequency", label: "Freq.", align: "right" },
    { key: "linkClicks", label: "Link Clicks", align: "right" },
    ...(visible.landingPageViews ? [{ key: "landingPageViews" as SortKey, label: "LPV", align: "right" as const }] : []),
    ...(visible.conversions ? [{ key: "conversions" as SortKey, label: "Conv.", align: "right" as const }] : []),
    ...(visible.revenue ? [{ key: "revenue" as SortKey, label: "Revenue", align: "right" as const }] : []),
    ...(visible.roasOrCpa ? [{ key: "roasOrCpa" as SortKey, label: hasRevenue ? "ROAS" : "CPA", align: "right" as const }] : []),
    ...(visible.hookRate ? [{ key: "hookRate" as SortKey, label: "Hook %", align: "right" as const }] : []),
  ];
  // colspan = chevron(1) + headers + fatigue(1)
  const totalCols = headers.length + 2;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Campaign Performance with Conversions</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Click a row to expand. Revenue source: <span className="font-medium">{data?.revenueSource ?? "—"}</span>
          {data?.revenueSourceMock ? " (mocked for v1)" : ""}
          {data?.synced && data?.syncedAt ? (
            <>
              {" · "}
              <span className="text-gray-400">
                synced {new Date(data.syncedAt).toLocaleDateString("en-ZA", { dateStyle: "medium" })}
                {data.dateRange ? ` · ${data.dateRange.start} → ${data.dateRange.end}` : ""}
              </span>
            </>
          ) : null}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search campaign or ad…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-7 pr-2 rounded-md border border-gray-300 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
        </select>
        <select
          value={formatFilter}
          onChange={(e) => setFormatFilter(e.target.value as typeof formatFilter)}
          className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900"
        >
          <option value="all">All formats</option>
          <option value="video">Video</option>
          <option value="static">Static</option>
          <option value="carousel">Carousel</option>
        </select>
        <button
          onClick={fetchData}
          disabled={loading}
          className="h-8 px-3 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}{" "}
          <button onClick={fetchData} className="ml-2 underline font-medium">
            Retry
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="w-6"></th>
              {headers.map((h) => {
                const align = h.align === "right" ? "text-right" : h.align === "center" ? "text-center" : "text-left";
                const sortIndicator = h.key === sortKey ? (sortDir === 1 ? " ↑" : " ↓") : "";
                return (
                  <th
                    key={h.key}
                    onClick={() => toggleSort(h.key)}
                    className={`py-2 px-3 text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-900 ${align}`}
                  >
                    {h.label}
                    {sortIndicator}
                  </th>
                );
              })}
              <th className="py-2 px-3 text-xs font-medium text-gray-500 uppercase text-center">Fatigue</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data && (
              <tr>
                <td colSpan={totalCols} className="py-8 text-center text-sm text-gray-500">
                  Loading campaign data…
                </td>
              </tr>
            )}
            {!loading && sortedCampaigns.length === 0 && !error && (
              <tr>
                <td colSpan={totalCols} className="py-8 text-center text-sm text-gray-500">
                  No campaigns in this date range.
                </td>
              </tr>
            )}
            {sortedCampaigns.map((c) => {
              const cOpen = expandedCampaigns.has(c.id);
              return (
                <CampaignRowGroup
                  key={c.id}
                  campaign={c}
                  open={cOpen}
                  expandedAdSets={expandedAdSets}
                  hasRevenue={hasRevenue}
                  visible={visible}
                  onToggleCampaign={toggleCampaign}
                  onToggleAdSet={toggleAdSet}
                />
              );
            })}
          </tbody>
          {data && sortedCampaigns.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50">
                <td colSpan={2} className="py-2 px-3 text-xs font-medium text-gray-900 uppercase">
                  Total
                </td>
                <td className="py-2 px-3 text-right tabular-nums font-medium text-gray-900 whitespace-nowrap">{fmtMoney(data.totals.spend)}</td>
                <td className="py-2 px-3 text-right tabular-nums text-gray-900 whitespace-nowrap">{fmtNum(data.totals.impressions)}</td>
                <td />
                <td />
                <td />
                {visible.landingPageViews && <td />}
                {visible.conversions && (
                  <td className="py-2 px-3 text-right tabular-nums text-gray-900 whitespace-nowrap">{fmtNum(data.totals.conversions)}</td>
                )}
                {visible.revenue && (
                  <td className="py-2 px-3 text-right tabular-nums text-gray-900 whitespace-nowrap">
                    {data.totals.revenue === null ? "—" : fmtMoney(data.totals.revenue)}
                  </td>
                )}
                {visible.roasOrCpa && (
                  <td className="py-2 px-3 text-right tabular-nums text-gray-900 whitespace-nowrap">
                    {hasRevenue ? fmtRatio(data.totals.roas) : "—"}
                  </td>
                )}
                {visible.hookRate && <td />}
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function CampaignRowGroup({
  campaign,
  open,
  expandedAdSets,
  hasRevenue,
  visible,
  onToggleCampaign,
  onToggleAdSet,
}: {
  campaign: CampaignRow;
  open: boolean;
  expandedAdSets: Set<string>;
  hasRevenue: boolean;
  visible: ColumnVisibility;
  onToggleCampaign: (id: string) => void;
  onToggleAdSet: (id: string) => void;
}) {
  return (
    <>
      <tr
        className="border-b border-gray-100 cursor-pointer hover:bg-gray-50"
        onClick={() => onToggleCampaign(campaign.id)}
      >
        <td className="py-2 px-2 text-gray-400">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </td>
        <td className="py-2 px-3 font-semibold text-gray-900">
          <div className="flex items-center gap-2">
            <span className="truncate max-w-[280px]" title={campaign.name}>{campaign.name}</span>
            <StatusPill status={campaign.status} />
          </div>
        </td>
        <MetricCells row={campaign} hasRevenue={hasRevenue} visible={visible} />
      </tr>
      {open &&
        campaign.adSets.map((s) => {
          const sOpen = expandedAdSets.has(s.id);
          return (
            <AdSetRowGroup
              key={s.id}
              adSet={s}
              open={sOpen}
              hasRevenue={hasRevenue}
              visible={visible}
              onToggle={onToggleAdSet}
            />
          );
        })}
    </>
  );
}

function AdSetRowGroup({
  adSet,
  open,
  hasRevenue,
  visible,
  onToggle,
}: {
  adSet: AdSetRow;
  open: boolean;
  hasRevenue: boolean;
  visible: ColumnVisibility;
  onToggle: (id: string) => void;
}) {
  return (
    <>
      <tr
        className="border-b border-gray-100 cursor-pointer hover:bg-gray-50 bg-gray-50/50"
        onClick={() => onToggle(adSet.id)}
      >
        <td className="py-2 px-2 pl-6 text-gray-400">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </td>
        <td className="py-2 px-3 text-gray-800">
          <div className="flex items-center gap-2 pl-2">
            <span className="truncate max-w-[260px]" title={adSet.name}>{adSet.name}</span>
            <StatusPill status={adSet.status} />
          </div>
        </td>
        <MetricCells row={adSet} hasRevenue={hasRevenue} visible={visible} />
      </tr>
      {open && adSet.ads.map((ad) => <AdLeafRow key={ad.id} ad={ad} hasRevenue={hasRevenue} visible={visible} />)}
    </>
  );
}

function AdLeafRow({ ad, hasRevenue, visible }: { ad: AdRow; hasRevenue: boolean; visible: ColumnVisibility }) {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-2 px-2"></td>
      <td className="py-2 px-3 text-gray-700">
        <div className="flex items-center gap-3 pl-6">
          {ad.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ad.thumbnailUrl}
              alt=""
              className="w-10 h-10 rounded object-cover bg-gray-100 flex-shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="w-10 h-10 rounded bg-gray-100 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <div className="truncate max-w-[240px] text-gray-900" title={ad.name}>{ad.name}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wide">{ad.format}</div>
          </div>
          <StatusPill status={ad.status} />
        </div>
      </td>
      <MetricCells row={ad} hasRevenue={hasRevenue} visible={visible} />
    </tr>
  );
}
