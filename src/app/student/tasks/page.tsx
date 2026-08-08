"use client"

import React, { useState, useEffect, useTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
    CheckSquare, 
    Lock, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    ChevronRight, 
    ChevronDown, 
    Send,
    AlertTriangle
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

import GlassCard from "@/components/global/glass-card"
import { Button } from "@/components/ui/button"
import { getStudentTasks, submitTaskAction } from "@/actions/student-actions"

export default function StudentTasksPage() {
    const [tasks, setTasks] = useState<any[]>([])
    const [isCheckedIn, setIsCheckedIn] = useState(false)
    const [isBlockedFromTasks, setIsBlockedFromTasks] = useState(false)
    const [loading, setLoading] = useState(true)
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
    const [solution, setSolution] = useState("")
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        loadTasks()
    }, [])

    const loadTasks = async () => {
        setLoading(true)
        const res = await getStudentTasks()
        if (res.success) {
            setTasks(res.tasks || [])
            setIsCheckedIn(res.isCheckedIn || false)
            setIsBlockedFromTasks(res.isBlockedFromTasks || false)
        } else {
            toast.error(res.error || "Failed to load tasks")
        }
        setLoading(false)
    }

    const handleSubmitSolution = (taskId: string) => {
        if (!solution.trim()) {
            toast.error("Please enter your solution or submission details.")
            return
        }

        startTransition(async () => {
            const res = await submitTaskAction(taskId, solution)
            if (res.success) {
                toast.success(res.message || "Solution submitted successfully!")
                setSolution("")
                loadTasks()
            } else {
                toast.error(res.error || "Failed to submit task solution")
            }
        })
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "APPROVED":
                return (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded-md">
                        <CheckCircle2 size={12} /> Approved
                    </span>
                )
            case "REJECTED":
                return (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-1 rounded-md">
                        <XCircle size={12} /> Rejected
                    </span>
                )
            case "PENDING":
                if (expandedTaskId) { // user has submitted but it is pending
                    return (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-1 rounded-md">
                            <Clock size={12} /> Under Review
                        </span>
                    )
                }
                return (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 bg-zinc-800 border border-zinc-700 px-2 py-1 rounded-md">
                        Pending
                    </span>
                )
            default:
                return null
        }
    }

    if (loading) {
        return (
            <div className="space-y-8">
                {/* Header */}
                <div className="space-y-2">
                    <div className="skeleton-shimmer h-12 w-56 rounded-xl" />
                    <div className="skeleton-shimmer h-3.5 w-72 rounded-lg" />
                </div>
                {/* Stats strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="glass-effect rounded-2xl p-4 flex flex-col gap-2">
                            <div className="skeleton-shimmer h-3 w-20 rounded" />
                            <div className="skeleton-shimmer h-7 w-12 rounded-lg" />
                        </div>
                    ))}
                </div>
                {/* Task list cards */}
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="glass-effect rounded-2xl p-5 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="skeleton-shimmer h-5 w-5 rounded" />
                                <div className="flex-1 space-y-2">
                                    <div className="skeleton-shimmer h-4 w-48 rounded" />
                                    <div className="skeleton-shimmer h-3 w-32 rounded" />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="skeleton-shimmer h-6 w-20 rounded-md" />
                                <div className="skeleton-shimmer h-5 w-5 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (isBlockedFromTasks) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
                <GlassCard className="max-w-md p-8 border border-themeGrey flex flex-col items-center">
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 mb-4 animate-pulse">
                        <Lock size={36} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        Task Access Blocked
                    </h2>
                    <p className="text-sm text-themeTextGrey mb-6 leading-relaxed">
                        You have not been authorized by the administrator to attend tasks at this time. Please contact your instructor.
                    </p>
                    <Link href="/student/dashboard">
                        <Button className="bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl px-6 py-4 text-xs">
                            Return to Dashboard
                        </Button>
                    </Link>
                </GlassCard>
            </div>
        )
    }

    if (!isCheckedIn) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
                <GlassCard className="max-w-md p-8 border border-themeGrey flex flex-col items-center">
                    <div className="p-4 bg-zinc-900 border border-themeGrey rounded-full text-amber-400 mb-4">
                        <Lock size={36} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        Task Access Blocked
                    </h2>
                    <p className="text-sm text-themeTextGrey max-w-sm mb-6 leading-relaxed">
                        To view or complete assigned tasks, you must be actively **Checked In** on the dashboard. This ensures your active session hours are logged.
                    </p>
                    <Link href="/student/dashboard">
                        <Button className="bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl px-6 py-4 text-xs">
                            Go to Dashboard & Check In
                        </Button>
                    </Link>
                </GlassCard>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                    <CheckSquare size={26} /> Allocated Tasks
                </h1>
                <p className="text-sm text-themeTextGrey">Complete the tasks assigned to you by the administrator.</p>
            </div>

            {/* Main Content */}
            <div className="space-y-4">
                {tasks.length === 0 ? (
                    <GlassCard className="p-8 text-center text-themeTextGrey border border-themeGrey">
                        No tasks have been allocated to you yet. You're all caught up!
                    </GlassCard>
                ) : (
                    tasks.map((task: any) => {
                        const isExpanded = expandedTaskId === task.id
                        const hasSubmission = task.status !== "PENDING" || task.submittedContent !== null

                        return (
                            <GlassCard 
                                key={task.id} 
                                className="border border-themeGrey overflow-hidden transition-all duration-300 hover:border-zinc-700"
                            >
                                {/* Accordion Header */}
                                <div 
                                    onClick={() => {
                                        setExpandedTaskId(isExpanded ? null : task.id)
                                        setSolution(task.submittedContent || "")
                                    }}
                                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/[0.01] transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-zinc-900 border border-themeGrey rounded-xl text-white">
                                            <CheckSquare size={16} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-white">{task.title}</h3>
                                            <p className="text-[11px] text-themeTextGrey mt-0.5">
                                                Assigned on {new Date(task.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {getStatusBadge(task.status)}
                                        {isExpanded ? <ChevronDown size={18} className="text-themeTextGrey" /> : <ChevronRight size={18} className="text-themeTextGrey" />}
                                    </div>
                                </div>

                                {/* Accordion Content */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-themeGrey/60 bg-black/40"
                                        >
                                            <div className="p-5 space-y-6">
                                                {/* Task Description */}
                                                <div>
                                                    <h4 className="text-xs font-bold text-themeTextGrey uppercase tracking-wider mb-2">
                                                        Task Description
                                                    </h4>
                                                    <p className="text-sm text-themeTextWhite whitespace-pre-line leading-relaxed">
                                                        {task.description}
                                                    </p>
                                                </div>

                                                {/* Submission Status & Form */}
                                                <div className="border-t border-themeGrey/40 pt-5 space-y-4">
                                                    <h4 className="text-xs font-bold text-themeTextGrey uppercase tracking-wider flex items-center gap-1.5">
                                                        Your Submission
                                                    </h4>

                                                    {task.status === "APPROVED" ? (
                                                        <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl space-y-2">
                                                            <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                                                                <CheckCircle2 size={16} /> Completed & Approved
                                                            </div>
                                                            <p className="text-xs text-themeTextGrey italic whitespace-pre-line">
                                                                Submitted text: "{task.submittedContent}"
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            {task.status === "REJECTED" && (
                                                                <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl flex items-start gap-2.5">
                                                                    <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                                                                    <div>
                                                                        <p className="text-xs font-bold text-red-400">Submission Rejected by Admin</p>
                                                                        <p className="text-xs text-themeTextGrey mt-0.5">Please review your submission and re-submit a corrected version below.</p>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <textarea
                                                                rows={4}
                                                                value={solution}
                                                                onChange={(e) => setSolution(e.target.value)}
                                                                placeholder="Paste GitHub repository links, hosted websites, or explain your text-based solution here..."
                                                                className="w-full p-4 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-themeTextGrey focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm leading-relaxed"
                                                            />

                                                            <div className="flex justify-end">
                                                                <Button
                                                                    onClick={() => handleSubmitSolution(task.id)}
                                                                    disabled={isPending}
                                                                    className="bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl flex items-center gap-2"
                                                                >
                                                                    {isPending ? (
                                                                        "Submitting..."
                                                                    ) : (
                                                                        <>
                                                                            <Send size={14} /> 
                                                                            {task.submittedContent ? "Update Submission" : "Submit Solution"}
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </GlassCard>
                        )
                    })
                )}
            </div>
        </div>
    )
}
