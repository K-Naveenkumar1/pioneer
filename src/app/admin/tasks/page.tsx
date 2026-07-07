"use client"

import React, { useState, useEffect, useTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
    CheckSquare, 
    PlusCircle, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    ChevronRight, 
    ChevronDown, 
    User, 
    Calendar,
    ThumbsUp,
    ThumbsDown
} from "lucide-react"
import { toast } from "sonner"

import GlassCard from "@/components/global/glass-card"
import { Button } from "@/components/ui/button"
import { 
    adminCreateTaskAction, 
    adminGetTasksAndSubmissions, 
    adminReviewSubmissionAction,
    adminGetClassesAction,
    adminDeclareNoTaskAction,
    adminCheckNoTaskAction
} from "@/actions/admin-actions"

export default function AdminTasksPage() {
    const [tasks, setTasks] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isPending, startTransition] = useTransition()
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)

    // Form inputs
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")

    // No Task declaration states
    const [classes, setClasses] = useState<any[]>([])
    const [selectedClassId, setSelectedClassId] = useState("")
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
    const [hasNoTask, setHasNoTask] = useState(false)

    useEffect(() => {
        loadTasks()
        loadClasses()
    }, [])

    useEffect(() => {
        if (selectedClassId && selectedDate) {
            checkNoTaskStatus()
        }
    }, [selectedClassId, selectedDate])

    const loadClasses = async () => {
        const res = await adminGetClassesAction()
        if (res.success) {
            setClasses(res.classes || [])
            if (res.classes && res.classes.length > 0) {
                setSelectedClassId(res.classes[0].id)
            }
        }
    }

    const checkNoTaskStatus = async () => {
        const res = await adminCheckNoTaskAction(selectedDate, selectedClassId)
        if (res.success) {
            setHasNoTask(res.declared ?? false)
        }
    }

    const handleDeclareNoTask = async () => {
        if (!selectedClassId) {
            toast.error("Please select a class first.")
            return
        }
        const res = await adminDeclareNoTaskAction(selectedDate, selectedClassId)
        if (res.success) {
            toast.success(res.message)
            checkNoTaskStatus()
        } else {
            toast.error(res.error || "Failed to toggle no-task declaration.")
        }
    }

    const loadTasks = async () => {
        setLoading(true)
        const res = await adminGetTasksAndSubmissions()
        if (res.success) {
            setTasks(res.tasks || [])
        } else {
            toast.error(res.error || "Failed to load tasks and submissions")
        }
        setLoading(false)
    }

    const handleCreateTask = (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || !description.trim()) {
            toast.error("Please provide both a title and description.")
            return
        }

        startTransition(async () => {
            const res = await adminCreateTaskAction(title, description)
            if (res.success) {
                toast.success(res.message || "Task allocated successfully.")
                setTitle("")
                setDescription("")
                loadTasks()
            } else {
                toast.error(res.error || "Failed to allocate task")
            }
        })
    }

    const handleReviewSubmission = (submissionId: string, status: "APPROVED" | "REJECTED") => {
        startTransition(async () => {
            const res = await adminReviewSubmissionAction(submissionId, status)
            if (res.success) {
                toast.success(res.message)
                loadTasks()
            } else {
                toast.error(res.error || "Failed to review submission")
            }
        })
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "APPROVED":
                return (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-md">
                        Approved
                    </span>
                )
            case "REJECTED":
                return (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-md">
                        Rejected
                    </span>
                )
            case "PENDING":
                return (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-md">
                        Pending Review
                    </span>
                )
            default:
                return null
        }
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
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                    <CheckSquare size={26} /> Tasks & Submissions
                </h1>
                <p className="text-sm text-themeTextGrey">Allocate learning tasks and review submitted work.</p>
            </div>

            {/* Split layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Task Form Column */}
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <PlusCircle size={18} /> Allocate New Task
                    </h3>
                    <GlassCard className="p-6 border border-themeGrey">
                        <form onSubmit={handleCreateTask} className="space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">
                                    Task Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Build a login page with NextJS"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-4 py-3 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-themeTextGrey focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">
                                    Task Description
                                </label>
                                <textarea
                                    rows={5}
                                    required
                                    placeholder="Detail the instructions, links, requirements, and submission instructions here..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full p-4 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-themeTextGrey focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm leading-relaxed"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={isPending}
                                className="w-full py-5 bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl"
                            >
                                {isPending ? "Allocating..." : "Allocate Task"}
                            </Button>
                        </form>
                    </GlassCard>

                    {/* Declare No Task Card */}
                    <div className="pt-4 space-y-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Calendar size={18} /> Declare No Task
                        </h3>
                        <GlassCard className="p-6 border border-themeGrey space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">
                                    Select Class/Batch
                                </label>
                                <select
                                    value={selectedClassId}
                                    onChange={(e) => setSelectedClassId(e.target.value)}
                                    className="w-full px-4 py-3 bg-black/40 border border-themeGrey rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm font-medium"
                                >
                                    {classes.map((cls) => (
                                        <option key={cls.id} value={cls.id} className="bg-zinc-950 text-white">
                                            {cls.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">
                                    Select Date
                                </label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-themeTextGrey focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm font-medium"
                                />
                            </div>

                            <Button
                                onClick={handleDeclareNoTask}
                                className={`w-full py-5 font-bold rounded-xl transition-all ${
                                    hasNoTask 
                                        ? "bg-amber-500 hover:bg-amber-600 text-black" 
                                        : "bg-[#161616] border border-themeGrey hover:bg-zinc-900 text-white"
                                }`}
                            >
                                {hasNoTask ? "⛔ Declare Task Status (Restore)" : "✅ Declare No Task for Today"}
                            </Button>
                            <p className="text-[10px] text-themeTextGrey leading-relaxed text-center">
                                Toggling this will declare that this class/batch does not have any tasks on this date, modifying attendance active hours compliance rules.
                            </p>
                        </GlassCard>
                    </div>
                </div>

                {/* Submissions List Column */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-lg font-bold text-white">
                        Allocated Tasks & Submissions ({tasks.length})
                    </h3>

                    {tasks.length === 0 ? (
                        <GlassCard className="p-8 text-center text-themeTextGrey text-sm border border-themeGrey">
                            No tasks have been allocated yet. Use the allocator on the left.
                        </GlassCard>
                    ) : (
                        <div className="space-y-4">
                            {tasks.map((task: any) => {
                                const isExpanded = expandedTaskId === task.id
                                const submissionCount = task.submissions?.length || 0

                                return (
                                    <GlassCard 
                                        key={task.id} 
                                        className="border border-themeGrey overflow-hidden transition-all duration-300 hover:border-zinc-700"
                                    >
                                        {/* Accordion header */}
                                        <div
                                            onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                                            className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/[0.01]"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 bg-zinc-900 border border-themeGrey rounded-xl text-white">
                                                    <CheckSquare size={16} />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-sm text-white">{task.title}</h4>
                                                    <p className="text-[11px] text-themeTextGrey">
                                                        Created: {new Date(task.createdAt).toLocaleDateString()} | Submissions: <span className="font-bold text-white">{submissionCount}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            {isExpanded ? <ChevronDown size={18} className="text-themeTextGrey" /> : <ChevronRight size={18} className="text-themeTextGrey" />}
                                        </div>

                                        {/* Accordion content */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="border-t border-themeGrey/60 bg-black/40 p-5 space-y-6"
                                                >
                                                    {/* Task Info */}
                                                    <div>
                                                        <h5 className="text-[10px] font-bold text-themeTextGrey uppercase tracking-wider mb-2">Instructions</h5>
                                                        <p className="text-xs text-themeTextWhite whitespace-pre-line leading-relaxed">
                                                            {task.description}
                                                        </p>
                                                    </div>

                                                    {/* Submissions Section */}
                                                    <div className="border-t border-themeGrey/40 pt-5 space-y-4">
                                                        <h5 className="text-xs font-bold text-white">Student Submissions</h5>
                                                        
                                                        {submissionCount === 0 ? (
                                                            <p className="text-xs text-themeTextGrey italic">No submissions have been made for this task yet.</p>
                                                        ) : (
                                                            <div className="space-y-4">
                                                                {task.submissions.map((sub: any) => (
                                                                    <div 
                                                                        key={sub.id} 
                                                                        className="bg-zinc-950 p-4 border border-themeGrey/60 rounded-xl space-y-4"
                                                                    >
                                                                        <div className="flex justify-between items-start">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="p-1.5 bg-zinc-900 border border-themeGrey rounded-lg text-themeTextGrey">
                                                                                    <User size={12} />
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-xs font-bold text-white">{sub.student?.name}</p>
                                                                                    <p className="text-[9px] text-themeTextGrey">Roll: {sub.student?.rollNo} | {new Date(sub.submittedAt).toLocaleString()}</p>
                                                                                </div>
                                                                            </div>
                                                                            {getStatusBadge(sub.status)}
                                                                        </div>

                                                                        <div className="bg-black/40 border border-themeGrey/40 p-3 rounded-lg text-xs font-mono text-themeTextWhite whitespace-pre-wrap select-all">
                                                                            {sub.content}
                                                                        </div>

                                                                        {sub.status === "PENDING" && (
                                                                            <div className="flex gap-2 justify-end">
                                                                                <Button
                                                                                    onClick={() => handleReviewSubmission(sub.id, "REJECTED")}
                                                                                    disabled={isPending}
                                                                                    variant="outline"
                                                                                    className="h-8 rounded-lg border border-red-500/20 text-red-400 bg-red-500/5 hover:bg-red-500/10 text-xs px-3"
                                                                                >
                                                                                    <ThumbsDown size={12} className="mr-1" /> Reject
                                                                                </Button>
                                                                                <Button
                                                                                    onClick={() => handleReviewSubmission(sub.id, "APPROVED")}
                                                                                    disabled={isPending}
                                                                                    className="h-8 rounded-lg bg-emerald-500 text-black hover:bg-emerald-600 text-xs px-3"
                                                                                >
                                                                                    <ThumbsUp size={12} className="mr-1" fill="currentColor" /> Approve
                                                                                </Button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </GlassCard>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
