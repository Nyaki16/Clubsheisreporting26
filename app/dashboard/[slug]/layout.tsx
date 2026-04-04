import { DashboardShell } from "./dashboard-shell";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <DashboardShell slug={slug}>{children}</DashboardShell>;
}
