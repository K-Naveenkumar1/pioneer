export default function Loading() {
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="space-y-2">
                <div className="skeleton-shimmer h-12 w-60 rounded-xl" />
                <div className="skeleton-shimmer h-3.5 w-80 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 flex flex-col gap-4">
                    {/* Timer card */}
                    <div className="bg-[#121212] rounded-2xl p-5 flex flex-col gap-4 min-h-[200px]">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <div className="skeleton-shimmer h-8 w-36 rounded-lg" />
                                <div className="skeleton-shimmer h-3 w-24 rounded" />
                            </div>
                            <div className="skeleton-shimmer h-8 w-32 rounded-xl" />
                        </div>
                        <div className="flex justify-center items-center gap-2 py-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className={`skeleton-shimmer rounded-xl ${i === 2 ? "h-8 w-4" : "h-16 w-12 md:h-20 md:w-16"}`} />
                            ))}
                        </div>
                        <div className="skeleton-shimmer h-12 w-full rounded-xl mt-auto" />
                    </div>
                    {/* Progress card */}
                    <div className="bg-[#121212] rounded-2xl p-5 flex flex-col gap-4">
                        <div className="skeleton-shimmer h-5 w-32 rounded" />
                        <div className="skeleton-shimmer h-4 w-full rounded-full" />
                        <div className="grid grid-cols-3 gap-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex flex-col gap-1.5">
                                    <div className="skeleton-shimmer h-3 w-20 rounded" />
                                    <div className="skeleton-shimmer h-6 w-16 rounded-lg" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/* Sessions log */}
                <div className="bg-[#121212] rounded-2xl p-5 flex flex-col gap-3">
                    <div className="skeleton-shimmer h-5 w-28 rounded" />
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800/40">
                            <div className="skeleton-shimmer h-3 w-20 rounded" />
                            <div className="skeleton-shimmer h-3 w-16 rounded" />
                            <div className="skeleton-shimmer h-3 w-12 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}