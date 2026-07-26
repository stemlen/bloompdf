export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-5 py-10 space-y-10">
      {/* Header skeleton */}
      <div className="space-y-3">
        <div className="h-7 w-64 bg-[#E5E5E3] rounded-lg animate-pulse" />
        <div className="h-4 w-96 bg-[#E5E5E3] rounded animate-pulse" />
      </div>

      {/* Tool grid skeletons */}
      {[1, 2].map((s) => (
        <div key={s} className="space-y-4">
          <div className="h-5 w-36 bg-[#E5E5E3] rounded animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 bg-[#E5E5E3] rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
