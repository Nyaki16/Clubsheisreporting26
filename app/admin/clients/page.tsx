"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, RefreshCw, Eye, EyeOff, Mail, Link2, ArrowLeft, Shield, ShieldOff } from "lucide-react";

interface ClientAccess {
  id: string;
  name: string;
  slug: string;
  password: string | null;
  isEnabled: boolean;
  shareToken: string | null;
  lastLogin: string | null;
}

export default function ClientAccessPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [emailModal, setEmailModal] = useState<ClientAccess | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    const res = await fetch("/api/client-access");
    if (res.status === 401) {
      router.push("/admin");
      return;
    }
    const data = await res.json();
    setClients(data.clients || []);
    setLoading(false);
  }, [router]);

  useEffect(() => { loadClients(); }, [loadClients]);

  async function handleAction(clientId: string, action: string, password?: string) {
    setActionLoading(`${clientId}-${action}`);
    await fetch("/api/client-access", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, action, password }),
    });
    await loadClients();
    setActionLoading(null);
  }

  function getLoginUrl(client: ClientAccess) {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/login?client=${client.slug}`;
  }

  function getDirectLink(client: ClientAccess) {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/login?client=${client.slug}&token=${client.shareToken}`;
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function generateEmailCopy(client: ClientAccess) {
    const loginUrl = getLoginUrl(client);
    return `Hi ${client.name.split(" ")[0]},

Your monthly performance report is ready to view on your Club She Is reporting dashboard.

Here's how to access it:

1. Go to: ${loginUrl}
2. Password: ${client.password}

You'll find your complete performance breakdown including revenue, social media, ads, and strategic recommendations.

If you have any questions about the report, just reply to this email.

Warm regards,
Club She Is Team`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FAF7F2" }}>
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAF7F2" }}>
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/dashboard")} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-serif text-2xl font-bold text-[#4A1942]">Client Access</h1>
              <p className="text-sm text-gray-500 mt-1">Manage dashboard access for your clients</p>
            </div>
          </div>
        </div>

        {/* Client Cards */}
        <div className="space-y-4">
          {clients.map((client) => (
            <div key={client.id} className={`bg-white rounded-xl border ${client.isEnabled ? "border-gray-200" : "border-red-200 bg-red-50/30"} p-6`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${client.isEnabled ? "bg-[#4A1942]" : "bg-gray-400"}`}>
                    {client.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{client.name}</h3>
                    <p className="text-xs text-gray-500">{client.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {client.isEnabled ? (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">Active</span>
                  ) : (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">Disabled</span>
                  )}
                  <button
                    onClick={() => handleAction(client.id, "toggle")}
                    disabled={actionLoading === `${client.id}-toggle`}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                    title={client.isEnabled ? "Disable access" : "Enable access"}
                  >
                    {client.isEnabled ? <Shield size={16} /> : <ShieldOff size={16} />}
                  </button>
                </div>
              </div>

              {client.isEnabled && (
                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Password */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-[0.65rem] uppercase tracking-wider text-gray-400 font-medium mb-2">Password</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-gray-900 flex-1">
                        {showPasswords[client.id] ? client.password : "••••••••"}
                      </code>
                      <button
                        onClick={() => setShowPasswords((p) => ({ ...p, [client.id]: !p[client.id] }))}
                        className="p-1.5 rounded hover:bg-gray-200 text-gray-500"
                      >
                        {showPasswords[client.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(client.password || "", `pw-${client.id}`)}
                        className="p-1.5 rounded hover:bg-gray-200 text-gray-500"
                      >
                        {copiedId === `pw-${client.id}` ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                      <button
                        onClick={() => {
                          const newPw = prompt("Enter new password (leave blank for random):");
                          if (newPw !== null) handleAction(client.id, "resetPassword", newPw || undefined);
                        }}
                        disabled={actionLoading === `${client.id}-resetPassword`}
                        className="p-1.5 rounded hover:bg-gray-200 text-gray-500"
                        title="Reset password"
                      >
                        <RefreshCw size={14} className={actionLoading === `${client.id}-resetPassword` ? "animate-spin" : ""} />
                      </button>
                    </div>
                  </div>

                  {/* Login Link */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-[0.65rem] uppercase tracking-wider text-gray-400 font-medium mb-2">Login Link</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-gray-700 flex-1 truncate">{getLoginUrl(client)}</code>
                      <button
                        onClick={() => copyToClipboard(getLoginUrl(client), `link-${client.id}`)}
                        className="p-1.5 rounded hover:bg-gray-200 text-gray-500"
                      >
                        {copiedId === `link-${client.id}` ? <Check size={14} className="text-emerald-500" /> : <Link2 size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Direct Access Link (no password needed) */}
                  <div className="bg-amber-50 rounded-lg p-4">
                    <p className="text-[0.65rem] uppercase tracking-wider text-amber-600 font-medium mb-2">Direct Link (no password)</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-gray-700 flex-1 truncate">{getDirectLink(client)}</code>
                      <button
                        onClick={() => copyToClipboard(getDirectLink(client), `direct-${client.id}`)}
                        className="p-1.5 rounded hover:bg-amber-100 text-amber-600"
                      >
                        {copiedId === `direct-${client.id}` ? <Check size={14} className="text-emerald-500" /> : <Link2 size={14} />}
                      </button>
                      <button
                        onClick={() => handleAction(client.id, "regenerateToken")}
                        disabled={actionLoading === `${client.id}-regenerateToken`}
                        className="p-1.5 rounded hover:bg-amber-100 text-amber-600"
                        title="Regenerate link"
                      >
                        <RefreshCw size={14} className={actionLoading === `${client.id}-regenerateToken` ? "animate-spin" : ""} />
                      </button>
                    </div>
                  </div>

                  {/* Send Email */}
                  <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[0.65rem] uppercase tracking-wider text-gray-400 font-medium mb-1">Share via Email</p>
                      <p className="text-xs text-gray-500">Copy login details + email template</p>
                    </div>
                    <button
                      onClick={() => setEmailModal(client)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#4A1942] text-white rounded-lg text-xs font-medium hover:bg-[#3a1335]"
                    >
                      <Mail size={14} /> Email Copy
                    </button>
                  </div>
                </div>
              )}

              {client.lastLogin && (
                <p className="mt-3 text-xs text-gray-400">
                  Last login: {new Date(client.lastLogin).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Email Copy Modal */}
      {emailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEmailModal(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Email Copy — {emailModal.name}</h3>
              <button onClick={() => setEmailModal(null)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-[0.65rem] uppercase tracking-wider text-gray-400 font-medium mb-2">Subject Line</p>
              <p className="text-sm text-gray-900">Your Monthly Performance Report is Ready</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-[0.65rem] uppercase tracking-wider text-gray-400 font-medium mb-2">Email Body</p>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{generateEmailCopy(emailModal)}</pre>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  copyToClipboard(generateEmailCopy(emailModal), "email-body");
                  setTimeout(() => setEmailModal(null), 500);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#4A1942] text-white rounded-lg text-sm font-medium hover:bg-[#3a1335]"
              >
                {copiedId === "email-body" ? <Check size={16} /> : <Copy size={16} />}
                {copiedId === "email-body" ? "Copied!" : "Copy Email Body"}
              </button>
              <button
                onClick={() => {
                  const subject = encodeURIComponent("Your Monthly Performance Report is Ready");
                  const body = encodeURIComponent(generateEmailCopy(emailModal));
                  window.open(`mailto:?subject=${subject}&body=${body}`);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                <Mail size={16} /> Open in Mail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
