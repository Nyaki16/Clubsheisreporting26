export function DashboardFooter({ lastUpdated }: { lastUpdated?: string }) {
  return (
    <footer className="text-center py-6 text-xs text-gray-400">
      Client Reporting Dashboard — Last updated {lastUpdated || new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}
    </footer>
  );
}
