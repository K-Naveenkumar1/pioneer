"use client"

import React, { useState, useEffect } from "react"
import { 
    Users, 
    CheckSquare, 
    BookOpen, 
    Clock, 
    RefreshCw, 
    UserCheck,
    Calendar
} from "lucide-react"
import { toast } from "sonner"

import GlassCard from "@/components/global/glass-card"
import { adminGetDashboardStats } from "@/actions/admin-actions"

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchStats()
    }, [])

    const fetchStats = async () => {
        setLoading(true)
        const res = await adminGetDashboardStats()
        if (res.success) {
            setStats(res)
        } else {
            toast.error(res.error || "Failed to load dashboard metrics")
        }
        setLoading(false)
    }

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></span>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Overview</h1>
                    <p className="text-sm text-themeTextGrey">Monitor active learning activities and analytics.</p>
                </div>
                <button
                    onClick={fetchStats}
                    className="p-2.5 bg-zinc-900 border border-themeGrey rounded-xl text-themeTextGrey hover:text-white hover:border-zinc-700 transition-all"
                >
                    <RefreshCw size={16} />
                </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <GlassCard className="p-6 border border-themeGrey flex items-center gap-4 relative overflow-hidden">
                    <div className="p-3 bg-zinc-900 border border-themeGrey rounded-xl text-white">
                        <Users size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-themeTextGrey font-semibold uppercase tracking-wider">Total Students</p>
                        <p className="text-2xl font-bold text-white mt-1">{stats?.studentCount || 0}</p>
                    </div>
                </GlassCard>

                <GlassCard className="p-6 border border-themeGrey flex items-center gap-4 relative overflow-hidden">
                    <div className="p-3 bg-zinc-900 border border-themeGrey rounded-xl text-white">
                        <UserCheck size={22} className="text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-xs text-themeTextGrey font-semibold uppercase tracking-wider">Checked In Now</p>
                        <p className="text-2xl font-bold text-emerald-400 mt-1">{stats?.activeCount || 0}</p>
                    </div>
                </GlassCard>

                <GlassCard className="p-6 border border-themeGrey flex items-center gap-4 relative overflow-hidden">
                    <div className="p-3 bg-zinc-900 border border-themeGrey rounded-xl text-white">
                        <CheckSquare size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-themeTextGrey font-semibold uppercase tracking-wider">Allocated Tasks</p>
                        <p className="text-2xl font-bold text-white mt-1">{stats?.taskCount || 0}</p>
                    </div>
                </GlassCard>

                <GlassCard className="p-6 border border-themeGrey flex items-center gap-4 relative overflow-hidden">
                    <div className="p-3 bg-zinc-900 border border-themeGrey rounded-xl text-white">
                        <BookOpen size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-themeTextGrey font-semibold uppercase tracking-wider">Exams Conducted</p>
                        <p className="text-2xl font-bold text-white mt-1">{stats?.examCount || 0}</p>
                    </div>
                </GlassCard>
            </div>

            {/* Checked-In Students List */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Active Sessions (Currently Checked-In)
                </h3>

                {!stats?.activeCheckins || stats.activeCheckins.length === 0 ? (
                    <GlassCard className="p-8 text-center text-themeTextGrey text-sm border border-themeGrey">
                        No students are currently checked in.
                    </GlassCard>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {stats.activeCheckins.map((item: any) => (
                            <GlassCard 
                                key={item.id} 
                                className="p-5 border border-themeGrey/60 hover:border-zinc-700 transition-all flex flex-col justify-between"
                            >
                                <div className="space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div className="overflow-hidden">
                                            <h4 className="font-bold text-sm text-white truncate">{item.student?.name}</h4>
                                            <p className="text-[11px] text-themeTextGrey truncate">{item.student?.rollNo}</p>
                                        </div>
                                        <span className="flex h-2 w-2 relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-themeTextGrey border-t border-themeGrey/40 pt-3">
                                        <Clock size={14} /> Checked-In: {formatTime(item.checkIn)}
                                    </div>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
