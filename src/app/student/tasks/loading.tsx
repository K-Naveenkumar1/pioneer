export default function Loading() {
    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <div className="skeleton-shimmer h-12 w-56 rounded-xl" />
                <div className="skeleton-shimmer h-3.5 w-72 rounded-lg" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="glass-effect rounded-2xl p-4 flex flex-col gap-2">
                        <div className="skeleton-shimmer h-3 w-20 rounded" />
                        <div className="skeleton-shimmer h-7 w-12 rounded-lg" />
                    </div>
                ))}
            </div>
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="glass-effect rounded-2xl p-5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="skeleton-shimmer h-5 w-5 rounded" />
                            <div className="flex-1 space-y-2">
                                <div className="skeleton-shimmer h-4 w-48 rounded" />
                                <div className="skeleton-shimmer h-3 w-32 rounded" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="skeleton-shimmer h-6 w-20 rounded-md" />
                            <div className="skeleton-shimmer h-5 w-5 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}