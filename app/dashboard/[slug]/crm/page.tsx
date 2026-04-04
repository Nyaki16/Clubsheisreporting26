import { CRMContent } from "./crm-content";

export default async function CRMPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CRMContent slug={slug} />;
}
