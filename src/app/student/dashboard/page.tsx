"use client"

import {
    ChevronDown
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts"

import {
    getDashboardDataAction,
} from "@/actions/student-actions"

// Premium simplified World Map vector SVG path for class stands card
const WorldMapSVG = () => (
    <svg viewBox="0 0 1000 500" className="w-full h-full opacity-25 text-zinc-600 fill-current hover:text-zinc-500 transition-colors duration-300">
        {/* North America */}
        <path d="M120,80 L280,80 L290,140 L350,150 L380,220 L300,240 L280,200 L240,240 L210,210 L190,240 L160,200 Z" />
        {/* Greenland */}
        <path d="M340,30 L390,30 L400,60 L360,70 Z" />
        {/* South America */}
        <path d="M280,250 L320,270 L340,300 L380,350 L350,450 L320,470 L300,430 L290,330 L270,280 Z" />
        {/* Africa */}
        <path d="M480,220 L540,190 L600,210 L630,260 L620,290 L590,370 L550,420 L520,400 L510,340 L470,280 Z" />
        {/* Europe */}
        <path d="M480,100 L530,90 L570,120 L590,150 L560,180 L520,190 L480,170 L460,130 Z" />
        {/* Asia */}
        <path d="M570,90 L850,70 L890,120 L870,220 L800,290 L750,290 L700,270 L650,280 L620,250 L600,180 Z" />
        {/* Australia */}
        <path d="M780,360 L840,360 L860,400 L810,420 L770,390 Z" />
        {/* Madagascar */}
        <path d="M620,380 L630,390 L620,410 L610,400 Z" />
    </svg>
)

export default function StudentDashboard() {
    const [stats, setStats] = useState({ 
        pendingTasks: 0, 
        availableExams: 0,
        completedTasks: 0,
        totalTasks: 0,
        attemptedExams: 0,
        totalExams: 0
    })
    const [metrics, setMetrics] = useState({ percentage: 0, daysAttended: 0, totalClassDays: 0 })
    const [profile, setProfile] = useState<any>(null)
    const [totalHours, setTotalHours] = useState("0.0")
    const [exams, setExams] = useState<any[]>([])
    const [tasks, setTasks] = useState<any[]>([])
    const [sessions, setSessions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)



    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        setLoading(true)
        try {
            const res = await getDashboardDataAction()
            if (!res.success) return

            const { tasks: taskList, exams: examList, sessions: sessionList, metrics, profile: profileData } = res as any

            setTasks(taskList || [])
            setExams(examList || [])
            setSessions(sessionList || [])

            if (profileData) setProfile(profileData)
            if (metrics) setMetrics({ percentage: metrics.percentage || 0, daysAttended: metrics.daysAttended || 0, totalClassDays: metrics.totalClassDays || 0 })

            const completedTasks = (taskList || []).filter((t: any) => t.status === "APPROVED").length
            const totalTasks = (taskList || []).length
            const attemptedExams = (examList || []).filter((e: any) => e.attempted).length
            const totalExams = (examList || []).length
            setStats({
                pendingTasks: (taskList || []).filter((t: any) => t.status === "PENDING" || t.status === "REJECTED").length,
                availableExams: (examList || []).filter((e: any) => !e.attempted && e.isActive !== false).length,
                completedTasks,
                totalTasks,
                attemptedExams,
                totalExams
            })

            let hoursSum = 0
            ;(sessionList || []).forEach((s: any) => {
                if (s.checkIn && s.checkOut) {
                    hoursSum += (new Date(s.checkOut).getTime() - new Date(s.checkIn).getTime()) / (1000 * 60 * 60)
                }
            })
            setTotalHours(hoursSum.toFixed(1))
        } catch (error) {
            console.error("Error loading dashboard data:", error)
        } finally {
            setLoading(false)
        }
    }


    // Dynamic hourly chart data builder based on actual attendance sessions
    const getChartData = () => {
        // Group by day of month to show a clean progress spread
        const dayBuckets: { [key: string]: number } = {
            "01": 0, "05": 0, "10": 0, "15": 0, "20": 0, "25": 0, "30": 0
        }

        if (sessions && sessions.length > 0) {
            sessions.forEach((s: any) => {
                if (s.checkIn) {
                    const dateObj = new Date(s.checkIn)
                    const dayNum = dateObj.getDate()
                    let bucket = "01"
                    if (dayNum > 27) bucket = "30"
                    else if (dayNum > 22) bucket = "25"
                    else if (dayNum > 17) bucket = "20"
                    else if (dayNum > 12) bucket = "15"
                    else if (dayNum > 7) bucket = "10"
                    else if (dayNum > 3) bucket = "05"

                    if (s.checkOut) {
                        const diffMs = new Date(s.checkOut).getTime() - dateObj.getTime()
                        dayBuckets[bucket] += diffMs / (1000 * 60 * 60)
                    }
                }
            })
        }

        return Object.keys(dayBuckets).map(key => ({
            date: key,
            hours: parseFloat(dayBuckets[key].toFixed(1))
        }))
    }

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-black border border-zinc-800 px-3 py-1.5 rounded-xl shadow-xl">
                    <p className="text-xs font-bold text-white">{`${payload[0].value} hrs`}</p>
                </div>
            )
        }
        return null
    }

    if (loading) {
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

                {/* 4 stat cards skeleton */}
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

                {/* Main 2-column grid skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Left column */}
                    <div className="lg:col-span-7 space-y-4">
                        {/* Chart card */}
                        <div className="bg-[#121212] rounded-[20px] p-6 flex flex-col">
                            <div className="flex justify-between items-start pb-6">
                                <div className="space-y-2">
                                    <div className="skeleton-shimmer h-3 w-20 rounded" />
                                    <div className="skeleton-shimmer h-9 w-28 rounded-lg" />
                                </div>
                                <div className="skeleton-shimmer h-5 w-24 rounded-lg" />
                            </div>
                            <div className="skeleton-shimmer h-[200px] w-full rounded-xl" />
                        </div>

                        {/* Tasks table card */}
                        <div className="bg-[#121212] rounded-[20px] p-6 flex flex-col">
                            <div className="flex justify-between items-start pb-6">
                                <div className="space-y-2">
                                    <div className="skeleton-shimmer h-9 w-32 rounded-lg" />
                                    <div className="skeleton-shimmer h-3 w-56 rounded" />
                                </div>
                                <div className="skeleton-shimmer h-5 w-20 rounded-lg" />
                            </div>
                            <div className="space-y-3">
                                <div className="skeleton-shimmer h-3 w-full rounded" />
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

                    {/* Right column */}
                    <div className="lg:col-span-5 space-y-4">
                        {/* Exams table card */}
                        <div className="bg-[#121212] rounded-[20px] p-6 flex flex-col">
                            <div className="flex justify-between items-start pb-6">
                                <div className="space-y-2">
                                    <div className="skeleton-shimmer h-9 w-28 rounded-lg" />
                                    <div className="skeleton-shimmer h-3 w-44 rounded" />
                                </div>
                                <div className="skeleton-shimmer h-5 w-20 rounded-lg" />
                            </div>
                            <div className="space-y-3">
                                <div className="skeleton-shimmer h-3 w-full rounded" />
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-4 border-b border-zinc-800/30 pb-3">
                                        <div className="skeleton-shimmer h-3.5 flex-1 rounded" />
                                        <div className="skeleton-shimmer h-3.5 w-14 rounded" />
                                        <div className="skeleton-shimmer h-3.5 w-12 rounded" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Geographic stands card */}
                        <div className="bg-[#121212] rounded-[20px] p-6 flex flex-col pb-11">
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

    return (
        <div className="space-y-4 select-none">
            {/* Header Greeting Card */}
            <div className="bg-transparent rounded-[20px] pb-2 pr-2 pl-2 pt-1 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 border border-zinc-800">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white pb-1">
                        Welcome Back, {profile?.name || "Student"}
                    </h1>
                    <p className="text-sm text-zinc-400">Here's everything you need to be up to date</p>
                </div>
                <div>
                    <Link 
                        href="/student/checkin" 
                        className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all shadow-md shrink-0"
                    >
                        Check-In Portal
                    </Link>
                </div>
            </div>

            {/* Row of 4 Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Attendance rate */}
                <div className="bg-[#121212] rounded-[20px] p-6 flex flex-col justify-between min-h-[140px] shadow-lg transition-all duration-300">
                    <div>
                        <p className="text-xs text-zinc-500 font-medium tracking-tight">Attendance rate</p>
                        <h3 className="text-3xl font-bold text-white tracking-tight mt-2">
                            {metrics.percentage}%
                        </h3>
                    </div>
                    {metrics.percentage < 75 ? (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 mt-4">
                            <span>▼ 5.4%</span>
                            <span className="text-zinc-500 font-normal">last 30 days</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500 mt-4">
                            <span>▲ 5.1%</span>
                            <span className="text-zinc-500 font-normal">last 30 days</span>
                        </div>
                    )}
                </div>

                {/* Tasks Completed */}
                <div className="bg-[#121212] rounded-[20px] p-6 flex flex-col justify-between min-h-[140px] shadow-lg transition-all duration-300">
                    <div>
                        <p className="text-xs text-zinc-500 font-medium tracking-tight">Tasks Completed</p>
                        <h3 className="text-3xl font-bold text-white tracking-tight mt-2">
                            {stats.completedTasks} <span className="text-base text-zinc-500 font-normal">/ {stats.totalTasks}</span>
                        </h3>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500 mt-4">
                        <span>▲ 12.5%</span>
                        <span className="text-zinc-500 font-normal">last 30 days</span>
                    </div>
                </div>

                {/* Exams stand */}
                <div className="bg-[#121212] rounded-[20px] p-6 flex flex-col justify-between min-h-[140px] shadow-lg transition-all duration-300">
                    <div>
                        <p className="text-xs text-zinc-500 font-medium tracking-tight">Exams Standing</p>
                        <h3 className="text-3xl font-bold text-white tracking-tight mt-2">
                            {stats.attemptedExams} <span className="text-base text-zinc-500 font-normal">/ {stats.totalExams}</span>
                        </h3>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 mt-4">
                        <span>▼ 2.3%</span>
                        <span className="text-zinc-500 font-normal">last 30 days</span>
                    </div>
                </div>

                {/* Study Hours */}
                <div className="bg-[#121212] rounded-[20px] p-6 flex flex-col justify-between min-h-[140px] shadow-lg transition-all duration-300">
                    <div>
                        <p className="text-xs text-zinc-500 font-medium tracking-tight">Study Hours</p>
                        <h3 className="text-3xl font-bold text-white tracking-tight mt-2">
                            {totalHours} <span className="text-base text-zinc-500 font-normal">hrs</span>
                        </h3>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500 mt-4">
                        <span>▲ 5.1%</span>
                        <span className="text-zinc-500 font-normal">last 30 days</span>
                    </div>
                </div>
            </div>

            {/* Main Double Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Left Column: Chart and Tasks List */}
                <div className="lg:col-span-7 space-y-4">
                    {/* Revenue (Study Hours) Chart Card */}
                    <div className="bg-[#121212] rounded-[20px] p-6 shadow-lg flex flex-col transition-all duration-300">
                        <div className="flex justify-between items-start pb-6">
                            <div>
                                <p className="text-xs text-zinc-500 font-medium tracking-tight">Study Hours</p>
                                <h3 className="text-3xl font-bold text-white tracking-tight mt-1.5">
                                    {totalHours} <span className="text-base text-zinc-500 font-normal">hrs</span>
                                </h3>
                            </div>
                            <button className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-white transition-all">
                                <span>This Month</span>
                                <ChevronDown size={14} />
                            </button>
                        </div>
                        
                        <div className="h-[200px] w-full mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={getChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ffffff" stopOpacity={0.12}/>
                                            <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis 
                                        dataKey="date" 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tick={{ fill: '#52525b', fontSize: 10 }}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#1c1c1e', strokeWidth: 1 }} />
                                    <Area 
                                        type="monotone" 
                                        dataKey="hours" 
                                        stroke="#ffffff" 
                                        strokeWidth={1.8} 
                                        fillOpacity={1} 
                                        fill="url(#colorHours)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Daily Tasks Table Card */}
                    <div className="bg-[#121212] rounded-[20px] p-6 shadow-lg flex flex-col transition-all duration-300">
                        <div className="flex justify-between items-start pb-6">
                            <div>
                                <h3 className="text-3xl font-bold text-white tracking-tight">Daily Tasks</h3>
                                <p className="text-xs text-zinc-500 mt-0.5">Points and approval standings for assigned daily work</p>
                            </div>
                            <button className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-white transition-all">
                                <span>This Month</span>
                                <ChevronDown size={14} />
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-[11px] font-medium text-zinc-300">
                                <thead>
                                    <tr className="border-b border-zinc-800/50 text-zinc-500 font-bold uppercase tracking-wider">
                                        <th className="pb-3 pr-4">Task Title</th>
                                        <th className="pb-3 px-4">Allocated</th>
                                        <th className="pb-3 px-4">Status</th>
                                        <th className="pb-3 pl-4 text-right">Points</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tasks.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-6 text-center text-zinc-500">No tasks allocated yet.</td>
                                        </tr>
                                    ) : (
                                        tasks.slice(0, 5).map((task: any) => (
                                            <tr key={task.id} className="border-b border-zinc-800/30 hover:bg-zinc-900/20 transition-all">
                                                <td className="py-3.5 pr-4 font-bold text-white truncate max-w-[150px]">{task.title}</td>
                                                <td className="py-3.5 px-4 text-zinc-500">
                                                    {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                                        task.status === "APPROVED" 
                                                            ? "bg-emerald-950/20 border-emerald-800/30 text-emerald-400" 
                                                            : task.status === "PENDING"
                                                            ? "bg-amber-950/20 border-amber-800/30 text-amber-400"
                                                            : "bg-rose-950/20 border-rose-800/30 text-rose-400"
                                                    }`}>
                                                        {task.status}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 pl-4 text-right font-bold text-white font-mono">
                                                    {task.status === "APPROVED" ? "10 pts" : "0 pts"}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Column: Exams Standings and Geographic map */}
                <div className="lg:col-span-5 space-y-4">
                    {/* MCQ Exams Table Card */}
                    <div className="bg-[#121212] rounded-[20px] p-6 shadow-lg flex flex-col transition-all duration-300">
                        <div className="flex justify-between items-start pb-6">
                            <div>
                                <h3 className="text-3xl font-bold text-white tracking-tight">MCQ Exams</h3>
                                <p className="text-xs text-zinc-500 mt-0.5">Your scores and standings of online tests</p>
                            </div>
                            <button className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-white transition-all">
                                <span>This Month</span>
                                <ChevronDown size={14} />
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-[11px] font-medium text-zinc-300">
                                <thead>
                                    <tr className="border-b border-zinc-800/50 text-zinc-500 font-bold uppercase tracking-wider">
                                        <th className="pb-3 pr-2">Exam Title</th>
                                        <th className="pb-3 px-2">Duration</th>
                                        <th className="pb-3 pl-2 text-right">Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {exams.filter((ex: any) => ex.attempted).length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="py-6 text-center text-zinc-500">No exams completed yet.</td>
                                        </tr>
                                    ) : (
                                        exams.filter((ex: any) => ex.attempted).slice(0, 5).map((ex: any) => (
                                            <tr key={ex.id} className="border-b border-zinc-800/30 hover:bg-zinc-900/20 transition-all">
                                                <td className="py-3.5 pr-2 font-bold text-white truncate max-w-[120px]">{ex.title}</td>
                                                <td className="py-3.5 px-2 text-zinc-500">{ex.duration} mins</td>
                                                <td className="py-3.5 pl-2 text-right">
                                                    <span className="font-extrabold text-emerald-400 font-mono">
                                                        {ex.score} / {ex.type === "CODING" ? ex.totalQuestions * 100 : ex.totalQuestions}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Geographic style Classroom stands Card */}
                    <div className="bg-[#121212] rounded-[20px] p-6 shadow-lg flex flex-col transition-all duration-300 pb-11">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs text-zinc-500 font-medium tracking-tight">Geographic Stands</p>
                                <h3 className="text-3xl font-bold text-white tracking-tight mt-1.5">
                                    85%
                                </h3>
                            </div>
                            <button className="flex items-center gap-0.5 text-[11px] font-semibold text-zinc-500 hover:text-white transition-all">
                                <span>View All</span>
                                <span className="text-xs">↗</span>
                            </button>
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-500 mt-1">
                            <span>▲ 12.02%</span>
                            <span className="text-zinc-500 font-normal"> last month</span>
                        </div>

                        {/* Map and Stands Row */}
                        <div className="flex flex-col sm:flex-row items-center gap-6 mt-6">
                            <div className="flex-1 w-full h-[140px] relative flex items-center justify-center bg-zinc-950/20 rounded-xl overflow-hidden">
                                <WorldMapSVG />
                            </div>
                            
                            {/* Stands stats */}
                            <div className="w-full sm:w-[180px] space-y-2.5">
                                <div className="flex items-center justify-between text-xs py-1">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                        <span className="text-zinc-400 font-medium">Attendance</span>
                                    </div>
                                    <span className="font-bold text-white text-[11px]">{metrics.percentage}%</span>
                                </div>
                                <div className="flex items-center justify-between text-xs py-1 border-t border-zinc-900/60">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                        <span className="text-zinc-400 font-medium">Tasks</span>
                                    </div>
                                    <span className="font-bold text-white text-[11px]">
                                        {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs py-1 border-t border-zinc-900/60">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                        <span className="text-zinc-400 font-medium">Exams</span>
                                    </div>
                                    <span className="font-bold text-white text-[11px]">
                                        {stats.totalExams > 0 ? Math.round((stats.attemptedExams / stats.totalExams) * 100) : 0}%
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs py-1 border-t border-zinc-900/60">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                                        <span className="text-zinc-400 font-medium">Overall</span>
                                    </div>
                                    <span className="font-bold text-white text-[11px]">85%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
