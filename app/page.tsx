import Link from "next/link";

export default function Home() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #4A1942 0%, #8B3A62 50%, #C4956A 100%)",
      }}
    >
      <div className="text-center text-white px-6">
        <h1 className="font-serif text-5xl font-bold mb-4">Club She Is.</h1>
        <p className="text-white/70 text-lg mb-8">Client Reporting Dashboard</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-white text-[#4A1942] font-semibold text-sm hover:bg-white/90 transition-colors"
          >
            Client Login
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white/30 text-white font-semibold text-sm hover:bg-white/10 transition-colors"
          >
            Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
}
