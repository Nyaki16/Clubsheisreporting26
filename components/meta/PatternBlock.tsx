import type { PatternInsight } from "@/lib/meta/types";

export function PatternBlock({ pattern }: { pattern: PatternInsight }) {
  if (!pattern.paragraph && (!pattern.rules || pattern.rules.length === 0)) return null;
  return (
    <div className="bg-gray-900 text-white rounded-xl p-6">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-2 font-semibold">The pattern</div>
      <p className="text-sm leading-relaxed text-gray-100">{pattern.paragraph}</p>
      {pattern.rules && pattern.rules.length > 0 && (
        <>
          <div className="text-[10px] uppercase tracking-wide text-gray-400 mt-5 mb-2 font-semibold">Apply going forward</div>
          <ul className="space-y-1.5">
            {pattern.rules.map((r, i) => (
              <li key={i} className="text-sm text-gray-100 flex gap-2">
                <span className="text-gray-500 flex-shrink-0">{i + 1}.</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
