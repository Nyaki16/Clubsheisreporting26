"use client";

import { Settings } from "lucide-react";

export function SettingsContent({ slug }: { slug: string }) {
  void slug;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-xl font-semibold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mb-4">Dashboard configuration and preferences.</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
        <Settings className="mx-auto mb-3 text-gray-300" size={40} />
        <p className="text-gray-400 text-sm">Settings will be available in a future update.</p>
      </div>
    </div>
  );
}
