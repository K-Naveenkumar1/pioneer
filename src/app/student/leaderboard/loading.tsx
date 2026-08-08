export default function Loading() {
    return (
        <div className="space-y-10">
            <div className="space-y-2">
                <div className="skeleton-shimmer h-12 w-48 rounded-xl" />
                <div className="skeleton-shimmer h-3.5 w-96 rounded-lg" />
            </div>
            {/* Podium */}
            <div className="flex justify-center items-end gap-4 pt-4 pb-2">
                <div className="flex flex-col items-center gap-3 flex-1">
                    <div className="skeleton-shimmer h-16 w-16 rounded-full" />
                    <div className="skeleton-shimmer h-3 w-20 rounded" />
                    <div className="skeleton-shimmer h-24 w-full rounded-t-xl" />
                </div>
                <div className="flex flex-col items-center gap-3 flex-1">
                    <div className="skeleton-shimmer h-20 w-20 rounded-full" />
                    <div className="skeleton-shimmer h-3 w-24 rounded" />
                    <div className="skeleton-shimmer h-36 w-full rounded-t-xl" />
                </div>
                <div className="flex flex-col items-center gap-3 flex-1">
                    <div className="skeleton-shimmer h-16 w-16 rounded-full" />
                    <div className="skeleton-shimmer h-3 w-20 rounded" />
                    <div className="skeleton-shimmer h-16 w-full rounded-t-xl" />
                </div>
            </div>
            {/* Rank list */}
            <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="glass-effect rounded-2xl p-4 flex items-center gap-4">
                        <div className="skeleton-shimmer h-5 w-6 rounded" />
                        <div className="skeleton-shimmer h-10 w-10 rounded-full shrink-0" />
                        <div className="flex-1 space-y-1.5">
                            <div className="skeleton-shimmer h-4 w-36 rounded" />
                            <div className="skeleton-shimmer h-3 w-20 rounded" />
                        </div>
                        <div className="skeleton-shimmer h-5 w-16 rounded" />
                    </div>
                ))}
            </div>
        </div>
    )
}