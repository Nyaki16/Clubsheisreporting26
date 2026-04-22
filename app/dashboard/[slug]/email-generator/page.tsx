import { EmailGeneratorContent } from "./email-generator-content";

export default async function EmailGeneratorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <EmailGeneratorContent slug={slug} />;
}
