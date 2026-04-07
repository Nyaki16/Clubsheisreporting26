"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Check, Plus } from "lucide-react";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function NewClientContent() {
  const router = useRouter();

  // Basic info
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [subtitle, setSubtitle] = useState("");

  // Service toggles
  const [hasPaystack, setHasPaystack] = useState(false);
  const [hasMetaAds, setHasMetaAds] = useState(false);
  const [hasGhl, setHasGhl] = useState(false);
  const [hasSystemeio, setHasSystemeio] = useState(false);
  const [hasWebinarkit, setHasWebinarkit] = useState(false);

  // Account IDs
  const [paystackAccount, setPaystackAccount] = useState("");
  const [ghlAccount, setGhlAccount] = useState("");
  const [windsorFacebookAccount, setWindsorFacebookAccount] = useState("");
  const [windsorInstagramAccount, setWindsorInstagramAccount] = useState("");

  // API Keys
  const [paystackSecretKey, setPaystackSecretKey] = useState("");
  const [paystackSecretKey2, setPaystackSecretKey2] = useState("");
  const [systemeioApiKey, setSystemeioApiKey] = useState("");
  const [ghlPitKey, setGhlPitKey] = useState("");
  const [webinarkitApiKey, setWebinarkitApiKey] = useState("");
  const [metaAdsAccountId, setMetaAdsAccountId] = useState("");
  const [facebookPageId, setFacebookPageId] = useState("");
  const [instagramAccountId, setInstagramAccountId] = useState("");

  // Membership
  const [membershipAmounts, setMembershipAmounts] = useState("");

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManuallyEdited) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true);
    setSlug(slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setError("Client name and slug are required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const apiKeys: Record<string, string> = {};
      if (paystackSecretKey) apiKeys.paystack_secret_key = paystackSecretKey;
      if (paystackSecretKey2) apiKeys.paystack_secret_key_2 = paystackSecretKey2;
      if (systemeioApiKey) apiKeys.systemeio_api_key = systemeioApiKey;
      if (ghlPitKey) apiKeys.ghl_pit_key = ghlPitKey;
      if (webinarkitApiKey) apiKeys.webinarkit_api_key = webinarkitApiKey;
      if (metaAdsAccountId) apiKeys.meta_ads_account_id = metaAdsAccountId;
      if (facebookPageId) apiKeys.facebook_page_id = facebookPageId;
      if (instagramAccountId) apiKeys.instagram_account_id = instagramAccountId;

      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          subtitle: subtitle.trim() || null,
          has_paystack: hasPaystack,
          has_meta_ads: hasMetaAds,
          has_ghl: hasGhl,
          has_systemeio: hasSystemeio,
          has_webinarkit: hasWebinarkit,
          paystack_account: paystackAccount || null,
          ghl_account: ghlAccount || null,
          windsor_facebook_account: windsorFacebookAccount || null,
          windsor_instagram_account: windsorInstagramAccount || null,
          api_keys: apiKeys,
          membership_amounts: membershipAmounts || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create client");
        setSaving(false);
        return;
      }

      router.push(`/dashboard/${data.slug}`);
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  }

  const anyServiceEnabled = hasPaystack || hasMetaAds || hasGhl || hasSystemeio || hasWebinarkit;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAF7F2" }}>
      <header
        className="w-full text-white px-6 py-8 md:px-10"
        style={{
          background: "linear-gradient(135deg, #4A1942 0%, #8B3A62 50%, #C4956A 100%)",
        }}
      >
        <div className="max-w-3xl mx-auto">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to All Clients
          </Link>
          <p className="font-serif text-xl font-bold">Club She Is.</p>
          <h1 className="font-serif text-3xl font-bold mt-4">Create New Client</h1>
          <p className="text-white/70 text-sm mt-1">
            Add a new client to the reporting dashboard
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 md:px-10 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h2 className="font-serif text-lg font-semibold text-gray-900">Basic Information</h2>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Client Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Club She Is"
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1942]/20 focus:border-[#4A1942]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Slug <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                URL-friendly identifier. Auto-generated from name, but you can edit it.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">/dashboard/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="client-slug"
                  required
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A1942]/20 focus:border-[#4A1942]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Subtitle
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Appears on the report header. Leave blank for default.
              </p>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Monthly Performance Report — Meta Ads · Email Marketing · Social Media"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1942]/20 focus:border-[#4A1942]"
              />
            </div>
          </section>

          {/* Service Toggles */}
          <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h2 className="font-serif text-lg font-semibold text-gray-900">Data Sources</h2>
            <p className="text-xs text-gray-500">
              Enable the platforms this client uses. This controls which dashboard tabs and sync jobs are active.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Paystack", value: hasPaystack, setter: setHasPaystack, desc: "Subscriptions & revenue" },
                { label: "Meta Ads", value: hasMetaAds, setter: setHasMetaAds, desc: "Facebook & Instagram ads" },
                { label: "GoHighLevel (Ghutte)", value: hasGhl, setter: setHasGhl, desc: "CRM contacts & revenue" },
                { label: "Systeme.io", value: hasSystemeio, setter: setHasSystemeio, desc: "Funnels & contacts" },
                { label: "WebinarKit", value: hasWebinarkit, setter: setHasWebinarkit, desc: "Webinar registrations" },
              ].map((toggle) => (
                <label
                  key={toggle.label}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    toggle.value
                      ? "border-[#4A1942]/30 bg-[#4A1942]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={toggle.value}
                    onChange={(e) => toggle.setter(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#4A1942] focus:ring-[#4A1942]"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">{toggle.label}</span>
                    <p className="text-xs text-gray-500">{toggle.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Account IDs — shown conditionally */}
          {anyServiceEnabled && (
            <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
              <h2 className="font-serif text-lg font-semibold text-gray-900">Windsor Account IDs</h2>
              <p className="text-xs text-gray-500">
                These IDs map to Windsor.ai data source accounts.
              </p>

              {hasPaystack && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Paystack Windsor Account Number
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Account number in Windsor (1, 2, 3, or 4)</p>
                  <input
                    type="text"
                    value={paystackAccount}
                    onChange={(e) => setPaystackAccount(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A1942]/20 focus:border-[#4A1942]"
                  />
                </div>
              )}

              {hasGhl && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    GHL Location ID
                  </label>
                  <p className="text-xs text-gray-500 mb-2">GoHighLevel location identifier</p>
                  <input
                    type="text"
                    value={ghlAccount}
                    onChange={(e) => setGhlAccount(e.target.value)}
                    placeholder="e.g. OgSu08WcrumYq4ZHcoHp"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A1942]/20 focus:border-[#4A1942]"
                  />
                </div>
              )}

              {hasMetaAds && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Windsor Facebook Account ID
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Facebook ads account used in Windsor.ai</p>
                  <input
                    type="text"
                    value={windsorFacebookAccount}
                    onChange={(e) => setWindsorFacebookAccount(e.target.value)}
                    placeholder="e.g. 956456447068702"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A1942]/20 focus:border-[#4A1942]"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Windsor Instagram Account ID
                </label>
                <p className="text-xs text-gray-500 mb-2">Instagram account used in Windsor.ai</p>
                <input
                  type="text"
                  value={windsorInstagramAccount}
                  onChange={(e) => setWindsorInstagramAccount(e.target.value)}
                  placeholder="e.g. 17841449119247616"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A1942]/20 focus:border-[#4A1942]"
                />
              </div>
            </section>
          )}

          {/* API Keys — shown conditionally */}
          {anyServiceEnabled && (
            <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
              <h2 className="font-serif text-lg font-semibold text-gray-900">API Keys</h2>
              <p className="text-xs text-gray-500">
                Keys are stored securely and used server-side only during data syncs.
              </p>

              {hasPaystack && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1">
                      Paystack Secret Key (Primary)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Primary Paystack account for subscriptions and revenue</p>
                    <input
                      type="password"
                      value={paystackSecretKey}
                      onChange={(e) => setPaystackSecretKey(e.target.value)}
                      placeholder="sk_live_..."
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A1942]/20 focus:border-[#4A1942]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1">
                      Paystack Secret Key (Secondary)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Optional — if this client has a second Paystack account</p>
                    <input
                      type="password"
                      value={paystackSecretKey2}
                      onChange={(e) => setPaystackSecretKey2(e.target.value)}
                      placeholder="sk_live_... (optional)"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A1942]/20 focus:border-[#4A1942]"
                    />
                  </div>
                </>
              )}

              {hasSystemeio && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Systeme.io API Key
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Used to pull contacts, tags, and traffic sources</p>
                  <input
                    type="password"
                    value={systemeioApiKey}
                    onChange={(e) => setSystemeioApiKey(e.target.value)}
                    placeholder="Your Systeme.io API key"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A1942]/20 focus:border-[#4A1942]"
                  />
                </div>
              )}

              {hasGhl && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    GHL PIT Key
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Private Integration Token for GoHighLevel API access</p>
                  <input
                    type="password"
                    value={ghlPitKey}
                    onChange={(e) => setGhlPitKey(e.target.value)}
                    placeholder="pit-..."
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A1942]/20 focus:border-[#4A1942]"
                  />
                </div>
              )}

              {hasWebinarkit && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    WebinarKit API Key
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Used to pull webinar registrations and attendance data</p>
                  <input
                    type="password"
                    value={webinarkitApiKey}
                    onChange={(e) => setWebinarkitApiKey(e.target.value)}
                    placeholder="Your WebinarKit API key"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A1942]/20 focus:border-[#4A1942]"
                  />
                </div>
              )}

              {hasMetaAds && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Meta Ads Account ID
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Facebook/Instagram Ads account ID</p>
                  <input
                    type="text"
                    value={metaAdsAccountId}
                    onChange={(e) => setMetaAdsAccountId(e.target.value)}
                    placeholder="e.g. 956456447068702"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A1942]/20 focus:border-[#4A1942]"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Facebook Page ID
                </label>
                <p className="text-xs text-gray-500 mb-2">For organic reach and engagement data</p>
                <input
                  type="text"
                  value={facebookPageId}
                  onChange={(e) => setFacebookPageId(e.target.value)}
                  placeholder="e.g. 100857922763752"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A1942]/20 focus:border-[#4A1942]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Instagram Account ID
                </label>
                <p className="text-xs text-gray-500 mb-2">For reach, followers, and engagement data</p>
                <input
                  type="text"
                  value={instagramAccountId}
                  onChange={(e) => setInstagramAccountId(e.target.value)}
                  placeholder="e.g. 17841449119247616"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A1942]/20 focus:border-[#4A1942]"
                />
              </div>
            </section>
          )}

          {/* Membership Config */}
          {hasPaystack && (
            <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
              <h2 className="font-serif text-lg font-semibold text-gray-900">Membership Config</h2>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Membership Amounts
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Comma-separated amounts (in ZAR) that count as active memberships. Used when counting subscribers from Paystack data.
                </p>
                <input
                  type="text"
                  value={membershipAmounts}
                  onChange={(e) => setMembershipAmounts(e.target.value)}
                  placeholder="e.g. 149,349"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A1942]/20 focus:border-[#4A1942]"
                />
              </div>
            </section>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || !name.trim() || !slug.trim()}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-[#4A1942] text-white font-semibold text-sm hover:bg-[#3a1335] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              {saving ? "Creating Client..." : "Create Client"}
            </button>
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
