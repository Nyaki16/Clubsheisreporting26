import { MetaContent } from "./meta-content";

export default async function MetaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <MetaContent slug={slug} />;
}
