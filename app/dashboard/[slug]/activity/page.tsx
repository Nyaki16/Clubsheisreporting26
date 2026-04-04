import { ActivityContent } from "./activity-content";

export default async function ActivityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ActivityContent slug={slug} />;
}
