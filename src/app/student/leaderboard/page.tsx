"use client"

import React, { useState, useEffect } from "react"
import { Users, Trophy, Award, TrendingUp, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import GlassCard from "@/components/global/glass-card"
import { getStudentLeaderboardAction, getStudentProfileDetails } from "@/actions/student-actions"

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
            <div className="min-h-[50vh] flex items-center justify-center">
                <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></span>
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
                <p className="text-sm text-zinc-400">Class standings for {className}. Ranks are calculated by approved task marks only.</p>
            </div>

            {leaderboard.length === 0 ? (
                <GlassCard className="p-8 text-center text-themeTextGrey text-sm border border-themeGrey">
                    No leaderboard standings available. Ask the admin to assign you to a class.
                </GlassCard>
            ) : (
                <div className="space-y-10">
                    {/* Podium for Top 3 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
                        {/* 2nd Place */}
                        {podium[1] && (
                            <GlassCard className="p-6 border border-zinc-800/80 bg-zinc-950/40 text-center space-y-4 order-2 md:order-1 min-h-[220px] flex flex-col justify-end relative">
                                <div className="absolute top-4 left-4 text-xs font-bold text-zinc-400">#2</div>
                                <div className="w-12 h-12 rounded-full bg-zinc-300/10 border border-zinc-300/20 text-zinc-300 font-bold text-lg flex items-center justify-center mx-auto shadow-md">
                                    2
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-base truncate">{podium[1].name}</h3>
                                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Roll: {podium[1].rollNo}</p>
                                </div>
                                <div className="pt-2 border-t border-zinc-800/40">
                                    <p className="text-lg font-black text-white">{podium[1].totalScore} pts</p>
                                    <p className="text-[9px] text-zinc-500">{podium[1].tasksCompleted} tasks completed</p>
                                </div>
                            </GlassCard>
                        )}

                        {/* 1st Place */}
                        {podium[0] && (
                            <GlassCard className="p-8 border border-amber-500/30 bg-amber-500/5 text-center space-y-4 order-1 md:order-2 min-h-[260px] flex flex-col justify-end relative shadow-2xl">
                                <div className="absolute top-4 left-4 text-xs font-bold text-amber-400">#1</div>
                                <Trophy className="absolute top-4 right-4 text-amber-400 animate-bounce size-6" />
                                <div className="w-16 h-16 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 font-bold text-2xl flex items-center justify-center mx-auto shadow-lg">
                                    1
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-white text-lg truncate">{podium[0].name}</h3>
                                    <p className="text-[10px] text-amber-300/60 font-mono mt-0.5">Roll: {podium[0].rollNo}</p>
                                </div>
                                <div className="pt-2 border-t border-amber-500/20">
                                    <p className="text-2xl font-black text-amber-400">{podium[0].totalScore} pts</p>
                                    <p className="text-[10px] text-amber-300/80">{podium[0].tasksCompleted} tasks completed</p>
                                </div>
                            </GlassCard>
                        )}

                        {/* 3rd Place */}
                        {podium[2] && (
                            <GlassCard className="p-6 border border-zinc-800/80 bg-zinc-950/40 text-center space-y-4 order-3 min-h-[190px] flex flex-col justify-end relative">
                                <div className="absolute top-4 left-4 text-xs font-bold text-orange-400">#3</div>
                                <div className="w-10 h-10 rounded-full bg-orange-400/10 border border-orange-400/20 text-orange-400 font-bold text-base flex items-center justify-center mx-auto shadow-md">
                                    3
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-base truncate">{podium[2].name}</h3>
                                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Roll: {podium[2].rollNo}</p>
                                </div>
                                <div className="pt-2 border-t border-zinc-800/40">
                                    <p className="text-lg font-black text-white">{podium[2].totalScore} pts</p>
                                    <p className="text-[9px] text-zinc-500">{podium[2].tasksCompleted} tasks completed</p>
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
                                            <th className="p-4">Tasks Completed</th>
                                            <th className="p-4 text-right pr-6">Total Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rest.map((player: any, idx: number) => {
                                            const actualRank = idx + 4
                                            const isMe = player.rollNo === profile?.rollNo
                                            return (
                                                <tr 
                                                    key={player.id}
                                                    className={`border-b border-zinc-800/40 transition-all font-medium ${
                                                        isMe 
                                                            ? "bg-indigo-500/10 text-white" 
                                                            : "text-zinc-300 hover:bg-white/[0.01]"
                                                    }`}
                                                >
                                                    <td className="p-4 pl-6 font-bold">{actualRank}</td>
                                                    <td className="p-4 font-semibold text-white flex items-center gap-2">
                                                        {player.name}
                                                        {isMe && (
                                                            <span className="text-[8px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-sans uppercase">
                                                                You
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-zinc-500 font-mono">{player.rollNo}</td>
                                                    <td className="p-4">{player.tasksCompleted} tasks</td>
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
