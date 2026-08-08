export default function Loading() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="space-y-2">
                <div className="skeleton-shimmer h-12 w-72 rounded-xl" />
                <div className="skeleton-shimmer h-3.5 w-80 rounded-lg" />
            </div>
            {/* Lobby card */}
            <div className="glass-effect rounded-2xl p-10 flex flex-col items-center gap-6 min-h-[320px] justify-center">
                <div className="skeleton-shimmer h-20 w-20 rounded-full" />
                <div className="space-y-3 text-center w-full flex flex-col items-center">
                    <div className="skeleton-shimmer h-7 w-64 rounded-xl" />
                    <div className="skeleton-shimmer h-4 w-80 rounded-lg" />
                    <div className="skeleton-shimmer h-4 w-56 rounded-lg" />
                </div>
                <div className="skeleton-shimmer h-10 w-40 rounded-xl" />
            </div>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="glass-effect rounded-2xl p-4 flex flex-col items-center gap-2">
                        <div className="skeleton-shimmer h-4 w-16 rounded" />
                        <div className="skeleton-shimmer h-8 w-12 rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    )
}
