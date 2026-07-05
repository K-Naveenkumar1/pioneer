"use client"

import gsap from "gsap"
import {
    TrendingDown,
    TrendingUp,
    Users
} from "lucide-react"
import { useEffect, useRef, useState } from "react"

import {
    getAttendanceMetrics,
    getStudentAttendanceSessionsAction,
    getStudentExams,
    getStudentProfileDetails,
    getStudentTasks
} from "@/actions/student-actions"

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

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></span>
            </div>
        )
    }

    return (
        <div className="space-y-10">
            {/* Header */}
            <div>
                <h1 className="text-5xl font-extrabold tracking-tight text-white pb-4">Dashboard</h1>
                <p className="text-sm text-zinc-400">Track your daily progress metrics, tasks completed, exam standings, and class ranks.</p>
            </div>

            {/* SECTION 2: ACADEMIC STANDINGS & PROGRESS */}
            <div className="space-y-6">
                <div ref={statsContainerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Attendance Hours Metrics Card */}
                    <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-6 flex flex-col justify-between min-h-[180px] shadow-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-zinc-400">
                                Attendance Rate
                            </span>
                            <span className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                                metrics.percentage >= 75 
                                    ? "bg-emerald-950/20 border-emerald-800/30 text-emerald-400" 
                                    : "bg-rose-950/20 border-rose-800/30 text-rose-400"
                            }`}>
                                {metrics.percentage >= 75 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                {metrics.percentage >= 75 ? "+8.2%" : "-5.4%"}
                            </span>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-extrabold text-white tracking-tight">
                                {metrics.percentage}%
                            </h3>
                        </div>
                        <div className="mt-6 space-y-1">
                            <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                                {metrics.percentage >= 75 ? "Trending up this month" : "Requires check-in attention"}
                                {metrics.percentage >= 75 ? <TrendingUp size={14} className="text-emerald-400" /> : <TrendingDown size={14} className="text-rose-400" />}
                            </p>
                            <p className="text-xs text-zinc-500">
                                Checked In: {metrics.daysAttended} / {metrics.totalClassDays} days • {totalHours} hrs
                            </p>
                        </div>
                    </div>

                    {/* Task Completion Card */}
                    <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-6 flex flex-col justify-between min-h-[180px] shadow-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-zinc-400">
                                Tasks Completed
                            </span>
                            <span className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                                (stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0) >= 60
                                    ? "bg-emerald-950/20 border-emerald-800/30 text-emerald-400"
                                    : "bg-rose-950/20 border-rose-800/30 text-rose-400"
                            }`}>
                                {(stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0) >= 60 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                {(stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0) >= 60 ? "+12.5%" : "-10%"}
                            </span>
                        </div>
                        <div className="mt-4 flex items-baseline justify-between">
                            <h3 className="text-3xl font-extrabold text-white tracking-tight">
                                {stats.completedTasks} <span className="text-sm text-zinc-500 font-normal">/ {stats.totalTasks}</span>
                            </h3>
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-mono">
                                {stats.completedTasks * 10} / {stats.totalTasks * 10} pts
                            </span>
                        </div>
                        <div className="mt-6 space-y-1">
                            <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                                {(stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0) >= 60 ? "Strong task retention" : "Pending task deadlines"}
                                {(stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0) >= 60 ? <TrendingUp size={14} className="text-emerald-400" /> : <TrendingDown size={14} className="text-rose-400" />}
                            </p>
                            <p className="text-xs text-zinc-500">
                                Pending: {stats.pendingTasks} • Marks Obtained: {stats.completedTasks * 10} pts
                            </p>
                        </div>
                    </div>

                    {/* Exams Card */}
                    <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-6 flex flex-col justify-between min-h-[180px] shadow-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-zinc-400">
                                Exam Standings
                            </span>
                            <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-950/20 border border-emerald-800/30 text-emerald-400">
                                <TrendingUp size={12} />
                                +4.5%
                            </span>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-extrabold text-white tracking-tight">
                                {stats.attemptedExams} <span className="text-sm text-zinc-500 font-normal">/ {stats.totalExams} written</span>
                            </h3>
                        </div>
                        <div className="mt-6 space-y-1">
                            <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                                Steady performance increase
                                <TrendingUp size={14} className="text-emerald-400" />
                            </p>
                            <p className="text-xs text-zinc-500">
                                Pending Attempts: {stats.availableExams} • Exam Standing: Active
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 3: MARKS OBTAINED DETAIL VIEW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Exams Marks Breakdown */}
                <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-6 shadow-lg space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            MCQ Exams Results
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1">Detailed scores and completion status of your online tests.</p>
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        {exams.length === 0 ? (
                            <div className="text-center py-10 text-xs text-zinc-500">
                                No exams available yet.
                            </div>
                        ) : (
                            exams.map((ex: any) => (
                                <div key={ex.id} className="p-4 bg-black/40 border border-zinc-900 rounded-xl flex justify-between items-center hover:border-zinc-850 transition-all">
                                    <div>
                                        <h4 className="font-bold text-sm text-white">{ex.title}</h4>
                                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                            Questions: {ex.totalQuestions} • Duration: {ex.duration} mins
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        {ex.attempted ? (
                                            <>
                                                <span className="text-sm font-extrabold text-emerald-400 font-mono">
                                                    {ex.score} / {ex.totalQuestions}
                                                </span>
                                                <p className="text-[9px] text-zinc-500">
                                                    {ex.completedAt ? new Date(ex.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                                                </p>
                                            </>
                                        ) : (
                                            <span className="text-xs font-semibold text-zinc-500 bg-zinc-900 border border-zinc-800/80 px-2.5 py-1 rounded-lg">
                                                Not Written
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Tasks Completion Breakdown */}
                <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-6 shadow-lg space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            Daily Tasks Completion
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1">Points and approval standings for assigned daily work.</p>
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        {tasks.length === 0 ? (
                            <div className="text-center py-10 text-xs text-zinc-500">
                                No tasks allocated yet.
                            </div>
                        ) : (
                            tasks.map((task: any) => (
                                <div key={task.id} className="p-4 bg-black/40 border border-zinc-900 rounded-xl flex justify-between items-center hover:border-zinc-850 transition-all">
                                    <div>
                                        <h4 className="font-bold text-sm text-white truncate max-w-[200px] md:max-w-[300px]">{task.title}</h4>
                                        <p className="text-[10px] text-zinc-500 mt-0.5">
                                            Allocated: {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        {task.status === "APPROVED" ? (
                                            <>
                                                <span className="text-xs font-extrabold text-emerald-400 font-mono">
                                                    10 pts
                                                </span>
                                                <p className="text-[8px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">Approved</p>
                                            </>
                                        ) : task.status === "PENDING" ? (
                                            <>
                                                <span className="text-xs font-semibold text-amber-400 font-mono">
                                                    0 pts
                                                </span>
                                                <p className="text-[8px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">Pending</p>
                                            </>
                                        ) : task.status === "REJECTED" ? (
                                            <>
                                                <span className="text-xs font-semibold text-rose-400 font-mono">
                                                    0 pts
                                                </span>
                                                <p className="text-[8px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">Rejected</p>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-xs font-semibold text-zinc-500 font-mono">
                                                    0 pts
                                                </span>
                                                <p className="text-[8px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">Not Submitted</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
