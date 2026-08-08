"use client"

import { getStudentLeaderboardAction, getStudentProfileDetails } from "@/actions/student-actions"
import GlassCard from "@/components/global/glass-card"
import { useEffect, useState } from "react"
import { toast } from "sonner"

function AnimatedScore({ value, delay = 0, duration = 1200 }: { value: number; delay?: number; duration?: number }) {
    const [count, setCount] = useState(0)

    useEffect(() => {
        let startTimestamp: number | null = null
        let animationFrameId: number

        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp
            const progress = Math.min((timestamp - startTimestamp - delay) / duration, 1)
            if (progress >= 0) {
                setCount(Math.floor(progress * value))
            }
            if (progress < 1) {
                animationFrameId = window.requestAnimationFrame(step)
            } else {
                setCount(value)
            }
        }

        const startTimeout = setTimeout(() => {
            animationFrameId = window.requestAnimationFrame(step)
        }, delay)

        return () => {
            clearTimeout(startTimeout)
            window.cancelAnimationFrame(animationFrameId)
        }
    }, [value, delay, duration])

    return <>{count}</>
}

export default function StudentLeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState<any[]>([])
    const [className, setClassName] = useState("Classroom")
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadLeaderboardData()
    }, [])

    const loadLeaderboardData = async () => {
        setLoading(true)
        const [profileRes, leaderboardRes] = await Promise.all([
            getStudentProfileDetails(),
            getStudentLeaderboardAction()
        ])

        if (profileRes.success) {
            setProfile(profileRes.profile)
        }
        if (leaderboardRes.success) {
            setLeaderboard(leaderboardRes.leaderboard || [])
            setClassName(leaderboardRes.className || "Classroom")
        } else {
            toast.error(leaderboardRes.error || "Failed to load leaderboard standings")
        }
        setLoading(false)
    }

    if (loading) {
        return (
            <div className="space-y-10">
                {/* Header */}
                <div className="space-y-2">
                    <div className="skeleton-shimmer h-12 w-48 rounded-xl" />
                    <div className="skeleton-shimmer h-3.5 w-96 rounded-lg" />
                </div>
                {/* Podium skeleton */}
                <div className="flex justify-center items-end gap-4 pt-4 pb-2">
                    {/* 2nd */}
                    <div className="flex flex-col items-center gap-3 flex-1">
                        <div className="skeleton-shimmer h-16 w-16 md:h-20 md:w-20 rounded-full" />
                        <div className="skeleton-shimmer h-3 w-20 rounded" />
                        <div className="skeleton-shimmer h-24 w-full rounded-t-xl" />
                    </div>
                    {/* 1st */}
                    <div className="flex flex-col items-center gap-3 flex-1">
                        <div className="skeleton-shimmer h-20 w-20 md:h-24 md:w-24 rounded-full" />
                        <div className="skeleton-shimmer h-3 w-24 rounded" />
                        <div className="skeleton-shimmer h-36 w-full rounded-t-xl" />
                    </div>
                    {/* 3rd */}
                    <div className="flex flex-col items-center gap-3 flex-1">
                        <div className="skeleton-shimmer h-16 w-16 md:h-20 md:w-20 rounded-full" />
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

    const podium = leaderboard.slice(0, 3)
    const rest = leaderboard.slice(3)

    return (
        <div className="space-y-10">
            {/* Header */}
            <div>
                <h1 className="text-5xl font-extrabold tracking-tight text-white pb-4">Leaderboard</h1>
                <p className="text-sm text-zinc-400">Class standings for {className}. Ranks are calculated by approved task marks (10 pts each) and exam scores.</p>
            </div>

            {leaderboard.length === 0 ? (
                <GlassCard className="p-8 text-center text-themeTextGrey text-sm border border-themeGrey">
                    No leaderboard standings available. Ask the admin to assign you to a class.
                </GlassCard>
            ) : (
                <div className="space-y-4">
                    {/* Modern 3D Step Podium */}
                    <div className="flex justify-center items-end gap-0 pt-4 pb-2 w-full mx-auto overflow-visible">
                        
                        {/* 2nd Place Column */}
                        {podium[1] && (
                            <div className="flex flex-col items-center flex-1 min-w-0 z-10">
                                {/* Student Info above the pillar */}
                                <div className="text-center space-y-3 mb-3.5 animate-skyline-info opacity-0 [animation-delay:150ms]">
                                    <div className="relative mx-auto w-fit">
                                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-zinc-800 flex items-center justify-center mx-auto shadow-md select-none overflow-hidden">
                                            {podium[1].avatar ? (
                                                podium[1].avatar.startsWith("/avatars/") || podium[1].avatar.startsWith("data:image/") ? (
                                                    <img src={podium[1].avatar} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-3xl leading-none">{podium[1].avatar}</span>
                                                )
                                            ) : (
                                                <span className="font-bold text-lg text-white select-none">
                                                    {(podium[1].name || "Student").substring(0, 1).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        {/* Overlapping Rank Badge */}
                                        <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] font-mono select-none bg-zinc-400 text-zinc-950">
                                            2
                                        </div>
                                        {/* Medal Badge */}
                                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-zinc-850 flex items-center justify-center text-sm shadow-md select-none">
                                            🥈
                                        </div>
                                    </div>
                                    <div className="px-0.5 mx-auto text-center flex flex-col items-center w-full">
                                        <p className="font-bold text-white text-xs md:text-sm text-center leading-tight whitespace-normal break-words w-full">{podium[1].name}</p>
                                        <span className="text-[10px] text-zinc-400 font-semibold font-mono mt-0.5 select-none uppercase">
                                            {podium[1].rollNo}
                                        </span>
                                    </div>
                                </div>
                                {/* The Pillar Block */}
                                <div className="w-full h-28 md:h-36 bg-[#1d1d20] border-t border-t-white/5 border-b-[6px] border-b-black/35 flex items-center justify-center relative shadow-lg origin-bottom animate-skyline-pillar [animation-delay:150ms]">
                                    {/* 3D Top Face */}
                                    <div 
                                        className="absolute -top-3 left-0 w-full h-3 bg-[#2a2a2d]" 
                                        style={{ clipPath: 'polygon(10px 0, 100% 0, 100% 100%, 0 100%)' }}
                                    />
                                    <span className="text-6xl md:text-8xl font-black text-white/5 font-mono select-none">
                                        <AnimatedScore value={podium[1].totalScore} delay={150} duration={1200} />
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* 1st Place Column */}
                        {podium[0] && (
                            <div className="flex flex-col items-center flex-1 min-w-0 z-20">
                                {/* Student Info above the pillar */}
                                <div className="text-center space-y-3 mb-3.5 animate-skyline-info opacity-0">
                                    <div className="relative mx-auto w-fit">
                                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-zinc-800 flex items-center justify-center mx-auto shadow-xl select-none overflow-hidden">
                                            {podium[0].avatar ? (
                                                podium[0].avatar.startsWith("/avatars/") || podium[0].avatar.startsWith("data:image/") ? (
                                                    <img src={podium[0].avatar} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-5xl leading-none">{podium[0].avatar}</span>
                                                )
                                            ) : (
                                                <span className="font-bold text-2xl text-white select-none">
                                                    {(podium[0].name || "Student").substring(0, 1).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        {/* Overlapping Rank Badge */}
                                        <div className="absolute -top-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs font-mono select-none bg-amber-500 text-white">
                                            1
                                        </div>
                                        {/* Medal Badge */}
                                        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-zinc-850 flex items-center justify-center text-base shadow-md select-none">
                                            🥇
                                        </div>
                                    </div>
                                    <div className="px-0.5 mx-auto text-center flex flex-col items-center w-full">
                                        <p className="font-extrabold text-white text-sm md:text-base text-center leading-tight whitespace-normal break-words w-full">{podium[0].name}</p>
                                        <span className="text-[10px] text-zinc-400 font-semibold font-mono mt-0.5 select-none uppercase">
                                            {podium[0].rollNo}
                                        </span>
                                    </div>
                                </div>
                                {/* The Pillar Block (highest) */}
                                <div className="w-full h-40 md:h-48 bg-[#242427] border-t border-t-white/10 border-b-[6px] border-b-black/35 flex items-center justify-center relative shadow-2xl origin-bottom animate-skyline-pillar">
                                    {/* 3D Top Face */}
                                    <div 
                                        className="absolute -top-3 left-0 w-[calc(100%+10px)] h-3 bg-[#36363a]" 
                                        style={{ clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)' }}
                                    />
                                    {/* 3D Right Side Face */}
                                    <div 
                                        className="absolute -top-3 -right-[10px] w-[10px] h-[calc(100%+12px)] bg-[#101012] z-10" 
                                        style={{ clipPath: 'polygon(0 12px, 100% 0, 100% calc(100% - 12px), 0 100%)' }}
                                    />
                                    <span className="text-7xl md:text-9xl font-black text-white/5 font-mono select-none">
                                        <AnimatedScore value={podium[0].totalScore} delay={0} duration={1200} />
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* 3rd Place Column */}
                        {podium[2] && (
                            <div className="flex flex-col items-center flex-1 min-w-0 z-10">
                                {/* Student Info above the pillar */}
                                <div className="text-center space-y-3 mb-3.5 animate-skyline-info opacity-0 [animation-delay:300ms]">
                                    <div className="relative mx-auto w-fit">
                                        <div className="w-14 h-14 md:w-18 md:h-18 rounded-full bg-zinc-800 flex items-center justify-center mx-auto shadow-md select-none overflow-hidden">
                                            {podium[2].avatar ? (
                                                podium[2].avatar.startsWith("/avatars/") || podium[2].avatar.startsWith("data:image/") ? (
                                                    <img src={podium[2].avatar} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-3xl leading-none">{podium[2].avatar}</span>
                                                )
                                            ) : (
                                                <span className="font-bold text-lg text-white select-none">
                                                    {(podium[2].name || "Student").substring(0, 1).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        {/* Overlapping Rank Badge */}
                                        <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] font-mono select-none bg-orange-500 text-white">
                                            3
                                        </div>
                                        {/* Medal Badge */}
                                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-zinc-850 flex items-center justify-center text-sm shadow-md select-none">
                                            🥉
                                        </div>
                                    </div>
                                    <div className="px-0.5 mx-auto text-center flex flex-col items-center w-full">
                                        <p className="font-bold text-white text-xs md:text-sm text-center leading-tight whitespace-normal break-words w-full">{podium[2].name}</p>
                                        <span className="text-[10px] text-zinc-400 font-semibold font-mono mt-0.5 select-none uppercase">
                                            {podium[2].rollNo}
                                        </span>
                                    </div>
                                </div>
                                {/* The Pillar Block (lowest) */}
                                <div className="w-full h-20 md:h-26 bg-[#18181b] border-t border-t-white/5 border-b-[6px] border-b-black/35 flex items-center justify-center relative shadow-md origin-bottom animate-skyline-pillar [animation-delay:300ms]">
                                    {/* 3D Top Face */}
                                    <div 
                                        className="absolute -top-3 left-0 w-[calc(100%+10px)] h-3 bg-[#222225]" 
                                        style={{ clipPath: 'polygon(20px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)' }}
                                    />
                                    {/* 3D Right Side Face */}
                                    <div 
                                        className="absolute -top-3 -right-[10px] w-[10px] h-[calc(100%+12px)] bg-[#0d0d0f] z-10" 
                                        style={{ clipPath: 'polygon(0 12px, 100% 0, 100% calc(100% - 12px), 0 100%)' }}
                                    />
                                    <span className="text-5xl md:text-7xl font-black text-white/5 font-mono select-none">
                                        <AnimatedScore value={podium[2].totalScore} delay={300} duration={1200} />
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Standings Cards List (Starting from Rank 4 onwards) */}
                    {leaderboard.length > 3 && (
                        <div className="space-y-2 w-full pt-4">
                            {leaderboard.slice(3).map((player: any, idx: number) => {
                                const actualRank = idx + 4
                                const isMe = player.rollNo === profile?.rollNo
                                
                                // Color map for the rank badges based on rank number
                                const getRankBadgeClass = (rank: number) => {
                                    switch (rank) {
                                        case 4:
                                            return "bg-blue-600 text-white ring-blue-500/30"
                                        case 5:
                                            return "bg-teal-600 text-white ring-teal-500/30"
                                        case 6:
                                            return "bg-emerald-600 text-white ring-emerald-500/30"
                                        case 7:
                                            return "bg-pink-600 text-white ring-pink-500/30"
                                        default:
                                            return "bg-zinc-700 text-zinc-200 ring-zinc-600/30"
                                    }
                                }

                                return (
                                    <div 
                                        key={player.id}
                                        className={`py-3 px-4 rounded-2xl flex items-center justify-between transition-all ${
                                            isMe 
                                                ? "bg-white shadow-lg text-zinc-950" 
                                                : "bg-[#121212] text-white shadow-md"
                                        }`}
                                    >
                                        <div className="grid grid-cols-[160px_1fr_70px] md:grid-cols-[260px_1fr_100px] items-center w-full">
                                            {/* Left Column (Avatar + Name info) */}
                                            <div className="flex items-center min-w-0">
                                                {/* Avatar element container */}
                                                <div className="relative shrink-0 select-none">
                                                    {/* Avatar */}
                                                    <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg overflow-hidden">
                                                        {player.avatar ? (
                                                            player.avatar.startsWith("/avatars/") || player.avatar.startsWith("data:image/") ? (
                                                                <img src={player.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-xl leading-none">{player.avatar}</span>
                                                            )
                                                        ) : (
                                                            player.name.substring(0, 1).toUpperCase()
                                                        )}
                                                    </div>
                                                    {/* Overlapping Rank Badge */}
                                                    <div className={`absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] font-mono select-none ring-2 ${
                                                        isMe ? "ring-white" : "ring-[#121212]"
                                                    } ${getRankBadgeClass(actualRank)}`}>
                                                        {actualRank}
                                                    </div>
                                                </div>

                                                {/* Name & stats */}
                                                <div className="flex flex-col ml-3.5 min-w-0 pr-2">
                                                    <span className="font-bold text-sm tracking-tight flex items-center gap-1.5 truncate">
                                                        {player.name}
                                                        {isMe && (
                                                            <span className="text-[8px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-sans uppercase font-bold tracking-wider shrink-0">
                                                                You
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className={`text-[10px] ${isMe ? 'text-zinc-500' : 'text-zinc-400'} font-semibold font-mono mt-0.5 truncate uppercase`}>
                                                        {player.rollNo}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Middle Column (Both points aligned in a straight line) */}
                                            <div className="flex items-center justify-center gap-1.5 select-none">
                                                <div className={`text-sm font-bold px-3.5 py-1 rounded-lg shadow-sm ${
                                                    isMe 
                                                        ? "bg-zinc-950 text-white" 
                                                        : "bg-zinc-800 text-white"
                                                }`}>
                                                    {player.tasksCompleted * 10}
                                                </div>
                                                <div className={`text-sm font-bold px-3.5 py-1 rounded-lg shadow-sm ${
                                                    isMe 
                                                        ? "bg-zinc-950 text-white" 
                                                        : "bg-zinc-800 text-white"
                                                }`}>
                                                    {player.examScoreSum}
                                                </div>
                                            </div>

                                            {/* Right Column (Total score badge) */}
                                            <div className="flex items-center justify-end select-none">
                                                <div className="text-sm font-bold px-3.5 py-1.5 rounded-lg shadow-md bg-white text-zinc-950">
                                                    {player.totalScore}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
