"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Save, Eye, EyeOff, Check, Loader2 } from "lucide-react";

interface ClientInfo {
  id: string;
  name: string;
  slug: string;
  has_paystack: boolean;
  has_meta_ads: boolean;
  has_ghl: boolean;
  has_systemeio: boolean;
  has_webinarkit: boolean;
  paystack_account: string | null;
  ghl_account: string | null;
  windsor_facebook_account: string | null;
  windsor_instagram_account: string | null;
}

interface KeyConfig {
  key: string;
  label: string;
  description: string;
  placeholder: string;
  condition?: (client: ClientInfo) => boolean;
}

const KEY_CONFIGS: KeyConfig[] = [
  {
    key: "paystack_secret_key",
    label: "Paystack Secret Key (Primary)",
    description: "Primary Paystack account — used to pull subscription counts, transaction breakdowns, and revenue data.",
    placeholder: "sk_live_...",
    condition: (c) => c.has_paystack,
  },
  {
    key: "paystack_secret_key_2",
    label: "Paystack Secret Key (Secondary)",
    description: "Secondary Paystack account — if this client has a second Paystack account. Leave blank if not applicable.",
    placeholder: "sk_live_... (optional)",
    condition: (c) => c.has_paystack,
  },
  {
    key: "systemeio_api_key",
    label: "Systeme.io API Key",
    description: "Used to pull contacts, tags, product sales, and traffic sources from Systeme.io.",
    placeholder: "Your Systeme.io API key",
  },
  {
    key: "webinarkit_api_key",
    label: "WebinarKit API Key",
    description: "Used to pull webinar registrations, attendance, replays, and conversion data from WebinarKit.",
    placeholder: "Your WebinarKit API key",
    condition: (c) => c.has_webinarkit,
  },
  {
    key: "meta_ads_account_id",
    label: "Meta Ads Account ID",
    description: "Facebook/Instagram Ads account ID used in Windsor.ai. Verify this matches the correct client.",
    placeholder: "e.g. 956456447068702",
    condition: (c) => c.has_meta_ads,
  },
  {
    key: "facebook_page_id",
    label: "Facebook Page ID",
    description: "Facebook Organic page ID used in Windsor.ai for organic reach and engagement data.",
    placeholder: "e.g. 100857922763752",
  },
  {
    key: "instagram_account_id",
    label: "Instagram Account ID",
    description: "Instagram account ID used in Windsor.ai for reach, followers, and engagement data.",
    placeholder: "e.g. 17841449119247616",
  },
  {
    key: "ghl_account_id",
    label: "GoHighLevel (Ghutte) Account ID",
    description: "GHL location ID used in Windsor.ai for contacts, opportunities, and revenue.",
    placeholder: "e.g. OgSu08WcrumYq4ZHcoHp",
    condition: (c) => c.has_ghl,
  },
  {
    key: "paystack_account_id",
    label: "Paystack Windsor Account ID",
    description: "Paystack account number in Windsor.ai (1, 2, 3, or 4).",
    placeholder: "e.g. 1",
    condition: (c) => c.has_paystack,
  },
];

export function SettingsContent({ slug }: { slug: string }) {
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [savedKeys, setSavedKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const { data: clientData } = await supabase
      .from("clients")
      .select("id, name, slug, has_paystack, has_meta_ads, has_ghl, has_systemeio, has_webinarkit, paystack_account, ghl_account, windsor_facebook_account, windsor_instagram_account")
      .eq("slug", slug)
      .single();

    if (clientData) {
      setClient(clientData);

      const prefilled: Record<string, string> = {};
      if (clientData.paystack_account) prefilled.paystack_account_id = clientData.paystack_account;
      if (clientData.ghl_account) prefilled.ghl_account_id = clientData.ghl_account;
      if (clientData.windsor_facebook_account) prefilled.facebook_page_id = clientData.windsor_facebook_account;
      if (clientData.windsor_instagram_account) prefilled.instagram_account_id = clientData.windsor_instagram_account;

      const { data: keyData } = await supabase
        .from("dashboard_data")
        .select("data")
        .eq("client_id", clientData.id)
        .eq("section", "api_keys")
        .is("period_id", null)
        .single();

      const savedData = (keyData?.data as Record<string, string>) || {};
      const merged = { ...prefilled, ...savedData };
      setKeys(merged);
      setSavedKeys(merged);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSave() {
    if (!client) return;
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: client.id, keys }),
      });
      if (res.ok) {
        setSaved(true);
        setSavedKeys({ ...keys });
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = JSON.stringify(keys) !== JSON.stringify(savedKeys);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
            <div className="h-10 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!client) return <div className="text-gray-400 text-center py-12">Client not found.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-semibold text-gray-900">API Settings</h2>
        <p className="text-sm text-gray-500 mb-1">Configure data source connections for {client.name}.</p>
        <p className="text-xs text-gray-400">API keys are stored securely and used server-side only during data syncs.</p>
      </div>

      {/* Data Source Status */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Connected Data Sources</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Paystack", active: client.has_paystack },
            { label: "Meta Ads", active: client.has_meta_ads },
            { label: "Ghutte (GHL)", active: client.has_ghl },
            { label: "Systeme.io", active: client.has_systemeio },
            { label: "Facebook Organic", active: true },
            { label: "Instagram", active: true },
          ].map((source) => (
            <span
              key={source.label}
              className={`text-xs font-medium px-3 py-1.5 rounded-full ${
                source.active
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-gray-50 text-gray-400 border border-gray-200"
              }`}
            >
              {source.active ? "●" : "○"} {source.label}
            </span>
          ))}
        </div>
      </div>

      {/* API Key Fields */}
      <div className="space-y-4">
        {KEY_CONFIGS.filter((kc) => !kc.condition || kc.condition(client)).map((config) => (
          <div key={config.key} className="bg-white border border-gray-200 rounded-xl p-5">
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              {config.label}
            </label>
            <p className="text-xs text-gray-500 mb-3">{config.description}</p>
            <div className="relative">
              <input
                type={showKeys[config.key] ? "text" : "password"}
                value={keys[config.key] || ""}
                onChange={(e) => setKeys({ ...keys, [config.key]: e.target.value })}
                placeholder={config.placeholder}
                className="w-full px-4 py-2.5 pr-12 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1942]/20 focus:border-[#4A1942] font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKeys({ ...showKeys, [config.key]: !showKeys[config.key] })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKeys[config.key] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#4A1942] text-white font-semibold text-sm hover:bg-[#3a1335] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : saved ? (
            <Check size={16} />
          ) : (
            <Save size={16} />
          )}
          {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
        </button>
        {hasChanges && !saving && !saved && (
          <span className="text-xs text-amber-600">Unsaved changes</span>
        )}
      </div>
    </div>
  );
}
