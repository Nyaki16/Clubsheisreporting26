"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientSlug = searchParams.get("client") || "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: clientSlug, password }),
      });
      const data = await res.json();
      if (data.success && data.slug) {
        router.push(`/dashboard/${data.slug}`);
      } else {
        setError(data.error || "Invalid credentials");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "linear-gradient(135deg, #4A1942 0%, #8B3A62 50%, #C4956A 100%)",
      }}
    >
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-lg">
        <div className="text-center mb-6">
          <h1 className="font-serif text-2xl font-bold text-[#4A1942]">Club She Is.</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to view your report</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <input
              type="text"
              value={clientSlug}
              readOnly={!!searchParams.get("client")}
              onChange={(e) => {
                // Only if no preset client
                if (!searchParams.get("client")) {
                  const url = new URL(window.location.href);
                  url.searchParams.set("client", e.target.value);
                  window.history.replaceState({}, "", url.toString());
                }
              }}
              placeholder="your-client-slug"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1942]/20 focus:border-[#4A1942]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A1942]/20 focus:border-[#4A1942]"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#4A1942] text-white font-semibold text-sm hover:bg-[#3a1335] transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "linear-gradient(135deg, #4A1942 0%, #8B3A62 50%, #C4956A 100%)" }} />}>
      <LoginForm />
    </Suspense>
  );
}
