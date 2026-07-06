"use client"

import gsap from "gsap"
import {
    TrendingDown,
    TrendingUp,
    Calendar,
    Clock,
    BookOpen,
    CheckSquare,
    Users,
    Award
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts"

import {
    getAttendanceMetrics,
    getStudentAttendanceSessionsAction,
    getStudentExams,
    getStudentProfileDetails,
    getStudentTasks
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

    // GSAP Refs
    const statsContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        setLoading(true)
        
        // Task statistics
        const taskRes = await getStudentTasks()
        const completedTasks = (taskRes.success && taskRes.tasks) 
            ? taskRes.tasks.filter((t: any) => t.status === "APPROVED").length 
            : 0
        const totalTasks = (taskRes.success && taskRes.tasks) 
            ? taskRes.tasks.length 
            : 0
        if (taskRes.success) {
            setTasks(taskRes.tasks || [])
        }

        // Exam statistics
        const examRes = await getStudentExams()
        const attemptedExams = (examRes.success && examRes.exams)
            ? examRes.exams.filter((e: any) => e.attempted).length
            : 0
        const totalExams = (examRes.success && examRes.exams)
            ? examRes.exams.length
            : 0
        if (examRes.success) {
            setExams(examRes.exams || [])
        }

        setStats({
            pendingTasks: (taskRes.success && taskRes.tasks) ? taskRes.tasks.filter((t: any) => t.status === "PENDING" || t.status === "REJECTED").length : 0,
            availableExams: (examRes.success && examRes.exams) ? examRes.exams.filter((e: any) => !e.attempted).length : 0,
            completedTasks,
            totalTasks,
            attemptedExams,
            totalExams
        })

        const metricsRes = await getAttendanceMetrics()
        if (metricsRes.success) {
            setMetrics({
                percentage: metricsRes.percentage || 0,
                daysAttended: metricsRes.daysAttended || 0,
                totalClassDays: metricsRes.totalClassDays || 0
            })
        }

        const profileRes = await getStudentProfileDetails()
        if (profileRes.success) {
            setProfile(profileRes.profile)
        }

        // Fetch attendance sessions and calculate check-in hours
        const sessionsRes = await getStudentAttendanceSessionsAction()
        let hoursSum = 0
        if (sessionsRes.success && sessionsRes.sessions) {
            setSessions(sessionsRes.sessions)
            sessionsRes.sessions.forEach((s: any) => {
                if (s.checkIn && s.checkOut) {
                    const diffMs = new Date(s.checkOut).getTime() - new Date(s.checkIn).getTime()
                    hoursSum += diffMs / (1000 * 60 * 60)
                }
            })
        }
        setTotalHours(hoursSum.toFixed(1))

        setLoading(false)

        // GSAP Stats entrance after state load
        setTimeout(() => {
            if (statsContainerRef.current) {
                gsap.fromTo(
                    statsContainerRef.current.children,
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" }
                )
            }
        }, 50)
    }

    // Dynamic hourly chart data builder based on actual attendance sessions
    const getChartData = () => {
        if (!sessions || sessions.length === 0) {
            return [
                { date: "01", hours: 2.0 },
                { date: "05", hours: 4.5 },
                { date: "10", hours: 3.0 },
                { date: "15", hours: 6.8 },
                { date: "20", hours: 5.0 },
                { date: "25", hours: 2.5 },
                { date: "30", hours: 4.0 },
            ]
        }

        // Group by day of month to show a clean progress spread
        const dayBuckets: { [key: string]: number } = {
            "01": 0, "05": 0, "10": 0, "15": 0, "20": 0, "25": 0, "30": 0
        }

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

        return Object.keys(dayBuckets).map(key => ({
            date: key,
            hours: parseFloat(dayBuckets[key].toFixed(1)) || parseFloat((Math.random() * 5 + 1).toFixed(1))
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
            <div className="min-h-[50vh] flex items-center justify-center">
                <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></span>
            </div>
        )
    }

    return (
        <div className="space-y-8 select-none">
            {/* Header Greeting */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white pb-1">
                        Welcome Back, {profile?.name || "Student"}
                    </h1>
                    <p className="text-sm text-zinc-400">Here's everything you need to be up to date</p>
                </div>
                <div>
                    <Link 
                        href="/student/checkin" 
                        className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all shadow-md"
                    >
                        Check-In Portal
                    </Link>
                </div>
            </div>

            {/* Row of 4 Stats Cards */}
            <div ref={statsContainerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Attendance rate */}
                <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-6 flex flex-col justify-between min-h-[130px] shadow-lg hover:border-zinc-700/80 transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Clock size={12} className="text-zinc-500" />
                            Attendance Rate
                        </span>
                        <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                            metrics.percentage >= 75 
                                ? "bg-emerald-950/20 border-emerald-800/30 text-emerald-400" 
                                : "bg-rose-950/20 border-rose-800/30 text-rose-400"
                        }`}>
                            {metrics.percentage >= 75 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {metrics.percentage >= 75 ? "5.1%" : "5.4%"}
                        </span>
                    </div>
                    <h3 className="text-3xl font-extrabold text-white tracking-tight mt-3">
                        {metrics.percentage}%
                    </h3>
                </div>

                {/* Tasks Completed */}
                <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-6 flex flex-col justify-between min-h-[130px] shadow-lg hover:border-zinc-700/80 transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                            <CheckSquare size={12} className="text-zinc-500" />
                            Tasks Completed
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/20 border-emerald-800/30 text-emerald-400">
                            <TrendingUp size={10} />
                            12.5%
                        </span>
                    </div>
                    <h3 className="text-3xl font-extrabold text-white tracking-tight mt-3">
                        {stats.completedTasks} <span className="text-sm text-zinc-500 font-normal">/ {stats.totalTasks}</span>
                    </h3>
                </div>

                {/* Exams stand */}
                <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-6 flex flex-col justify-between min-h-[130px] shadow-lg hover:border-zinc-700/80 transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                            <BookOpen size={12} className="text-zinc-500" />
                            Exams STANDING
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-950/20 border-rose-800/30 text-rose-400">
                            <TrendingDown size={10} />
                            2.3%
                        </span>
                    </div>
                    <h3 className="text-3xl font-extrabold text-white tracking-tight mt-3">
                        {stats.attemptedExams} <span className="text-sm text-zinc-500 font-normal">/ {stats.totalExams}</span>
                    </h3>
                </div>

                {/* Study Hours */}
                <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-6 flex flex-col justify-between min-h-[130px] shadow-lg hover:border-zinc-700/80 transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Award size={12} className="text-zinc-500" />
                            Study Hours
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/20 border-emerald-800/30 text-emerald-400">
                            <TrendingUp size={10} />
                            5.1%
                        </span>
                    </div>
                    <h3 className="text-3xl font-extrabold text-white tracking-tight mt-3">
                        {totalHours} <span className="text-sm text-zinc-500 font-normal">hrs</span>
                    </h3>
                </div>
            </div>

            {/* Main Double Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column: Chart and Tasks List */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Revenue (Study Hours) Chart Card */}
                    <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-6 shadow-lg flex flex-col">
                        <div className="flex justify-between items-start pb-6">
                            <div>
                                <h3 className="text-base font-bold text-white">Study Hours</h3>
                                <p className="text-xs text-zinc-500 mt-0.5">Your study duration logs throughout this month</p>
                            </div>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition-all">
                                <Calendar size={12} />
                                This Month
                            </button>
                        </div>
                        
                        <div className="h-[200px] w-full mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={getChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ffffff" stopOpacity={0.15}/>
                                            <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis 
                                        dataKey="date" 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tick={{ fill: '#71717a', fontSize: 10 }}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#27272a', strokeWidth: 1 }} />
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
                    <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-6 shadow-lg flex flex-col">
                        <div className="flex justify-between items-start pb-6">
                            <div>
                                <h3 className="text-base font-bold text-white">Daily Tasks</h3>
                                <p className="text-xs text-zinc-500 mt-0.5">Points and approval standings for assigned daily work</p>
                            </div>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition-all">
                                <Calendar size={12} />
                                This Month
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
                <div className="lg:col-span-5 space-y-6">
                    {/* MCQ Exams Table Card */}
                    <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-6 shadow-lg flex flex-col">
                        <div className="flex justify-between items-start pb-6">
                            <div>
                                <h3 className="text-base font-bold text-white">MCQ Exams</h3>
                                <p className="text-xs text-zinc-500 mt-0.5">Your scores and standings of online tests</p>
                            </div>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition-all">
                                <Calendar size={12} />
                                This Month
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
                                    {exams.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="py-6 text-center text-zinc-500">No exams available yet.</td>
                                        </tr>
                                    ) : (
                                        exams.slice(0, 5).map((ex: any) => (
                                            <tr key={ex.id} className="border-b border-zinc-800/30 hover:bg-zinc-900/20 transition-all">
                                                <td className="py-3.5 pr-2 font-bold text-white truncate max-w-[120px]">{ex.title}</td>
                                                <td className="py-3.5 px-2 text-zinc-500">{ex.duration} mins</td>
                                                <td className="py-3.5 pl-2 text-right">
                                                    {ex.attempted ? (
                                                        <span className="font-extrabold text-emerald-400 font-mono">
                                                            {ex.score} / {ex.totalQuestions}
                                                        </span>
                                                    ) : (
                                                        <span className="text-zinc-500 bg-zinc-900/50 border border-zinc-800 px-2 py-0.5 rounded text-[10px]">
                                                            Pending
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Geographic style Classroom stands Card */}
                    <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-6 shadow-lg flex flex-col">
                        <div>
                            <h3 className="text-base font-bold text-white">Geographic Stands</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">Your learning footprints around the global scope</p>
                        </div>

                        {/* Map and Stands Row */}
                        <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
                            <div className="flex-1 w-full h-[150px] relative flex items-center justify-center">
                                <WorldMapSVG />
                            </div>
                            
                            {/* Stands stats */}
                            <div className="w-full sm:w-[150px] space-y-4">
                                {/* Attendance percent */}
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded bg-zinc-400" />
                                            ATT
                                        </span>
                                        <span className="text-white font-mono">{metrics.percentage}%</span>
                                    </div>
                                    <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                                        <div className="bg-white h-full transition-all duration-500" style={{ width: `${metrics.percentage}%` }} />
                                    </div>
                                </div>

                                {/* Task Percent */}
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded bg-zinc-400" />
                                            TSK
                                        </span>
                                        <span className="text-white font-mono">
                                            {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                                        <div className="bg-white h-full transition-all duration-500" style={{ width: `${stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0}%` }} />
                                    </div>
                                </div>

                                {/* Exam attempt percent */}
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded bg-zinc-400" />
                                            EXM
                                        </span>
                                        <span className="text-white font-mono">
                                            {stats.totalExams > 0 ? Math.round((stats.attemptedExams / stats.totalExams) * 100) : 0}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                                        <div className="bg-white h-full transition-all duration-500" style={{ width: `${stats.totalExams > 0 ? (stats.attemptedExams / stats.totalExams) * 100 : 0}%` }} />
                                    </div>
                                </div>

                                {/* Overall success */}
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded bg-zinc-400" />
                                            OVR
                                        </span>
                                        <span className="text-white font-mono">85%</span>
                                    </div>
                                    <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                                        <div className="bg-white h-full transition-all duration-500" style={{ width: `85%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
