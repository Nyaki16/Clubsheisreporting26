export function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
            <div className="h-7 w-20 bg-gray-200 rounded mb-2" />
            <div className="h-5 w-32 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="h-4 w-48 bg-gray-200 rounded mb-4" />
        <div className="h-64 bg-gray-100 rounded" />
      </div>
    </div>
  );
}
