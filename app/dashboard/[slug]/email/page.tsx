import { EmailContent } from "./email-content";

export default async function EmailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <EmailContent slug={slug} />;
}
