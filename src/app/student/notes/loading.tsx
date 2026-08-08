export default function Loading() {
    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <div className="skeleton-shimmer h-12 w-52 rounded-xl" />
                <div className="skeleton-shimmer h-3.5 w-80 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar card */}
                <div className="bg-[#121212] rounded-2xl p-6 flex flex-col gap-4 min-h-[400px]">
                    <div className="skeleton-shimmer h-5 w-32 rounded" />
                    <div className="space-y-2 flex-1">
                        <div className="grid grid-cols-7 gap-1">
                            {[...Array(7)].map((_, i) => (
                                <div key={i} className="skeleton-shimmer h-6 rounded" />
                            ))}
                        </div>
                        {[...Array(5)].map((_, w) => (
                            <div key={w} className="grid grid-cols-7 gap-1">
                                {[...Array(7)].map((_, d) => (
                                    <div key={d} className="skeleton-shimmer h-8 rounded-lg" />
                                ))}
                            </div>
                        ))}
                    </div>
                    <div className="skeleton-shimmer h-9 w-full rounded-xl" />
                </div>
                {/* Editor card */}
                <div className="bg-[#121212] rounded-2xl p-6 flex flex-col gap-4 min-h-[400px]">
                    <div className="flex justify-between">
                        <div className="skeleton-shimmer h-5 w-28 rounded" />
                        <div className="skeleton-shimmer h-5 w-16 rounded" />
                    </div>
                    <div className="skeleton-shimmer flex-1 rounded-xl min-h-[280px]" />
                    <div className="flex gap-2">
                        <div className="skeleton-shimmer h-9 flex-1 rounded-xl" />
                        <div className="skeleton-shimmer h-9 w-9 rounded-xl" />
                    </div>
                </div>
                {/* Notes list card */}
                <div className="bg-[#121212] rounded-2xl p-6 flex flex-col gap-3 min-h-[400px]">
                    <div className="skeleton-shimmer h-5 w-28 rounded" />
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 py-2 border-b border-zinc-800/40">
                            <div className="skeleton-shimmer h-4 w-4 rounded" />
                            <div className="skeleton-shimmer h-3 flex-1 rounded" />
                            <div className="skeleton-shimmer h-3 w-12 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}