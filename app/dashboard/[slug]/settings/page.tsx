import { SettingsContent } from "./settings-content";

export default async function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SettingsContent slug={slug} />;
}
