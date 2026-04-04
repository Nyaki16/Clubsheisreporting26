import { NextMonthContent } from "./next-month-content";

export default async function NextMonthPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <NextMonthContent slug={slug} />;
}
