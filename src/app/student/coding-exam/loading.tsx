export default function Loading() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="space-y-2">
                <div className="skeleton-shimmer h-12 w-72 rounded-xl" />
                <div className="skeleton-shimmer h-3.5 w-80 rounded-lg" />
            </div>
            {/* 2-col coding exam card grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="glass-effect rounded-2xl p-6 flex flex-col justify-between space-y-4 min-h-[200px]">
                        <div className="flex justify-between items-start">
                            <div className="skeleton-shimmer h-5 w-48 rounded-lg" />
                            <div className="skeleton-shimmer h-6 w-20 rounded-md" />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="skeleton-shimmer h-4 w-20 rounded" />
                            <div className="skeleton-shimmer h-4 w-24 rounded" />
                        </div>
                        <div className="skeleton-shimmer h-3 w-full rounded" />
                        <div className="skeleton-shimmer h-3 w-3/4 rounded" />
                        <div className="skeleton-shimmer h-9 w-full rounded-xl" />
                    </div>
                ))}
            </div>
        </div>
    )
}
