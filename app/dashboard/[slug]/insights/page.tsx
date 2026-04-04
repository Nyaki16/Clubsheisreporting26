import { InsightsContent } from "./insights-content";

export default async function InsightsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <InsightsContent slug={slug} />;
}
