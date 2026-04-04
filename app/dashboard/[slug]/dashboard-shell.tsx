"use client";

import { useRouter } from "next/navigation";
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
  const [clientName, setClientName] = useState("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [currentPeriodId, setCurrentPeriodId] = useState("");
  const [periods, setPeriods] = useState<{ id: string; label: string }[]>([]);
  const [clients, setClients] = useState<{ slug: string; name: string }[]>([]);

  const loadData = useCallback(async () => {
    const [clientRes, periodsRes, clientsRes] = await Promise.all([
      supabase.from("clients").select("name").eq("slug", slug).single(),
      supabase.from("reporting_periods").select("id, label, is_current").order("start_date", { ascending: false }),
      supabase.from("clients").select("slug, name").eq("is_active", true).order("name"),
    ]);

    if (clientRes.data) setClientName(clientRes.data.name);
    if (periodsRes.data) {
      setPeriods(periodsRes.data.map((p) => ({ id: p.id, label: p.label })));
      const current = periodsRes.data.find((p) => p.is_current);
      if (current) {
        setCurrentPeriodId(current.id);
        setPeriodLabel(current.label);
      }
    }
    if (clientsRes.data) setClients(clientsRes.data.map((c) => ({ slug: c.slug, name: c.name })));
  }, [slug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FAF7F2" }}>
      <DashboardHeader
        clientName={clientName || slug}
        periodLabel={periodLabel}
        periods={periods}
        clients={clients}
        currentPeriodId={currentPeriodId}
        onPeriodChange={(id) => {
          setCurrentPeriodId(id);
          const p = periods.find((pp) => pp.id === id);
          if (p) setPeriodLabel(p.label);
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
