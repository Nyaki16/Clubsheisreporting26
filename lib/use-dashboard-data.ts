"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function useDashboardData<T>(slug: string, section: string) {
  const searchParams = useSearchParams();
  const periodParam = searchParams.get("period");
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setData(null);

      const { data: client } = await supabase
        .from("clients").select("id").eq("slug", slug).single();
      if (!client) { setLoading(false); return; }

      // Use period from URL or fall back to is_current
      let periodId = periodParam;
      if (!periodId) {
        const { data: period } = await supabase
          .from("reporting_periods").select("id").eq("is_current", true).single();
        periodId = period?.id || null;
      }
      if (!periodId) { setLoading(false); return; }

      const { data: sectionData } = await supabase
        .from("dashboard_data")
        .select("data")
        .eq("client_id", client.id)
        .eq("period_id", periodId)
        .eq("section", section)
        .single();

      if (sectionData?.data) setData(sectionData.data as T);
      setLoading(false);
    }
    load();
  }, [slug, section, periodParam]);

  return { data, loading };
}

// Same hook but for fetching multiple sections at once
export function useDashboardSections(slug: string, sections: string[]) {
  const searchParams = useSearchParams();
  const periodParam = searchParams.get("period");
  const [data, setData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setData({});

      const { data: client } = await supabase
        .from("clients").select("id").eq("slug", slug).single();
      if (!client) { setLoading(false); return; }

      let periodId = periodParam;
      if (!periodId) {
        const { data: period } = await supabase
          .from("reporting_periods").select("id").eq("is_current", true).single();
        periodId = period?.id || null;
      }
      if (!periodId) { setLoading(false); return; }

      const { data: rows } = await supabase
        .from("dashboard_data")
        .select("section, data")
        .eq("client_id", client.id)
        .eq("period_id", periodId)
        .in("section", sections);

      const result: Record<string, unknown> = {};
      for (const row of rows || []) {
        result[row.section] = row.data;
      }
      setData(result);
      setLoading(false);
    }
    load();
  }, [slug, sections.join(","), periodParam]);

  return { data, loading };
}
