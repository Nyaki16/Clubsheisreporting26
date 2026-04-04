import { seedDemoData } from "@/lib/sync/seed";

export async function POST() {
  try {
    const result = await seedDemoData();
    return Response.json(result);
  } catch (e) {
    console.error("Seed error:", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
