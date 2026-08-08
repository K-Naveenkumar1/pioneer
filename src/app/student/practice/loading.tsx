export default function Loading() {
    return (
        <div className="h-[calc(100vh-7rem)] flex flex-col gap-4">
            {/* Header row */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div className="space-y-2">
                    <div className="skeleton-shimmer h-10 w-52 rounded-xl" />
                    <div className="skeleton-shimmer h-3.5 w-72 rounded-lg" />
                </div>
                <div className="flex items-center gap-2">
                    <div className="skeleton-shimmer h-8 w-24 rounded-lg" />
                    <div className="skeleton-shimmer h-8 w-8 rounded-lg" />
                </div>
            </div>
            {/* Editor + output split */}
            <div className="flex flex-col lg:flex-row gap-4 flex-1 overflow-hidden">
                {/* Code editor panel */}
                <div className="glass-effect rounded-2xl flex flex-col overflow-hidden flex-1">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between p-3 border-b border-zinc-800">
                        <div className="flex gap-1.5">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="skeleton-shimmer h-3 w-3 rounded-full" />
                            ))}
                        </div>
                        <div className="skeleton-shimmer h-4 w-24 rounded" />
                        <div className="skeleton-shimmer h-7 w-16 rounded-lg" />
                    </div>
                    {/* Line numbers + code area */}
                    <div className="flex flex-1 overflow-hidden">
                        <div className="w-10 bg-zinc-950/40 flex flex-col gap-1 p-2">
                            {[...Array(12)].map((_, i) => (
                                <div key={i} className="skeleton-shimmer h-4 w-5 rounded" />
                            ))}
                        </div>
                        <div className="flex-1 p-4 space-y-2">
                            {[80, 60, 100, 45, 70, 55, 90, 40, 65, 50, 75, 35].map((w, i) => (
                                <div key={i} className="skeleton-shimmer h-4 rounded" style={{ width: `${w}%` }} />
                            ))}
                        </div>
                    </div>
                </div>
                {/* Output / stdin panel */}
                <div className="lg:w-80 flex flex-col gap-4">
                    <div className="glass-effect rounded-2xl p-4 flex flex-col gap-3 flex-1">
                        <div className="skeleton-shimmer h-4 w-16 rounded" />
                        <div className="skeleton-shimmer flex-1 rounded-xl min-h-[120px]" />
                    </div>
                    <div className="glass-effect rounded-2xl p-4 flex flex-col gap-3 flex-1">
                        <div className="skeleton-shimmer h-4 w-20 rounded" />
                        <div className="skeleton-shimmer flex-1 rounded-xl min-h-[120px]" />
                    </div>
                </div>
            </div>
        </div>
    )
}
