"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { TabNavigation } from "@/components/dashboard/TabNavigation";
import { DashboardFooter } from "@/components/dashboard/DashboardFooter";
import { supabase } from "@/lib/supabase";

interface Props {
  slug: string;
  children: React.ReactNode;
}

export function DashboardShell({ slug, children }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [clientName, setClientName] = useState("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [currentPeriodId, setCurrentPeriodId] = useState("");
  const [periods, setPeriods] = useState<
    { id: string; label: string; inProgress?: boolean }[]
  >([]);
  const [clients, setClients] = useState<{ slug: string; name: string }[]>([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Auth check: clients can only access their own dashboard
  useEffect(() => {
    fetch("/api/auth/verify")
      .then((r) => r.json())
      .then((data) => {
        if (data.role === "admin") {
          setIsAdmin(true);
          setAuthChecked(true);
        } else if (data.role === "client") {
          if (data.slug !== slug) {
            router.replace(`/dashboard/${data.slug}`);
            return;
          }
          setAuthChecked(true);
        } else {
          router.replace(`/login?client=${slug}`);
        }
      })
      .catch(() => router.replace(`/login?client=${slug}`));
  }, [slug, router]);

  const loadData = useCallback(async () => {
    // Periods come from /api/periods rather than straight from Supabase: that
    // route also creates the month we're currently in, so the dropdown always
    // offers an up-to-date reporting month even before it has been synced.
    const [clientRes, periodsRes, clientsRes] = await Promise.all([
      supabase.from("clients").select("name").eq("slug", slug).single(),
      fetch("/api/periods")
        .then((r) => r.json())
        .catch(() => null),
      supabase.from("clients").select("slug, name").eq("is_active", true).order("name"),
    ]);

    if (clientRes.data) setClientName(clientRes.data.name);
    const periodList: {
      id: string;
      period_key: string;
      label: string;
      is_current: boolean;
      in_progress: boolean;
    }[] = periodsRes?.periods || [];
    if (periodList.length > 0) {
      setPeriods(
        periodList.map((p) => ({ id: p.id, label: p.label, inProgress: p.in_progress }))
      );
      // Use the period from the URL if present (it may be an id or a period_key
      // such as "august-2026"), otherwise the flagged current one.
      const urlPeriod = searchParams.get("period");
      const selected =
        (urlPeriod && periodList.find((p) => p.id === urlPeriod || p.period_key === urlPeriod)) ||
        periodList.find((p) => p.id === periodsRes?.currentPeriodId) ||
        periodList.find((p) => p.is_current) ||
        null;
      if (selected) {
        setCurrentPeriodId(selected.id);
        setPeriodLabel(selected.label);
      }
    }
    if (clientsRes.data) setClients(clientsRes.data.map((c) => ({ slug: c.slug, name: c.name })));
  }, [slug, searchParams]);

  useEffect(() => {
    if (authChecked) loadData();
  }, [loadData, authChecked]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FAF7F2" }}>
        <div className="w-8 h-8 border-2 border-[#4A1942] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FAF7F2" }}>
      <DashboardHeader
        clientName={clientName || slug}
        slug={slug}
        periodLabel={periodLabel}
        periods={periods}
        clients={isAdmin ? clients : []}
        currentPeriodId={currentPeriodId}
        onPeriodChange={(id) => {
          setCurrentPeriodId(id);
          const p = periods.find((pp) => pp.id === id);
          if (p) setPeriodLabel(p.label);
          // Stay on current tab when changing period
          router.push(`${pathname}?period=${id}`);
        }}
        onClientChange={(newSlug) => router.push(`/dashboard/${newSlug}`)}
      />
      <TabNavigation slug={slug} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-10 py-8">
        {children}
      </main>
      <DashboardFooter />
    </div>
  );
}
