import Link from "next/link";
import { getServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("is_active", true)
    .order("name");
  const clients = data || [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAF7F2" }}>
      <header
        className="w-full text-white px-6 py-8 md:px-10"
        style={{
          background: "linear-gradient(135deg, #4A1942 0%, #8B3A62 50%, #C4956A 100%)",
        }}
      >
        <div className="max-w-7xl mx-auto">
          <p className="font-serif text-xl font-bold">Club She Is.</p>
          <h1 className="font-serif text-3xl font-bold mt-4">All Clients</h1>
          <p className="text-white/70 text-sm mt-1">Select a client to view their dashboard</p>
        </div>
        <div className="max-w-7xl mx-auto mt-4">
          <Link
            href="/admin/clients"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Manage Client Access
          </Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 md:px-10 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/dashboard/${client.slug}`}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:border-[#8B3A62] hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: "#4A1942" }}
                />
                <h2 className="font-serif text-lg font-semibold text-gray-900 group-hover:text-[#4A1942]">
                  {client.name}
                </h2>
              </div>
              <p className="text-sm text-gray-500">/{client.slug}</p>
            </Link>
          ))}
          <Link
            href="/dashboard/new"
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-[#8B3A62] hover:bg-[#4A1942]/5 transition-all group flex flex-col items-center justify-center text-center min-h-[100px]"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-colors group-hover:bg-[#4A1942]/10"
              style={{ backgroundColor: "#FAF7F2" }}
            >
              <svg
                className="w-5 h-5 text-gray-400 group-hover:text-[#4A1942] transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h2 className="font-serif text-lg font-semibold text-gray-400 group-hover:text-[#4A1942] transition-colors">
              Add New Client
            </h2>
          </Link>
          {clients.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              No clients found. Run a data sync to populate.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
