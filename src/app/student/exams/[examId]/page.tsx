"use client"

import confetti from "canvas-confetti"
import { AnimatePresence, motion } from "framer-motion"
import {
    AlertTriangle,
    Award,
    ChevronLeft,
    ChevronRight,
    Clock,
    Flag,
    RefreshCw,
    ShieldAlert,
    X
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import {
    getExamSessionDetails,
    getExamSessionDuration,
    submitExamAttemptAction,
    updateExamWarningAction,
    studentUpdateExamAnswersAction
} from "@/actions/student-actions"
import { Button } from "@/components/ui/button"

interface Message {
  id: string
  message: string
  createdAt: Date | string
  studentId: string
  student: {
    name: string
    rollNo: string
  }
}

const cleanQuestionText = (text: string) => {
    if (!text) return ""
    return text.replace(/^(?:q|question)?\s*\d+\s*[\.\)\-:]\s*/i, "")
}

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
    const [showSubmitModal, setShowSubmitModal] = useState(false)
    const [visited, setVisited] = useState<Record<string, boolean>>({})

    useEffect(() => {
        if (questions && questions[currentIdx]) {
            const qId = questions[currentIdx].id
            setVisited(prev => ({ ...prev, [qId]: true }))
        }
    }, [currentIdx, questions])

    // Completion State
    const [results, setResults] = useState<any>(null)

    // Refs
    const warningRef = useRef(0)
    const lastWarningTimeRef = useRef<number>(0)
    const answersRef = useRef<Record<string, string>>({})
    
    useEffect(() => {
        answersRef.current = answers
    }, [answers])
    const [isOnline, setIsOnline] = useState<boolean>(true)
    const [offlineSubmitting, setOfflineSubmitting] = useState<boolean>(false)
    const [isOfflinePending, setIsOfflinePending] = useState<boolean>(false)

    // Online/Offline tracking
    useEffect(() => {
        if (typeof window === "undefined") return
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)
        setIsOnline(navigator.onLine)
        window.addEventListener("online", handleOnline)
        window.addEventListener("offline", handleOffline)
        return () => {
            window.removeEventListener("online", handleOnline)
            window.removeEventListener("offline", handleOffline)
        }
    }, [])

    // Load offline cached details / drafts if exists
    useEffect(() => {
        if (typeof window !== "undefined" && attemptId) {
            const cached = localStorage.getItem(`pioneer_offline_exam_${attemptId}`)
            if (cached) {
                setIsOfflinePending(true)
                try {
                    const parsed = JSON.parse(cached)
                    setAnswers(parsed.answers || {})
                } catch (e) {}
            } else {
                const draft = localStorage.getItem(`pioneer_exam_answers_draft_${attemptId}`)
                if (draft) {
                    try {
                        const parsed = JSON.parse(draft)
                        setAnswers(prev => ({ ...prev, ...parsed }))
                    } catch (e) {}
                }
            }
        }
    }, [attemptId])

    // Auto submit helper for offline sync
    const syncOfflineExam = async () => {
        if (!attemptId) return
        setOfflineSubmitting(true)
        const cached = localStorage.getItem(`pioneer_offline_exam_${attemptId}`)
        if (!cached) {
            setIsOfflinePending(false)
            setOfflineSubmitting(false)
            return
        }

        try {
            const parsed = JSON.parse(cached)
            const answersToSubmit = parsed.answers || answers
            const res = await submitExamAttemptAction(attemptId, answersToSubmit)
            if (res.success) {
                toast.success("Exam synced and submitted successfully!")
                localStorage.removeItem(`pioneer_offline_exam_${attemptId}`)
                setResults(res)
                setCompleted(true)
                setIsOfflinePending(false)
            } else {
                toast.error(res.error || "Failed to sync exam. Retrying...")
            }
        } catch (err) {
            console.error("Error syncing offline exam:", err)
        } finally {
            setOfflineSubmitting(false)
        }
    }

    // Auto sync when back online
    useEffect(() => {
        if (isOnline && isOfflinePending && !offlineSubmitting) {
            syncOfflineExam()
        }
    }, [isOnline, isOfflinePending])

    // 1. Load exam session details on start
    useEffect(() => {
        if (!attemptId) return

        async function fetchDetails() {
            try {
                const res = await getExamSessionDetails(attemptId)
                if (res.success) {
                    setExamTitle(res.examTitle || "")
                    setQuestions(res.questions || [])
                    setDurationMinutes(res.duration || 60)

                    // Cache successfully fetched details
                    localStorage.setItem(`pioneer_exam_details_${attemptId}`, JSON.stringify({
                        examTitle: res.examTitle || "",
                        questions: res.questions || [],
                        duration: res.duration || 60,
                        startedAt: res.startedAt
                    }))

                    if (res.isCompleted) {
                        setCompleted(true)
                        setResults({
                            score: res.score,
                            totalQuestions: res.questions.length,
                            correctCount: res.questions.filter((q: any) => res.studentAnswers?.[q.id]?.trim().toUpperCase() === q.correctAnswer?.trim().toUpperCase()).length
                        })
                        setAnswers(res.studentAnswers || {})
                        setLoading(false)
                        return
                    }

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

                    // Recover saved draft answers from localStorage if any
                    const draft = localStorage.getItem(`pioneer_exam_answers_draft_${attemptId}`)
                    if (draft) {
                        try {
                            const parsed = JSON.parse(draft)
                            setAnswers(prev => ({ ...prev, ...parsed, ...res.studentAnswers }))
                        } catch (e) {}
                    } else if (res.studentAnswers) {
                        setAnswers(res.studentAnswers)
                    }

                    setLoading(false)
                } else {
                    toast.error(res.error || "Failed to load exam session")
                    router.push("/student/exams")
                }
            } catch (err) {
                console.error("Error loading exam details:", err)
                
                // Fallback to offline cached details
                const cachedDetails = localStorage.getItem(`pioneer_exam_details_${attemptId}`)
                if (cachedDetails) {
                    try {
                        const parsed = JSON.parse(cachedDetails)
                        setExamTitle(parsed.examTitle || "")
                        setQuestions(parsed.questions || [])
                        setDurationMinutes(parsed.duration || 60)
                        setStartedAt(parsed.startedAt ? new Date(parsed.startedAt) : new Date())
                        
                        // Calc remaining time
                        const startTime = parsed.startedAt ? new Date(parsed.startedAt).getTime() : new Date().getTime()
                        const durationMs = (parsed.duration || 60) * 60 * 1000
                        const now = new Date().getTime()
                        const timeLeftSecs = Math.max(0, Math.floor((startTime + durationMs - now) / 1000))
                        setSecondsLeft(timeLeftSecs)

                        const draft = localStorage.getItem(`pioneer_exam_answers_draft_${attemptId}`)
                        if (draft) {
                            setAnswers(JSON.parse(draft))
                        }

                        toast.info("Offline mode: loaded exam details from browser storage.")
                        setLoading(false)
                        return
                    } catch (e) {
                        console.error("Failed to parse cached details:", e)
                    }
                }

                setLoading(false)
            }
        }

        fetchDetails()
    }, [attemptId])

    // 2a. Global Keyboard, Clipboard, and Context Menu Blocker
    useEffect(() => {
        if (completed) return

        const blockContextMenu = (e: MouseEvent) => e.preventDefault()
        
        const blockKeys = (e: KeyboardEvent) => {
            const isCtrl = e.ctrlKey || e.metaKey
            const isAlt = e.altKey

            if (
                isAlt || // Covers Alt+Tab, Alt+F4, etc.
                isCtrl || // Covers Ctrl+C, Ctrl+V, etc.
                e.metaKey || // Win/Cmd key
                e.key === "PrintScreen" ||
                e.key === "F12" ||
                e.key === "Tab" // Block Tab navigation to prevent escaping
            ) {
                e.preventDefault()
                e.stopPropagation()
                e.stopImmediatePropagation()
                
                triggerWarning(`Keyboard shortcut detected: ${e.key}`)
                return
            }

            e.preventDefault()
            e.stopPropagation()
            e.stopImmediatePropagation()
            
            // Explicit alert on PrintScreen key pressed
            if (e.key === "PrintScreen" || e.keyCode === 44) {
                toast.error("Screenshots are strictly prohibited!")
            } else {
                toast.error("Keyboard inputs are blocked. Please use your mouse to navigate and select options.")
            }
        }

        const handleCopy = (e: ClipboardEvent) => {
            e.preventDefault()
            toast.error("Copying text is disabled during the exam.")
        }

        window.addEventListener("keydown", blockKeys, true)
        window.addEventListener("keyup", blockKeys, true)
        window.addEventListener("keypress", blockKeys, true)
        document.addEventListener("contextmenu", blockContextMenu)
        document.addEventListener("copy", handleCopy)

        return () => {
            window.removeEventListener("keydown", blockKeys, true)
            window.removeEventListener("keyup", blockKeys, true)
            window.removeEventListener("keypress", blockKeys, true)
            document.removeEventListener("contextmenu", blockContextMenu)
            document.removeEventListener("copy", handleCopy)
        }
    }, [completed])

    // 2b. Lockdown Protection Event Listeners (blur, visibility, fullscreen, beforeunload)
    useEffect(() => {
        if (!started || completed) return

        // Clear clipboard utility
        const clearClipboard = () => {
            try {
                navigator.clipboard.writeText("Lockdown: Screenshots and clipboard actions are blocked.")
            } catch (err) {}
        }

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
                clearClipboard()
            }
        }

        document.addEventListener("visibilitychange", handleVisibilityChange)

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

    // 3b. Dynamic background polling to update exam duration automatically if modified by admin
    useEffect(() => {
        if (!started || completed) return

        const pollTimer = setInterval(async () => {
            try {
                const res = await getExamSessionDuration(attemptId)
                if (res && res.success && typeof res.duration === "number") {
                    if (res.duration !== durationMinutes) {
                        setDurationMinutes(res.duration)
                        const startTime = res.startedAt ? new Date(res.startedAt).getTime() : (startedAt ? startedAt.getTime() : new Date().getTime())
                        const durationMs = res.duration * 60 * 1000
                        const now = new Date().getTime()
                        const timeLeftSecs = Math.max(0, Math.floor((startTime + durationMs - now) / 1000))
                        
                        setSecondsLeft(timeLeftSecs)
                        toast.info(`The exam duration has been adjusted by the instructor to ${res.duration} minutes.`)
                        
                        if (timeLeftSecs <= 0) {
                            toast.warning("The new exam duration has expired. Submitting answers.")
                            handleAutoSubmit()
                        }
                    }
                }
            } catch (err) {
                console.error("Polling error:", err)
            }
        }, 30000)

        return () => clearInterval(pollTimer)
    }, [started, completed, attemptId, durationMinutes, startedAt])

    // 4. Trigger Warning & Check termination limits
    const triggerWarning = async (reason: string) => {
        // Bypass lockdown warnings if offline to prevent OS/browser connection dialogs from terminating the exam
        if (typeof window !== "undefined" && !navigator.onLine) {
            console.log("Bypassing lockdown warning since student is offline:", reason)
            return
        }

        if (completed || isOfflinePending) return

        const now = Date.now()
        // 2-second cooldown to avoid multiple rapid triggers from single actions (e.g. Alt+Tab)
        if (now - lastWarningTimeRef.current < 2000) {
            return
        }
        lastWarningTimeRef.current = now

        const updatedCount = warningRef.current + 1
        warningRef.current = updatedCount
        setWarnings(updatedCount)

        toast.warning(`LOCKDOWN ALERT: ${reason} (Warning ${updatedCount}/3)`)

        // Save warnings count to database
        try {
            await updateExamWarningAction(attemptId, updatedCount)
        } catch (err) {
            console.error("Failed to update warning count on server:", err)
        }

        if (updatedCount >= 3) {
            toast.error("Exam terminated automatically due to repeated lockdown violations.")
            submitExam(true)
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
        setShowSubmitModal(true)
    }

    const submitExam = (auto = false) => {
        setCompleted(true)
        
        // Exit fullscreen
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {})
        }

        const currentAnswers = answersRef.current

        const onlineStatus = navigator.onLine
        if (!onlineStatus) {
            // Save to local storage
            localStorage.setItem(`pioneer_offline_exam_${attemptId}`, JSON.stringify({
                attemptId,
                answers: currentAnswers,
                timestamp: Date.now()
            }))
            setIsOfflinePending(true)
            toast.warning("You are currently offline. Your exam answers have been saved locally.")
            return
        }

        startTransition(async () => {
            try {
                const res = await submitExamAttemptAction(attemptId, currentAnswers)
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
            } catch (err) {
                console.error("Submission failed, caching locally:", err)
                localStorage.setItem(`pioneer_offline_exam_${attemptId}`, JSON.stringify({
                    attemptId,
                    answers,
                    timestamp: Date.now()
                }))
                setIsOfflinePending(true)
                toast.warning("Network error occurred. Your exam answers have been saved locally.")
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

    const cleanQuestionText = (text: string) => {
        return text.replace(/^\d+[\.\)\s]+/, "").trim()
    }

    const selectOption = (questionId: string, optionLetter: string) => {
        const updatedAnswers = {
            ...answers,
            [questionId]: optionLetter
        }
        setAnswers(updatedAnswers)

        // Save draft answers to local storage immediately
        localStorage.setItem(`pioneer_exam_answers_draft_${attemptId}`, JSON.stringify(updatedAnswers))

        if (attemptId) {
            studentUpdateExamAnswersAction(attemptId, updatedAnswers).catch(err => {
                console.error("Failed to persist answers immediately:", err)
            })
        }
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

    if (isOfflinePending) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
                <div className="w-full max-w-md p-8 bg-zinc-900/80 border border-amber-500/20 rounded-3xl space-y-6 text-center shadow-2xl backdrop-blur-md">
                    <div className="space-y-2">
                        <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
                            <AlertTriangle size={28} className="animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Offline - Pending Sync</h2>
                        <p className="text-xs text-zinc-400">
                            Your answers have been saved locally in your browser. We will submit them to the database as soon as your internet connection is restored.
                        </p>
                    </div>

                    <div className="bg-zinc-900/60 p-4 border border-zinc-800/60 rounded-2xl text-left space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-500">Connection Status:</span>
                            <span className={isOnline ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                                {isOnline ? "Online" : "Offline"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-500">Local Cache:</span>
                            <span className="text-zinc-300">Saved Successfully</span>
                        </div>
                    </div>

                    <Button
                        onClick={syncOfflineExam}
                        disabled={offlineSubmitting || !isOnline}
                        className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 text-black font-semibold rounded-xl py-4 flex items-center justify-center gap-2"
                    >
                        {offlineSubmitting ? (
                            <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Syncing Exam...
                            </>
                        ) : !isOnline ? (
                            "Waiting for Connection..."
                        ) : (
                            "Sync and Submit Now"
                        )}
                    </Button>
                    <p className="text-[10px] text-zinc-500">
                        Please do not close this browser tab. Your exam is safe.
                    </p>
                </div>
            </div>
        )
    }

    // Fullscreen exited overlay check
    if (started && !completed && !fullscreenActive) {
        return (
            <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
                <div className="w-full max-w-md p-8 bg-zinc-900/90 border border-red-500/20 rounded-3xl space-y-6 text-center shadow-2xl">
                    <div className="flex justify-center">
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl animate-bounce">
                            <ShieldAlert size={36} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-white tracking-tight">Lockdown Exited</h2>
                        <p className="text-sm text-zinc-400 leading-relaxed">
                            Fullscreen mode was exited. To protect exam integrity, you must re-enter fullscreen lockdown mode to resume the exam.
                        </p>
                    </div>
                    <Button
                        onClick={enterFullscreen}
                        className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-5 rounded-xl flex items-center justify-center gap-2"
                    >
                        Resume Exam & Lock Screen
                    </Button>
                </div>
            </div>
        )
    }


    // Completion View
    if (completed) {
        return (
            <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-6 md:p-12 overflow-y-auto backdrop-blur-sm animate-fade-in">
                <div className="w-full max-w-4xl p-6 md:p-8 bg-zinc-900/90 border border-zinc-800 rounded-3xl space-y-6 shadow-2xl relative my-auto max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
                    
                    {/* Close Button */}
                    <button 
                        onClick={() => router.push("/student/exams")}
                        className="absolute top-4 right-4 p-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all z-10"
                        title="Close Review"
                    >
                        <X size={16} />
                    </button>

                    {isPending ? (
                        <div className="text-center py-8 flex-1 flex flex-col items-center justify-center">
                            <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-white inline-block"></span>
                            <p className="text-sm text-zinc-500 mt-4">Grading your exam attempt...</p>
                        </div>
                    ) : results ? (
                        <div className="space-y-6 flex-1 flex flex-col overflow-hidden">
                            {/* Summary Card */}
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-zinc-950/40 p-5 border border-zinc-800/40 rounded-2xl shrink-0">
                                <div className="flex items-center gap-4 text-left">
                                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                                        <Award size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white tracking-tight">Exam Review: {examTitle}</h2>
                                        <p className="text-[11px] text-zinc-500">Review your questions and graded answers below.</p>
                                    </div>
                                </div>

                                <div className="flex gap-3 items-center">
                                    <div className="bg-zinc-900/60 px-4 py-2 border border-zinc-800/60 rounded-xl text-center min-w-[90px]">
                                        <p className="text-[9px] text-zinc-500 uppercase font-semibold">Percentage</p>
                                        <p className="text-lg font-extrabold text-white mt-0.5">{results.score}%</p>
                                    </div>
                                    <div className="bg-zinc-900/60 px-4 py-2 border border-zinc-800/60 rounded-xl text-center min-w-[90px]">
                                        <p className="text-[9px] text-zinc-500 uppercase font-semibold">Marks</p>
                                        <p className="text-lg font-extrabold text-white mt-0.5">
                                            {results.correctCount} / {results.totalQuestions}
                                        </p>
                                    </div>
                                    <Button
                                        onClick={() => router.push("/student/exams")}
                                        className="bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl px-5 h-10 text-xs shrink-0"
                                    >
                                        Return to Portal
                                    </Button>
                                </div>
                            </div>

                            {/* Detailed Answers Review */}
                            <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                                <h3 className="text-base font-bold text-white border-b border-zinc-800 pb-2 shrink-0">Questions & Answers Detail</h3>
                                <div className="space-y-4 overflow-y-auto pr-2 flex-1">
                                    {questions.map((q: any, idx: number) => {
                                        const studentAns = answers[q.id] || ""
                                        const correctAns = q.correctAnswer || ""
                                        const isCorrect = studentAns.trim().toUpperCase() === correctAns.trim().toUpperCase()

                                        return (
                                            <div key={q.id} className="p-4 bg-zinc-950/20 border border-zinc-800/80 rounded-2xl space-y-3">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <span className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">
                                                            Question {idx + 1}
                                                        </span>
                                                        <h4 className="text-xs font-semibold text-white leading-relaxed">
                                                            {q.questionText}
                                                        </h4>
                                                    </div>
                                                    {studentAns ? (
                                                        isCorrect ? (
                                                            <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-lg">
                                                                ✓ Correct
                                                            </span>
                                                        ) : (
                                                            <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-400/10 border border-rose-400/20 px-2 py-0.5 rounded-lg">
                                                                ✗ Incorrect
                                                            </span>
                                                        )
                                                    ) : (
                                                        <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-zinc-400 bg-zinc-800/30 border border-zinc-800/40 px-2 py-0.5 rounded-lg">
                                                            Unanswered
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Options List */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                                    {[
                                                        { key: "A", label: q.optionA },
                                                        { key: "B", label: q.optionB },
                                                        { key: "C", label: q.optionC },
                                                        { key: "D", label: q.optionD }
                                                    ].map((opt) => {
                                                        const isSelected = studentAns.trim().toUpperCase() === opt.key
                                                        const isRight = correctAns.trim().toUpperCase() === opt.key

                                                        let borderStyle = "border-zinc-800/60"
                                                        let bgStyle = "bg-zinc-900/40"
                                                        let textStyle = "text-zinc-300"

                                                        if (isRight) {
                                                            borderStyle = "border-emerald-500/30"
                                                            bgStyle = "bg-emerald-500/10"
                                                            textStyle = "text-emerald-300 font-semibold"
                                                        } else if (isSelected && !isRight) {
                                                            borderStyle = "border-rose-500/30"
                                                            bgStyle = "bg-rose-500/10"
                                                            textStyle = "text-rose-300 font-semibold"
                                                        }

                                                        return (
                                                            <div
                                                                key={opt.key}
                                                                className={`p-2.5 border rounded-xl flex items-center gap-2.5 text-[11px] ${borderStyle} ${bgStyle} ${textStyle}`}
                                                            >
                                                                <span className="w-4 h-4 rounded bg-black/40 flex items-center justify-center font-bold text-[9px]">
                                                                    {opt.key}
                                                                </span>
                                                                <span>{opt.label}</span>
                                                                {isRight && (
                                                                    <span className="ml-auto text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.5 rounded font-bold uppercase">
                                                                        Correct
                                                                    </span>
                                                                )}
                                                                {isSelected && !isRight && (
                                                                    <span className="ml-auto text-[8px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1 py-0.5 rounded font-bold uppercase">
                                                                        Your Answer
                                                                    </span>
                                                                )}
                                                                {isSelected && isRight && (
                                                                    <span className="ml-auto text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.5 rounded font-bold uppercase">
                                                                        Selected
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-red-400">Failed to grade attempt. Please contact an admin.</p>
                    )}
                </div>
            </div>
        )
    }

    // Pre-flight lobby view (Click to start full screen)
    if (!started) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 select-none">
                <div className="w-full max-w-lg p-8 bg-zinc-900/80 border border-zinc-800 rounded-3xl space-y-6 text-center shadow-2xl backdrop-blur-md">
                    <div className="flex justify-center">
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl animate-pulse">
                            <ShieldAlert size={36} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-white tracking-tight">{examTitle}</h2>
                        <p className="text-xs text-zinc-500">
                            Total Questions: {questions.length} | Duration: {durationMinutes} mins
                        </p>
                    </div>

                    <p className="text-sm text-zinc-300 leading-relaxed">
                        To guarantee a secure environment, this exam operates in **Lockdown Mode**. You must enter full screen. Moving focus or changing tabs will trigger a violation check.
                    </p>

                    <Button
                        onClick={enterFullscreen}
                        className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-6 rounded-xl flex items-center justify-center gap-2"
                    >
                        Enter Fullscreen & Start Exam
                    </Button>
                </div>
            </div>
        )
    }

    // Active exam layout
    const activeQuestion = questions[currentIdx]
    const currentSelection = answers[activeQuestion.id] || ""
    const isFlagged = !!flags[activeQuestion.id]

    return (
        <div className="h-screen max-h-screen bg-black text-white flex flex-col select-none overflow-hidden relative">
            {/* Top Floating Header Card */}
            <header className="z-10 m-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl px-6 py-4 flex items-center justify-between shrink-0 backdrop-blur-md shadow-lg">
                <div>
                    <h2 className="font-bold text-base truncate max-w-[200px] sm:max-w-md">{examTitle}</h2>
                    <p className="text-[10px] text-zinc-500">Roll Number Access Session</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Timer */}
                    <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3.5 py-2 rounded-xl">
                        <Clock size={16} className="text-zinc-400 animate-pulse" />
                        <span className="font-mono font-bold text-sm tracking-wider">{formatRemainingTime()}</span>
                    </div>

                    {/* Warnings log */}
                    <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold ${
                        warnings > 0 ? "bg-red-500/10 border border-red-500/20 text-red-400" : "bg-zinc-900 border border-zinc-800 text-zinc-400"
                    }`}>
                        <AlertTriangle size={14} /> Warnings: {warnings}/3
                    </div>

                    {/* Quick submit */}
                    <Button 
                        onClick={handleManualSubmit}
                        className="bg-white hover:bg-zinc-200 text-black font-semibold text-xs px-4 py-2 h-9 rounded-xl border-none"
                    >
                        Submit
                    </Button>
                </div>
            </header>

            {/* Split Workspace */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Side: Primary Question Workspace (Question & Options) as Floating Card */}
                <main className="flex-1 p-4 flex flex-col overflow-hidden">
                    {/* Upper Card: Question & MCQ options */}
                    <div className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 overflow-y-auto modern-scrollbar flex flex-col justify-between backdrop-blur-md shadow-lg">
                        <div className="space-y-8 flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full">
                            <div className="flex justify-between items-start gap-4">
                                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-lg">
                                    Question {currentIdx + 1} of {questions.length}
                                </span>
                            </div>

                            {/* Question Text */}
                            <div className="space-y-4">
                                <h3 className="text-xl md:text-2xl font-extrabold text-white leading-relaxed">
                                    {cleanQuestionText(activeQuestion.questionText)}
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
                                                    : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white text-base"
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
                    </div>

                    {/* Lower Card: Pagination and Mark for Review */}
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl px-8 py-5 flex justify-between items-center mt-4 backdrop-blur-md shadow-lg shrink-0">
                        <Button
                            onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                            disabled={currentIdx === 0}
                            variant="outline"
                            className="rounded-xl border border-zinc-800 bg-transparent text-white px-6 py-5 text-sm hover:bg-zinc-900 h-10 flex items-center justify-center gap-1.5"
                        >
                            <ChevronLeft size={16} /> Previous
                        </Button>

                        <button
                            onClick={() => toggleFlag(activeQuestion.id)}
                            className={`flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border transition-all ${
                                isFlagged 
                                    ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400" 
                                    : "bg-[#161616] border-zinc-800 text-zinc-400 hover:text-white"
                            }`}
                        >
                            <Flag size={14} fill={isFlagged ? "currentColor" : "none"} />
                            {isFlagged ? "Marked for Review" : "Mark for Review"}
                        </button>

                        <Button
                            onClick={() => {
                                if (currentIdx < questions.length - 1) {
                                    setCurrentIdx(prev => prev + 1)
                                } else {
                                    handleManualSubmit()
                                }
                            }}
                            className="rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold px-6 py-5 text-sm h-10 flex items-center justify-center gap-1.5"
                        >
                            {currentIdx === questions.length - 1 ? "Finish Attempt" : "Next"} <ChevronRight size={16} />
                        </Button>
                    </div>
                </main>

                {/* Right Side: Question Navigation Matrix as Floating Card */}
                <aside className="w-96 p-4 shrink-0 flex flex-col hidden md:flex overflow-hidden">
                    <div className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between backdrop-blur-md shadow-lg overflow-hidden">
                        <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-500 shrink-0">Questions Matrix</h3>
                            <div className="grid grid-cols-5 gap-2 overflow-y-auto pr-1 flex-1 modern-scrollbar">
                                {questions.map((q, idx) => {
                                    const isAnswered = !!answers[q.id]
                                    const isCurr = currentIdx === idx
                                    const isFlg = !!flags[q.id]
                                    const isVisited = !!visited[q.id]

                                    let btnStyle = "bg-zinc-950 border-zinc-850 text-zinc-500"
                                    if (isCurr) {
                                        btnStyle = "bg-white text-black border-white ring-2 ring-white/50"
                                    } else if (isFlg) {
                                        btnStyle = "bg-purple-600 border-purple-600 text-white font-bold"
                                    } else if (isAnswered) {
                                        btnStyle = "bg-green-600 border-green-600 text-white font-bold"
                                    } else if (isVisited) {
                                        btnStyle = "bg-red-600 border-red-600 text-white font-bold"
                                    }

                                    return (
                                        <button
                                            type="button"
                                            key={q.id}
                                            onClick={() => setCurrentIdx(idx)}
                                            className={`h-12 w-12 text-sm font-bold rounded-lg border transition-all flex items-center justify-center ${btnStyle}`}
                                            title={`Question ${idx + 1}`}
                                        >
                                            {idx + 1}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="border-t border-zinc-800/80 pt-4 mt-6 space-y-2 text-[10px] text-zinc-400">
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-zinc-950 border border-zinc-850" /> Unvisited
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-red-600 border border-red-600" /> Visited but Not Answered
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-green-600 border border-green-600" /> Answered
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-purple-600 border border-purple-600" /> Mark Review
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-white border border-white" /> Selected
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Custom Submit Confirmation Modal inside the Lockdown View */}
            <AnimatePresence>
                {showSubmitModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative"
                        >
                            <div className="flex items-center gap-2.5 text-amber-400 mb-4 bg-amber-400/10 border border-amber-400/20 px-3.5 py-2 rounded-xl text-xs font-semibold">
                                <AlertTriangle size={16} /> Submit Confirmation
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2">
                                Submit Your Exam?
                            </h3>
                            
                            {(() => {
                                const unansweredCount = questions.length - Object.keys(answers).length
                                return (
                                    <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                                        {unansweredCount > 0 
                                            ? `You have ${unansweredCount} unanswered questions left. Are you sure you want to finalize and submit your exam?`
                                            : "Are you sure you want to submit the exam? This action is permanent and cannot be undone."
                                        }
                                    </p>
                                )
                            })()}

                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    onClick={() => setShowSubmitModal(false)}
                                    variant="outline"
                                    className="flex-1 py-5 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-white text-xs font-semibold"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setShowSubmitModal(false)
                                        submitExam(false)
                                    }}
                                    className="flex-1 py-5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs border-none"
                                >
                                    Submit Exam
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
