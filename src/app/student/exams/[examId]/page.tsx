"use client"

import React, { useState, useEffect, useTransition, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import { 
    Clock, 
    AlertTriangle, 
    ChevronLeft, 
    ChevronRight, 
    Flag, 
    CheckSquare, 
    ShieldAlert, 
    HelpCircle,
    Award,
    CheckCircle2
} from "lucide-react"
import { toast } from "sonner"

import GlassCard from "@/components/global/glass-card"
import { Button } from "@/components/ui/button"
import { 
    getExamSessionDetails, 
    updateExamWarningAction, 
    submitExamAttemptAction 
} from "@/actions/student-actions"

export default function LockdownExamPage() {
    const router = useRouter()
    const params = useParams()
    const attemptId = params.examId as string

    const [loading, setLoading] = useState(true)
    const [started, setStarted] = useState(false)
    const [completed, setCompleted] = useState(false)
    const [isPending, startTransition] = useTransition()

    // Exam State
    const [examTitle, setExamTitle] = useState("")
    const [questions, setQuestions] = useState<any[]>([])
    const [durationMinutes, setDurationMinutes] = useState(60)
    const [startedAt, setStartedAt] = useState<Date | null>(null)
    const [secondsLeft, setSecondsLeft] = useState(3600)

    // Running Exam State
    const [currentIdx, setCurrentIdx] = useState(0)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [flags, setFlags] = useState<Record<string, boolean>>({})
    const [warnings, setWarnings] = useState(0)
    const [fullscreenActive, setFullscreenActive] = useState(false)

    // Completion State
    const [results, setResults] = useState<any>(null)

    // Refs
    const warningRef = useRef(0)

    // 1. Load exam session details on start
    useEffect(() => {
        if (!attemptId) return

        async function fetchDetails() {
            const res = await getExamSessionDetails(attemptId)
            if (res.success) {
                setExamTitle(res.examTitle || "")
                setQuestions(res.questions || [])
                setDurationMinutes(res.duration || 60)
                setStartedAt(res.startedAt ? new Date(res.startedAt) : new Date())
                setWarnings(res.warnings || 0)
                warningRef.current = res.warnings || 0

                // Calc remaining time
                const startTime = res.startedAt ? new Date(res.startedAt).getTime() : new Date().getTime()
                const durationMs = (res.duration || 60) * 60 * 1000
                const now = new Date().getTime()
                const timeLeftSecs = Math.max(0, Math.floor((startTime + durationMs - now) / 1000))
                setSecondsLeft(timeLeftSecs)

                if (timeLeftSecs <= 0) {
                    toast.error("Exam duration has already expired.")
                    handleAutoSubmit()
                }

                setLoading(false)
            } else {
                toast.error(res.error || "Failed to load exam session")
                router.push("/student/exams")
            }
        }

        fetchDetails()
    }, [attemptId])

    // 2a. Global Keyboard and Context Menu Blocker on Mount
    useEffect(() => {
        const blockContextMenu = (e: MouseEvent) => e.preventDefault()
        const blockKeys = (e: KeyboardEvent) => {
            e.preventDefault()
            e.stopPropagation()
            e.stopImmediatePropagation()
            toast.error("Keyboard interactions are disabled during the lockdown exam.")
        }

        window.addEventListener("keydown", blockKeys, true)
        window.addEventListener("keyup", blockKeys, true)
        window.addEventListener("keypress", blockKeys, true)
        document.addEventListener("contextmenu", blockContextMenu)

        return () => {
            window.removeEventListener("keydown", blockKeys, true)
            window.removeEventListener("keyup", blockKeys, true)
            window.removeEventListener("keypress", blockKeys, true)
            document.removeEventListener("contextmenu", blockContextMenu)
        }
    }, [])

    // 2b. Lockdown Protection Event Listeners (blur, visibility, fullscreen, beforeunload)
    useEffect(() => {
        if (!started || completed) return

        // Prevent reload or navigate away warning
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault()
            e.returnValue = "Lockdown Alert: Are you sure you want to exit the exam?"
            return e.returnValue
        }
        window.addEventListener("beforeunload", handleBeforeUnload)

        // Tab switches & Window Blur Protection
        const handleVisibilityChange = () => {
            if (document.hidden) {
                triggerWarning("Window switched / Tab changed detected.")
            }
        }
        const handleWindowBlur = () => {
            triggerWarning("Exam browser window lost focus.")
        }
        document.addEventListener("visibilitychange", handleVisibilityChange)
        window.addEventListener("blur", handleWindowBlur)

        // Fullscreen Change Detector
        const handleFullscreenChange = () => {
            const isFull = !!document.fullscreenElement
            setFullscreenActive(isFull)
            if (!isFull && started && !completed) {
                triggerWarning("Exited full screen mode.")
            }
        }
        document.addEventListener("fullscreenchange", handleFullscreenChange)

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload)
            document.removeEventListener("visibilitychange", handleVisibilityChange)
            window.removeEventListener("blur", handleWindowBlur)
            document.removeEventListener("fullscreenchange", handleFullscreenChange)
        }
    }, [started, completed])

    // 3. Countdown timer logic
    useEffect(() => {
        if (!started || completed) return

        const timer = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    toast.warning("Time's up! Automatically submitting your answers.")
                    handleAutoSubmit()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [started, completed])

    // 4. Trigger Warning & Check termination limits
    const triggerWarning = async (reason: string) => {
        if (completed) return

        const updatedCount = warningRef.current + 1
        warningRef.current = updatedCount
        setWarnings(updatedCount)

        toast.warning(`LOCKDOWN ALERT: ${reason} (Warning ${updatedCount}/3)`)

        // Save warnings count to database
        await updateExamWarningAction(attemptId, updatedCount)

        if (updatedCount >= 3) {
            toast.error("Exam terminated automatically due to repeated lockdown violations.")
            handleAutoSubmit()
        }
    }

    // 5. Enter Fullscreen Mode
    const enterFullscreen = async () => {
        try {
            const elem = document.documentElement
            if (elem.requestFullscreen) {
                await elem.requestFullscreen()
            }
            setFullscreenActive(true)
            setStarted(true)
        } catch (e) {
            toast.error("Failed to request full-screen. Please check your browser settings.")
        }
    }

    // 6. Submit functions
    const handleAutoSubmit = () => {
        submitExam(true)
    }

    const handleManualSubmit = () => {
        const unansweredCount = questions.length - Object.keys(answers).length
        const confirmMsg = unansweredCount > 0 
            ? `You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`
            : "Are you sure you want to submit the exam?"

        if (window.confirm(confirmMsg)) {
            submitExam(false)
        }
    }

    const submitExam = (auto = false) => {
        setCompleted(true)
        
        // Try exiting fullscreen
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {})
        }

        startTransition(async () => {
            const res = await submitExamAttemptAction(attemptId, answers)
            if (res.success) {
                setResults(res)
                toast.success("Exam submitted successfully!")
                
                if (res.score !== undefined && res.score >= 50) {
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 }
                    })
                }
            } else {
                toast.error(res.error || "Error occurred during grading.")
            }
        })
    }

    // Helpers
    const formatRemainingTime = () => {
        const h = Math.floor(secondsLeft / 3600)
        const m = Math.floor((secondsLeft % 3600) / 60)
        const s = secondsLeft % 60
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }

    const selectOption = (questionId: string, optionLetter: string) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: optionLetter
        }))
    }

    const toggleFlag = (questionId: string) => {
        setFlags(prev => ({
            ...prev,
            [questionId]: !prev[questionId]
        }))
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white">
                <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></span>
            </div>
        )
    }

    // Completion View
    if (completed) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
                <GlassCard className="w-full max-w-xl p-8 border border-themeGrey space-y-8 text-center">
                    <div className="flex justify-center">
                        <div className="p-4 bg-zinc-800/80 rounded-2xl text-white">
                            <Award size={48} className="animate-bounce" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-3xl font-bold tracking-tight text-white">Exam Completed</h2>
                        <p className="text-xs text-themeTextGrey">Attempt log for {examTitle}</p>
                    </div>

                    {isPending ? (
                        <div className="py-8 flex justify-center">
                            <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></span>
                        </div>
                    ) : results ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-zinc-950/60 p-4 border border-themeGrey/60 rounded-2xl text-center">
                                    <p className="text-xs text-themeTextGrey">Final Score</p>
                                    <p className="text-3xl font-extrabold text-white mt-1">{results.score}%</p>
                                </div>
                                <div className="bg-zinc-950/60 p-4 border border-themeGrey/60 rounded-2xl text-center">
                                    <p className="text-xs text-themeTextGrey">Questions Answered</p>
                                    <p className="text-3xl font-extrabold text-white mt-1">
                                        {results.correctCount} / {results.totalQuestions}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-zinc-950 p-4 border border-themeGrey/60 rounded-2xl text-left text-xs space-y-2">
                                <p className="font-bold uppercase tracking-wider text-[10px] text-themeTextGrey">Attempt Metadata</p>
                                <p className="text-themeTextWhite">Warnings Logged: <span className="font-semibold text-amber-400">{warnings} / 3</span></p>
                                <p className="text-themeTextWhite">Result Status: <span className="font-semibold text-emerald-400">{results.score >= 50 ? "PASSED" : "FAILED / UNDER GRADE"}</span></p>
                            </div>

                            <Button
                                onClick={() => router.push("/student/exams")}
                                className="w-full bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl py-4"
                            >
                                Return to Portal
                            </Button>
                        </div>
                    ) : (
                        <p className="text-sm text-red-400">Failed to grade attempt. Please contact an admin.</p>
                    )}
                </GlassCard>
            </div>
        )
    }

    // Pre-flight lobby view (Click to start full screen)
    if (!started) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 select-none">
                <GlassCard className="w-full max-w-lg p-8 border border-themeGrey space-y-6 text-center">
                    <div className="flex justify-center">
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl animate-pulse">
                            <ShieldAlert size={36} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-white tracking-tight">{examTitle}</h2>
                        <p className="text-xs text-themeTextGrey">
                            Total Questions: {questions.length} | Duration: {durationMinutes} mins
                        </p>
                    </div>

                    <p className="text-sm text-themeTextWhite leading-relaxed">
                        To guarantee a secure environment, this exam operates in **Lockdown Mode**. You must enter full screen. Moving focus or changing tabs will trigger a violation check.
                    </p>

                    <Button
                        onClick={enterFullscreen}
                        className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-6 rounded-xl flex items-center justify-center gap-2"
                    >
                        Enter Fullscreen & Start Exam
                    </Button>
                </GlassCard>
            </div>
        )
    }

    // Active exam layout
    const activeQuestion = questions[currentIdx]
    const currentSelection = answers[activeQuestion.id] || ""
    const isFlagged = !!flags[activeQuestion.id]

    return (
        <div className="min-h-screen bg-black text-white flex flex-col select-none">
            {/* Top Exam Status Bar */}
            <header className="bg-zinc-950 border-b border-themeGrey px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                    <h2 className="font-bold text-base truncate max-w-[200px] sm:max-w-md">{examTitle}</h2>
                    <p className="text-[10px] text-themeTextGrey">Roll Number Access Session</p>
                </div>

                <div className="flex items-center gap-6">
                    {/* Timer */}
                    <div className="flex items-center gap-2 bg-zinc-900 border border-themeGrey px-3.5 py-2 rounded-xl">
                        <Clock size={16} className="text-themeTextGrey animate-pulse" />
                        <span className="font-mono font-bold text-sm tracking-wider">{formatRemainingTime()}</span>
                    </div>

                    {/* Warnings log */}
                    <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold ${
                        warnings > 0 ? "bg-red-500/10 border border-red-500/20 text-red-400" : "bg-zinc-900 border border-themeGrey text-zinc-400"
                    }`}>
                        <AlertTriangle size={14} /> Warnings: {warnings}/3
                    </div>

                    {/* Quick submit */}
                    <Button 
                        onClick={handleManualSubmit}
                        className="bg-white hover:bg-zinc-200 text-black font-semibold text-xs px-4 py-2 h-9 rounded-xl"
                    >
                        Submit
                    </Button>
                </div>
            </header>

            {/* Split Workspace */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Side: Question Navigation Matrix */}
                <aside className="w-80 bg-zinc-950 border-r border-themeGrey p-5 shrink-0 flex flex-col justify-between hidden md:flex">
                    <div className="space-y-4 overflow-y-auto">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-themeTextGrey">Questions Matrix</h3>
                        <div className="grid grid-cols-5 gap-2">
                            {questions.map((q, idx) => {
                                const isAnswered = !!answers[q.id]
                                const isCurr = currentIdx === idx
                                const isFlg = !!flags[q.id]

                                let btnStyle = "bg-zinc-900 border-themeGrey text-themeTextGrey"
                                if (isCurr) {
                                    btnStyle = "bg-white text-black border-white"
                                } else if (isFlg) {
                                    btnStyle = "bg-indigo-500/20 border-indigo-500/40 text-indigo-400"
                                } else if (isAnswered) {
                                    btnStyle = "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                }

                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => setCurrentIdx(idx)}
                                        className={`h-9 w-9 text-xs font-bold rounded-lg border transition-all flex items-center justify-center ${btnStyle}`}
                                    >
                                        {idx + 1}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="border-t border-themeGrey pt-4 space-y-2 text-[10px] text-themeTextGrey">
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-zinc-800 border border-zinc-700" /> Unanswered
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40" /> Answered
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500/20 border border-indigo-500/40" /> Flagged
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-white border border-white" /> Selected
                        </div>
                    </div>
                </aside>

                {/* Right Side: Primary Question Workspace */}
                <main className="flex-1 bg-black p-8 overflow-y-auto flex flex-col justify-between">
                    {/* Content wrapper */}
                    <div className="space-y-8 flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full">
                        <div className="flex justify-between items-start gap-4">
                            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-lg">
                                Question {currentIdx + 1} of {questions.length}
                            </span>
                            <button
                                onClick={() => toggleFlag(activeQuestion.id)}
                                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg border transition-all ${
                                    isFlagged 
                                        ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" 
                                        : "bg-transparent border-zinc-800 text-zinc-400 hover:text-white"
                                }`}
                            >
                                <Flag size={12} fill={isFlagged ? "currentColor" : "none"} /> Flag
                            </button>
                        </div>

                        {/* Question Text */}
                        <div className="space-y-4">
                            <h3 className="text-2xl md:text-3xl font-extrabold text-white leading-relaxed">
                                {activeQuestion.questionText}
                            </h3>
                        </div>

                        {/* MCQ Options Grid */}
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                { key: "A", val: activeQuestion.optionA },
                                { key: "B", val: activeQuestion.optionB },
                                { key: "C", val: activeQuestion.optionC },
                                { key: "D", val: activeQuestion.optionD }
                            ].map((opt) => {
                                const selected = currentSelection === opt.key
                                return (
                                    <div
                                        key={opt.key}
                                        onClick={() => selectOption(activeQuestion.id, opt.key)}
                                        className={`flex items-center gap-5 p-5 rounded-xl border cursor-pointer select-none transition-all ${
                                            selected 
                                                ? "bg-white/[0.04] border-white text-white font-bold text-lg" 
                                                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white text-base"
                                        }`}
                                    >
                                        <div className={`h-8 w-8 rounded-full border text-sm font-bold flex items-center justify-center shrink-0 transition-all ${
                                            selected ? "bg-white text-black border-white" : "border-zinc-800 text-zinc-400"
                                        }`}>
                                            {opt.key}
                                        </div>
                                        <span className="leading-relaxed text-sm md:text-base">{opt.val}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Pagination Controls Footer */}
                    <div className="border-t border-zinc-800/80 pt-6 mt-8 flex justify-between items-center w-full max-w-5xl mx-auto">
                        <Button
                            onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                            disabled={currentIdx === 0}
                            variant="outline"
                            className="rounded-xl border border-zinc-850 bg-transparent text-white px-6 py-5 text-sm hover:bg-zinc-900"
                        >
                            <ChevronLeft size={16} /> Previous
                        </Button>
                        <Button
                            onClick={() => {
                                if (currentIdx < questions.length - 1) {
                                    setCurrentIdx(prev => prev + 1)
                                } else {
                                    handleManualSubmit()
                                }
                            }}
                            className="rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold px-6 py-5 text-sm"
                        >
                            {currentIdx === questions.length - 1 ? "Finish Attempt" : "Next"} <ChevronRight size={16} />
                        </Button>
                    </div>
                </main>
            </div>
        </div>
    )
}
