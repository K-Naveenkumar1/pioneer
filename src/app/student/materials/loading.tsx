export default function Loading() {
    return (
        <div className="space-y-8 select-text">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-2">
                    <div className="skeleton-shimmer h-12 w-56 rounded-xl" />
                    <div className="skeleton-shimmer h-3.5 w-96 rounded-lg" />
                </div>
                <div className="skeleton-shimmer h-10 w-10 rounded-xl" />
            </div>
            {/* 3-col material card grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="glass-effect rounded-2xl p-5 flex flex-col justify-between space-y-4 min-h-[180px]">
                        <div className="space-y-2">
                            <div className="skeleton-shimmer h-5 w-40 rounded-lg" />
                            <div className="skeleton-shimmer h-3 w-full rounded" />
                            <div className="skeleton-shimmer h-3 w-3/4 rounded" />
                        </div>
                        <div className="flex items-center justify-between pt-2">
                            <div className="skeleton-shimmer h-4 w-20 rounded" />
                            <div className="skeleton-shimmer h-8 w-24 rounded-xl" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
