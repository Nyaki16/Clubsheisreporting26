import { ReportContent } from "./report-content";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ReportContent slug={slug} />;
}
