export function EmptyState({ message }: { message?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
      <p className="text-gray-400 text-sm">{message || "No data sources connected for this section."}</p>
    </div>
  );
}
