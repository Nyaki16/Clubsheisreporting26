import { OverviewContent } from "./overview-content";

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <OverviewContent slug={slug} />;
}
