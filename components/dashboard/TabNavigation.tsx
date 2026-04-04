"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Settings } from "lucide-react";

interface Tab {
  label: string;
  href: string;
}

export function TabNavigation({ slug }: { slug: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const periodParam = searchParams.get("period");
  const qs = periodParam ? `?period=${periodParam}` : "";
  const base = `/dashboard/${slug}`;

  const tabs: Tab[] = [
    { label: "Overview", href: base },
    { label: "Meta Ads", href: `${base}/meta` },
    { label: "CRM (Ghutte)", href: `${base}/crm` },
    { label: "Social Media", href: `${base}/social` },
    { label: "Email", href: `${base}/email` },
    { label: "Activity Log", href: `${base}/activity` },
    { label: "Wins & Insights", href: `${base}/insights` },
    { label: "Next Month", href: `${base}/next-month` },
    { label: "Strategy Notes", href: `${base}/notes` },
  ];

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 md:px-10 flex items-center overflow-x-auto">
        <nav className="flex gap-0 flex-1 min-w-0">
          {tabs.map((tab) => {
            const isActive =
              tab.href === base
                ? pathname === base
                : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={`${tab.href}${qs}`}
                className={`whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-[#4A1942] text-[#4A1942] font-semibold"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href={`${base}/settings${qs}`}
          className="p-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          <Settings size={18} />
        </Link>
      </div>
    </div>
  );
}
