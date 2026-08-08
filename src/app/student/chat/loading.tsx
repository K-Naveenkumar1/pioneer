export default function Loading() {
    return (
        <div className="space-y-4 flex flex-col h-[calc(100vh-7.2rem)] w-full">
            {/* Header */}
            <div className="flex-shrink-0 pl-1.5 space-y-2">
                <div className="skeleton-shimmer h-12 w-64 rounded-xl" />
                <div className="skeleton-shimmer h-3.5 w-96 rounded-lg" />
            </div>
            {/* Chat box */}
            <div className="flex-1 bg-[#121212] rounded-2xl flex flex-col overflow-hidden">
                <div className="flex-1 p-6 space-y-4 overflow-hidden">
                    {[...Array(7)].map((_, i) => (
                        <div key={i} className={`flex items-end gap-3 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}>
                            <div className="skeleton-shimmer h-8 w-8 rounded-full shrink-0" />
                            <div className={`space-y-1 max-w-[60%] ${i % 2 === 0 ? "" : "items-end flex flex-col"}`}>
                                <div className="skeleton-shimmer h-3 w-20 rounded" />
                                <div className="skeleton-shimmer h-10 w-48 rounded-2xl" />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="border-t border-zinc-800 p-4 flex gap-3">
                    <div className="skeleton-shimmer flex-1 h-10 rounded-xl" />
                    <div className="skeleton-shimmer h-10 w-10 rounded-xl" />
                </div>
            </div>
        </div>
    )
}
