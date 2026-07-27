"use client"

import React, { useState, useEffect } from "react"
import { Users, Trophy, Award, RefreshCw, ChevronDown } from "lucide-react"
import { toast } from "sonner"

import GlassCard from "@/components/global/glass-card"
import { adminGetClassesAction, adminGetLeaderboardAction } from "@/actions/admin-actions"

export default function AdminLeaderboardPage() {
    const [classes, setClasses] = useState<any[]>([])
    const [selectedClassId, setSelectedClassId] = useState("")
    const [leaderboard, setLeaderboard] = useState<any[]>([])
    const [loadingClasses, setLoadingClasses] = useState(true)
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)

    useEffect(() => {
        loadClasses()
    }, [])

    const loadClasses = async () => {
        setLoadingClasses(true)
        const res = await adminGetClassesAction()
        if (res.success && res.classes) {
            setClasses(res.classes)
            if (res.classes.length > 0) {
                setSelectedClassId(res.classes[0].id)
                loadLeaderboard(res.classes[0].id)
            }
        } else {
            toast.error("Failed to load classes.")
        }
        setLoadingClasses(false)
    }

    const loadLeaderboard = async (classId: string) => {
        if (!classId) return
        setLoadingLeaderboard(true)
        const res = await adminGetLeaderboardAction(classId)
        if (res.success) {
            setLeaderboard(res.leaderboard || [])
        } else {
            toast.error(res.error || "Failed to load class standings.")
        }
        setLoadingLeaderboard(false)
    }

    const handleClassChange = (classId: string) => {
        setSelectedClassId(classId)
        loadLeaderboard(classId)
    }

    if (loadingClasses) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></span>
            </div>
        )
    }

    const podium = leaderboard.slice(0, 3)
    const rest = leaderboard.slice(3)

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Trophy className="text-white animate-pulse" /> Class Leaderboard
                    </h1>
                    <p className="text-sm text-themeTextGrey">View student ranks and scores by class. Ranks are calculated by approved task marks (10 pts each) and exam scores.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => loadLeaderboard(selectedClassId)}
                        className="p-2.5 bg-zinc-900 border border-themeGrey rounded-xl text-themeTextGrey hover:text-white hover:border-zinc-700 transition-all"
                        title="Reload Standings"
                    >
                        <RefreshCw size={16} />
                    </button>

                    {/* Class Selector Dropdown */}
                    <div className="relative min-w-[160px]">
                        <select
                            value={selectedClassId}
                            onChange={(e) => handleClassChange(e.target.value)}
                            className="w-full appearance-none bg-zinc-900 border border-themeGrey text-white text-xs font-semibold px-4 pr-10 py-3 rounded-xl focus:outline-none cursor-pointer focus:ring-1 focus:ring-white/20"
                        >
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-themeTextGrey pointer-events-none" />
                    </div>
                </div>
            </div>

            {loadingLeaderboard ? (
                <div className="min-h-[30vh] flex items-center justify-center">
                    <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></span>
                </div>
            ) : leaderboard.length === 0 ? (
                <GlassCard className="p-8 text-center text-themeTextGrey text-sm border border-themeGrey">
                    No student scores found in this class. Assign students to tasks or grade their exams first.
                </GlassCard>
            ) : (
                <div className="space-y-10">
                    {/* Podium for Top 3 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
                        {/* 2nd Place */}
                        {podium[1] && (
                            <GlassCard className="p-6 border border-zinc-800/80 bg-zinc-950/40 text-center space-y-4 order-2 md:order-1 min-h-[240px] flex flex-col justify-end relative">
                                <div className="absolute top-4 left-4 text-xs font-bold text-zinc-400">#2</div>
                                <div className="w-12 h-12 rounded-full bg-zinc-300/10 border border-zinc-300/20 text-zinc-300 font-bold text-lg flex items-center justify-center mx-auto shadow-md">
                                    2
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-base truncate">{podium[1].name}</h3>
                                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Roll: {podium[1].rollNo}</p>
                                </div>
                                <div className="pt-2 border-t border-zinc-800/40 space-y-1">
                                    <p className="text-lg font-black text-white">{podium[1].totalScore} pts</p>
                                    <div className="flex justify-center gap-1.5 text-[10px] text-zinc-400 font-medium">
                                        <span>Tasks: {podium[1].tasksCompleted * 10} pts</span>
                                        <span>•</span>
                                        <span>Exams: {podium[1].examScoreSum} pts</span>
                                    </div>
                                </div>
                            </GlassCard>
                        )}

                        {/* 1st Place */}
                        {podium[0] && (
                            <GlassCard className="p-8 border border-amber-500/30 bg-amber-500/5 text-center space-y-4 order-1 md:order-2 min-h-[280px] flex flex-col justify-end relative shadow-2xl">
                                <div className="absolute top-4 left-4 text-xs font-bold text-amber-400">#1</div>
                                <Trophy className="absolute top-4 right-4 text-amber-400 animate-bounce size-6" />
                                <div className="w-16 h-16 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 font-bold text-2xl flex items-center justify-center mx-auto shadow-lg">
                                    1
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-white text-lg truncate">{podium[0].name}</h3>
                                    <p className="text-[10px] text-amber-300/60 font-mono mt-0.5">Roll: {podium[0].rollNo}</p>
                                </div>
                                <div className="pt-2 border-t border-amber-500/20 space-y-1">
                                    <p className="text-2xl font-black text-amber-400">{podium[0].totalScore} pts</p>
                                    <div className="flex justify-center gap-1.5 text-[10px] text-amber-300/80 font-medium">
                                        <span>Tasks: {podium[0].tasksCompleted * 10} pts</span>
                                        <span>•</span>
                                        <span>Exams: {podium[0].examScoreSum} pts</span>
                                    </div>
                                </div>
                            </GlassCard>
                        )}

                        {/* 3rd Place */}
                        {podium[2] && (
                            <GlassCard className="p-6 border border-zinc-800/80 bg-zinc-950/40 text-center space-y-4 order-3 min-h-[210px] flex flex-col justify-end relative">
                                <div className="absolute top-4 left-4 text-xs font-bold text-orange-400">#3</div>
                                <div className="w-10 h-10 rounded-full bg-orange-400/10 border border-orange-400/20 text-orange-400 font-bold text-base flex items-center justify-center mx-auto shadow-md">
                                    3
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-base truncate">{podium[2].name}</h3>
                                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Roll: {podium[2].rollNo}</p>
                                </div>
                                <div className="pt-2 border-t border-zinc-800/40 space-y-1">
                                    <p className="text-lg font-black text-white">{podium[2].totalScore} pts</p>
                                    <div className="flex justify-center gap-1.5 text-[10px] text-zinc-400 font-medium">
                                        <span>Tasks: {podium[2].tasksCompleted * 10} pts</span>
                                        <span>•</span>
                                        <span>Exams: {podium[2].examScoreSum} pts</span>
                                    </div>
                                </div>
                            </GlassCard>
                        )}
                    </div>

                    {/* Rest of Standings Table */}
                    {rest.length > 0 && (
                        <div className="border border-zinc-800/80 rounded-2xl bg-zinc-950/20 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs select-text">
                                    <thead>
                                        <tr className="border-b border-zinc-800/80 bg-zinc-950 text-zinc-400 font-bold uppercase tracking-wider">
                                            <th className="p-4 pl-6 w-16">Rank</th>
                                            <th className="p-4">Student</th>
                                            <th className="p-4">Roll Number</th>
                                            <th className="p-4">Task Marks</th>
                                            <th className="p-4">Exam Marks</th>
                                            <th className="p-4 text-right pr-6">Total Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rest.map((player: any, idx: number) => {
                                            const actualRank = idx + 4
                                            return (
                                                <tr 
                                                    key={player.id}
                                                    className="border-b border-zinc-800/40 transition-all font-medium text-zinc-300 hover:bg-white/[0.01]"
                                                >
                                                    <td className="p-4 pl-6 font-bold">{actualRank}</td>
                                                    <td className="p-4 font-semibold text-white">{player.name}</td>
                                                    <td className="p-4 font-mono">{player.rollNo}</td>
                                                    <td className="p-4 font-mono">{player.tasksCompleted * 10} pts <span className="text-[10px] text-zinc-500 font-sans">({player.tasksCompleted} tasks)</span></td>
                                                    <td className="p-4 font-mono text-zinc-300">{player.examScoreSum} pts</td>
                                                    <td className="p-4 text-right pr-6 font-bold text-white font-mono">{player.totalScore} pts</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
