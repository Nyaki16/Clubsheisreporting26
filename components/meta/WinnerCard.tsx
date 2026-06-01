import type { IntelligenceAdMetric, WinnerInsight, AdFormat } from "@/lib/meta/types";

interface Props {
  insight: WinnerInsight;
  ad: { name: string; thumbnailUrl: string | null; metrics: IntelligenceAdMetric; format: AdFormat };
  hasRevenue: boolean;
}

function moneyZAR(n: number | null) {
  return n === null ? "—" : `R ${Math.round(n).toLocaleString("en-ZA")}`;
}
function num(n: number) {
  return n.toLocaleString("en-ZA");
}

export function WinnerCard({ insight, ad, hasRevenue }: Props) {
  const m = ad.metrics;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex gap-4">
      {ad.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ad.thumbnailUrl} alt="" className="w-24 h-24 rounded-lg object-cover bg-gray-100 flex-shrink-0" loading="lazy" />
      ) : (
        <div className="w-24 h-24 rounded-lg bg-gray-100 flex-shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] uppercase tracking-wide text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded ring-1 ring-emerald-200">
            Winner
          </span>
          <span className="text-[10px] uppercase tracking-wide text-gray-500">{ad.format}</span>
          <span className="text-[10px] uppercase tracking-wide text-gray-400">·</span>
          <span className="text-[10px] uppercase tracking-wide text-gray-500">{insight.framework}</span>
          <span className="text-[10px] uppercase tracking-wide text-gray-400">·</span>
          <span className="text-[10px] uppercase tracking-wide text-gray-500">{insight.hook_type}</span>
          <span className="text-[10px] uppercase tracking-wide text-gray-400">·</span>
          <span className="text-[10px] uppercase tracking-wide text-gray-500">{insight.angle}</span>
        </div>
        <h4 className="text-sm font-semibold text-gray-900 truncate" title={ad.name}>{ad.name}</h4>

        <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-x-3 gap-y-1 text-xs">
          <div><div className="text-gray-400">Spend</div><div className="text-gray-900 tabular-nums">{moneyZAR(m.spend)}</div></div>
          <div><div className="text-gray-400">Impr.</div><div className="text-gray-900 tabular-nums">{num(m.impressions)}</div></div>
          <div><div className="text-gray-400">Clicks</div><div className="text-gray-900 tabular-nums">{num(m.linkClicks)}</div></div>
          <div><div className="text-gray-400">Conv.</div><div className="text-gray-900 tabular-nums">{num(m.conversions)}</div></div>
          <div><div className="text-gray-400">{hasRevenue ? "Revenue" : "CPA"}</div><div className="text-gray-900 tabular-nums">{hasRevenue ? moneyZAR(m.revenue) : moneyZAR(m.cpa)}</div></div>
          <div><div className="text-gray-400">{hasRevenue ? "ROAS" : "Freq."}</div><div className="text-gray-900 tabular-nums">{hasRevenue ? (m.roas === null ? "—" : m.roas.toFixed(2)) : m.frequency.toFixed(2)}</div></div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-gray-800">{insight.why_it_works}</p>
      </div>
    </div>
  );
}
