export default function Loading() {
    return (
        <div className="space-y-4 select-none">
            {/* Header skeleton */}
            <div className="bg-transparent rounded-[20px] pb-2 pr-2 pl-2 pt-1 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                    <div className="skeleton-shimmer h-10 w-64 rounded-xl" />
                    <div className="skeleton-shimmer h-3.5 w-48 rounded-lg" />
                </div>
                <div className="skeleton-shimmer h-9 w-28 rounded-xl" />
            </div>

            {/* 4 stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-[#121212] rounded-[20px] p-6 flex flex-col justify-between min-h-[140px]">
                        <div className="space-y-2">
                            <div className="skeleton-shimmer h-3 w-24 rounded" />
                            <div className="skeleton-shimmer h-9 w-20 rounded-lg" />
                        </div>
                        <div className="skeleton-shimmer h-3 w-32 rounded mt-4" />
                    </div>
                ))}
            </div>

            {/* 2-column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-7 space-y-4">
                    <div className="bg-[#121212] rounded-[20px] p-6">
                        <div className="flex justify-between items-start pb-6">
                            <div className="space-y-2">
                                <div className="skeleton-shimmer h-3 w-20 rounded" />
                                <div className="skeleton-shimmer h-9 w-28 rounded-lg" />
                            </div>
                            <div className="skeleton-shimmer h-5 w-24 rounded-lg" />
                        </div>
                        <div className="skeleton-shimmer h-[200px] w-full rounded-xl" />
                    </div>
                    <div className="bg-[#121212] rounded-[20px] p-6">
                        <div className="flex justify-between items-start pb-6">
                            <div className="space-y-2">
                                <div className="skeleton-shimmer h-9 w-32 rounded-lg" />
                                <div className="skeleton-shimmer h-3 w-56 rounded" />
                            </div>
                            <div className="skeleton-shimmer h-5 w-20 rounded-lg" />
                        </div>
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4 border-b border-zinc-800/30 pb-3">
                                    <div className="skeleton-shimmer h-3.5 flex-1 rounded" />
                                    <div className="skeleton-shimmer h-3.5 w-14 rounded" />
                                    <div className="skeleton-shimmer h-5 w-16 rounded-full" />
                                    <div className="skeleton-shimmer h-3.5 w-10 rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-5 space-y-4">
                    <div className="bg-[#121212] rounded-[20px] p-6">
                        <div className="flex justify-between items-start pb-6">
                            <div className="space-y-2">
                                <div className="skeleton-shimmer h-9 w-28 rounded-lg" />
                                <div className="skeleton-shimmer h-3 w-44 rounded" />
                            </div>
                            <div className="skeleton-shimmer h-5 w-20 rounded-lg" />
                        </div>
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4 border-b border-zinc-800/30 pb-3">
                                    <div className="skeleton-shimmer h-3.5 flex-1 rounded" />
                                    <div className="skeleton-shimmer h-3.5 w-14 rounded" />
                                    <div className="skeleton-shimmer h-3.5 w-12 rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-[#121212] rounded-[20px] p-6 pb-11">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <div className="skeleton-shimmer h-3 w-28 rounded" />
                                <div className="skeleton-shimmer h-9 w-16 rounded-lg" />
                            </div>
                            <div className="skeleton-shimmer h-5 w-14 rounded-lg" />
                        </div>
                        <div className="skeleton-shimmer h-3 w-24 rounded mt-2" />
                        <div className="flex flex-col sm:flex-row items-center gap-6 mt-6">
                            <div className="skeleton-shimmer flex-1 w-full h-[140px] rounded-xl" />
                            <div className="w-full sm:w-[180px] space-y-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="flex items-center justify-between py-1 border-t border-zinc-900/60">
                                        <div className="flex items-center gap-2">
                                            <div className="skeleton-shimmer h-2 w-2 rounded-full" />
                                            <div className="skeleton-shimmer h-3 w-16 rounded" />
                                        </div>
                                        <div className="skeleton-shimmer h-3 w-8 rounded" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}