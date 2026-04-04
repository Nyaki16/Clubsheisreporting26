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
