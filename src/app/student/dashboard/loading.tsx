// Loading skeleton — shown instantly by Next.js while server data loads.
export default function StudentDashboardLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="space-y-2">
                <div className="h-10 w-64 bg-zinc-800/60 rounded-xl" />
                <div className="h-4 w-80 bg-zinc-800/40 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="h-32 bg-zinc-900/60 border border-zinc-800/50 rounded-2xl" />
                <div className="h-32 bg-zinc-900/60 border border-zinc-800/50 rounded-2xl" />
                <div className="h-32 bg-zinc-900/60 border border-zinc-800/50 rounded-2xl" />
                <div className="h-32 bg-zinc-900/60 border border-zinc-800/50 rounded-2xl" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64 bg-zinc-900/60 border border-zinc-800/50 rounded-2xl" />
                <div className="h-64 bg-zinc-900/60 border border-zinc-800/50 rounded-2xl" />
            </div>
        </div>
    )
}
