import { SocialContent } from "./social-content";

export default async function SocialPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SocialContent slug={slug} />;
}
