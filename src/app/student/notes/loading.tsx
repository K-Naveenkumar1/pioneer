export default function Loading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="space-y-2">
                <div className="h-10 w-56 bg-zinc-800/60 rounded-xl" />
                <div className="h-4 w-72 bg-zinc-800/40 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-48 bg-zinc-900/60 border border-zinc-800/50 rounded-2xl" />
                <div className="h-48 bg-zinc-900/60 border border-zinc-800/50 rounded-2xl" />
                <div className="h-48 bg-zinc-900/60 border border-zinc-800/50 rounded-2xl" />
                <div className="h-48 bg-zinc-900/60 border border-zinc-800/50 rounded-2xl" />
            </div>
        </div>
    )
}
