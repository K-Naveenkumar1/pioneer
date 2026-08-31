"use client"

import React, { useState, useEffect, useRef, useTransition } from "react"
import { useRouter, useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import { 
    Clock, 
    AlertTriangle, 
    ChevronLeft, 
    ChevronRight, 
    ShieldAlert, 
    Award,
    Code,
    Play,
    RefreshCw,
    Terminal,
    ChevronDown,
    Lock,
    Eye,
    CheckCircle2,
    XCircle
} from "lucide-react"
import { toast } from "sonner"

import BackdropGradient from "@/components/global/backdrop-gradient"
import GlassCard from "@/components/global/glass-card"
import { Button } from "@/components/ui/button"
import { 
    getExamSessionDetails, 
    updateExamWarningAction, 
    runCodeAction,
    gradeCodingQuestionAction,
    submitCodingExamAction,
    saveCodingDraftAction
} from "@/actions/student-actions"

// Map languages to Judge0 CE IDs
const LANGUAGES = [
    { 
        id: "javascript", 
        name: "JavaScript", 
        ext: "js", 
        judge0Id: 102, 
        default: `// Javascript Solution\n// Read from standard input if required\n\nfunction solve() {\n    // Write your code here\n}\nsolve();` 
    },
    { 
        id: "python", 
        name: "Python", 
        ext: "py", 
        judge0Id: 100, 
        default: `# Python Solution\n# Write your code here\n` 
    },
    { 
        id: "cpp", 
        name: "C++", 
        ext: "cpp", 
        judge0Id: 105, 
        default: `// C++ Solution\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}` 
    },
    { 
        id: "java", 
        name: "Java", 
        ext: "java", 
        judge0Id: 91, 
        default: `// Java Solution\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}` 
    },
    { 
        id: "html", 
        name: "HTML", 
        ext: "html", 
        judge0Id: 43, 
        default: `<!-- HTML Solution -->\n<!DOCTYPE html>\n<html>\n<head>\n    <title>Title</title>\n</head>\n<body>\n    <h1>Hello, World!</h1>\n</body>\n</html>` 
    },
    { 
        id: "css", 
        name: "CSS", 
        ext: "css", 
        judge0Id: 43, 
        default: `/* CSS Solution */\nbody {\n    color: powderblue;\n}` 
    }
]

export default function LockdownCodingExamPage() {
    const router = useRouter()
    const params = useParams()
    const attemptId = params.attemptId as string

    const [loading, setLoading] = useState(true)
    const [started, setStarted] = useState(false)
    const [completed, setCompleted] = useState(false)
    const [isPending, startTransition] = useTransition()

    // Exam Metadata
    const [examTitle, setExamTitle] = useState("")
    const [questions, setQuestions] = useState<any[]>([])
    const [durationMinutes, setDurationMinutes] = useState(60)
    const [startedAt, setStartedAt] = useState<Date | null>(null)
    const [secondsLeft, setSecondsLeft] = useState(3600)

    // Editor & Workspace State
    const [currentIdx, setCurrentIdx] = useState(0)
    const [selectedLang, setSelectedLang] = useState(LANGUAGES[1]) // Python default
    const [codes, setCodes] = useState<Record<string, string>>({}) // key: questionId, value: code string
    const [langs, setLangs] = useState<Record<string, string>>({}) // key: questionId, value: languageId string
    
    // Outputs & Graded Submissions
    const [isRunning, setIsRunning] = useState(false)
    const [stdout, setStdout] = useState("")
    const [stderr, setStderr] = useState("")
    const [testResults, setTestResults] = useState<any[] | null>(null)
    const [gradedSubmissions, setGradedSubmissions] = useState<Record<string, any>>({}) // key: questionId, value: { marks: number, results: any[] }

    // Lockdown States
    const [warnings, setWarnings] = useState(0)
    const [fullscreenActive, setFullscreenActive] = useState(false)
    const [showSubmitModal, setShowSubmitModal] = useState(false)

    // Refs & Offline States
    const warningRef = useRef(0)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const lastWarningTimeRef = useRef<number>(0)
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
            const cached = localStorage.getItem(`pioneer_offline_coding_exam_${attemptId}`)
            if (cached) {
                setIsOfflinePending(true)
                try {
                    const parsed = JSON.parse(cached)
                    setCodes(parsed.codes || {})
                    setLangs(parsed.langs || {})
                } catch (e) {}
            } else {
                const draftCodes = localStorage.getItem(`pioneer_coding_exam_codes_draft_${attemptId}`)
                if (draftCodes) {
                    try {
                        setCodes(prev => ({ ...prev, ...JSON.parse(draftCodes) }))
                    } catch (e) {}
                }
                const draftLangs = localStorage.getItem(`pioneer_coding_exam_langs_draft_${attemptId}`)
                if (draftLangs) {
                    try {
                        setLangs(prev => ({ ...prev, ...JSON.parse(draftLangs) }))
                    } catch (e) {}
                }
            }
        }
    }, [attemptId])

    // Auto submit helper for offline sync
    const syncOfflineCodingExam = async () => {
        if (!attemptId || !questions.length) return
        setOfflineSubmitting(true)
        const cached = localStorage.getItem(`pioneer_offline_coding_exam_${attemptId}`)
        if (!cached) {
            setIsOfflinePending(false)
            setOfflineSubmitting(false)
            return
        }

        try {
            const parsed = JSON.parse(cached)
            const codesToSubmit = parsed.codes || codes
            const langsToSubmit = parsed.langs || langs

            // Grade all questions sequentially
            for (const q of questions) {
                const code = codesToSubmit[q.id] || ""
                const savedLangId = langsToSubmit[q.id] || "python"
                const lang = LANGUAGES.find(l => l.id === savedLangId) || LANGUAGES[1]
                
                toast.loading(`Grading question: ${q.title || "Code"}...`, { id: `sync-grading-${q.id}` })
                try {
                    await gradeCodingQuestionAction(attemptId, q.id, code, lang.judge0Id)
                } catch (e) {
                    console.error(`Failed to grade question ${q.id}:`, e)
                } finally {
                    toast.dismiss(`sync-grading-${q.id}`)
                }
            }

            // Finalize submission
            const res = await submitCodingExamAction(attemptId)
            if (res.success) {
                toast.success(`Exam submitted successfully! Final Score: ${res.score || 0}`)
                localStorage.removeItem(`pioneer_offline_coding_exam_${attemptId}`)
                setCompleted(true)
                setIsOfflinePending(false)
                router.push("/student/coding-exam")
            } else {
                toast.error(res.error || "Failed to finalize exam.")
            }
        } catch (err) {
            console.error("Error syncing offline coding exam:", err)
        } finally {
            setOfflineSubmitting(false)
        }
    }

    // Auto sync when back online
    useEffect(() => {
        if (isOnline && isOfflinePending && !offlineSubmitting && started) {
            syncOfflineCodingExam()
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
                    setStartedAt(res.startedAt ? new Date(res.startedAt) : new Date())
                    setWarnings(res.warnings || 0)
                    warningRef.current = res.warnings || 0

                    // Cache successfully fetched details
                    localStorage.setItem(`pioneer_coding_exam_details_${attemptId}`, JSON.stringify({
                        examTitle: res.examTitle || "",
                        questions: res.questions || [],
                        duration: res.duration || 60,
                        startedAt: res.startedAt
                    }))

                    // Restore saved coding submissions if any
                    if (res.codingSubmissions) {
                        try {
                            const subsMap = JSON.parse(res.codingSubmissions)
                            setGradedSubmissions(subsMap)
                            
                            // Populate editor codes and languages with restored submissions
                            const initialCodes: Record<string, string> = {}
                            const initialLangs: Record<string, string> = {}
                            res.questions.forEach((q: any) => {
                                const sub = subsMap[q.id]
                                if (sub) {
                                    initialCodes[q.id] = sub.code
                                    const lang = LANGUAGES.find(l => l.judge0Id === sub.languageId)
                                    if (lang) {
                                        initialLangs[q.id] = lang.id
                                    }
                                }
                            })
                            
                            // Load draft local storage values to merge/override if exists
                            const draftCodes = localStorage.getItem(`pioneer_coding_exam_codes_draft_${attemptId}`)
                            const draftLangs = localStorage.getItem(`pioneer_coding_exam_langs_draft_${attemptId}`)
                            const parsedDraftCodes = draftCodes ? JSON.parse(draftCodes) : {}
                            const parsedDraftLangs = draftLangs ? JSON.parse(draftLangs) : {}

                            setCodes(prev => ({ ...prev, ...initialCodes, ...parsedDraftCodes }))
                            setLangs(prev => ({ ...prev, ...initialLangs, ...parsedDraftLangs }))
                        } catch (err) {
                            console.error("Error restoring coding submissions:", err)
                        }
                    }

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
                    router.push("/student/coding-exam")
                }
            } catch (err) {
                console.error("Error loading exam details:", err)
                
                // Fallback to offline cached details
                const cachedDetails = localStorage.getItem(`pioneer_coding_exam_details_${attemptId}`)
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

                        // Load drafts
                        const draftCodes = localStorage.getItem(`pioneer_coding_exam_codes_draft_${attemptId}`)
                        if (draftCodes) {
                            setCodes(JSON.parse(draftCodes))
                        }
                        const draftLangs = localStorage.getItem(`pioneer_coding_exam_langs_draft_${attemptId}`)
                        if (draftLangs) {
                            setLangs(JSON.parse(draftLangs))
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

    // 2. Tab switches & Window Blur Protection (Lockdown warnings)
    useEffect(() => {
        if (!started || completed) return

        // Prevent Right-click Context Menu
        const blockContextMenu = (e: MouseEvent) => e.preventDefault()
        document.addEventListener("contextmenu", blockContextMenu)

        // Tab switches & Window Blur Protection
        const handleVisibilityChange = () => {
            if (document.hidden) {
                triggerWarning("Window switched or Tab changed detected.")
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
            document.removeEventListener("contextmenu", blockContextMenu)
            document.removeEventListener("visibilitychange", handleVisibilityChange)
            document.removeEventListener("fullscreenchange", handleFullscreenChange)
        }
    }, [started, completed])

    // 3. Block Copy-Paste inside the coding editor and the whole screen
    useEffect(() => {
        if (!started || completed) return

        const handleCopy = (e: ClipboardEvent) => {
            e.preventDefault()
            toast.error("Copying text is strictly disabled during the exam!")
        }

        const handlePaste = (e: ClipboardEvent) => {
            e.preventDefault()
            toast.error("Pasting text is strictly disabled during the exam!")
        }

        const handleCut = (e: ClipboardEvent) => {
            e.preventDefault()
            toast.error("Cutting text is disabled during the exam!")
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            const isCtrl = e.ctrlKey || e.metaKey
            const isAlt = e.altKey
            const key = e.key.toLowerCase()

            // Block copy, paste, and cut (without warning)
            if (isCtrl && (key === 'c' || key === 'v' || key === 'x')) {
                e.preventDefault()
                e.stopPropagation()
                toast.error("Copy, paste, and cut actions are disabled during the exam.")
                return
            }

            // Block other shortcuts with warnings (Win Key, Alt shortcuts, F12, Inspect, etc.)
            if (
                isAlt || // Alt combinations
                (isCtrl && (key === 'a' || key === 'u')) || // Select All, View Source
                e.key === "PrintScreen" ||
                e.key === "F12" ||
                (isCtrl && e.shiftKey && key === 'i') || // Inspect element
                e.metaKey // Windows / CMD key
            ) {
                e.preventDefault()
                e.stopPropagation()
                triggerWarning(`Unauthorized keyboard shortcut attempted: ${e.key}`)
            }
        }

        document.addEventListener("copy", handleCopy)
        document.addEventListener("paste", handlePaste)
        document.addEventListener("cut", handleCut)
        document.addEventListener("keydown", handleKeyDown, true)

        return () => {
            document.removeEventListener("copy", handleCopy)
            document.removeEventListener("paste", handlePaste)
            document.removeEventListener("cut", handleCut)
            document.removeEventListener("keydown", handleKeyDown, true)
        }
    }, [started, completed])

    // 4. Timer ticking
    useEffect(() => {
        if (!started || completed) return

        const timer = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    toast.warning("Time is up! Submitting exam answers...")
                    handleAutoSubmit()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [started, completed])

    // 5. Trigger Warning & Check termination limits (Only 1 warning allowed!)
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

        toast.warning(`LOCKDOWN ALERT: ${reason} (Warning ${updatedCount}/2)`)

        // Save warnings count to database
        try {
            await updateExamWarningAction(attemptId, updatedCount)
        } catch (err) {
            console.error("Failed to update warning count on server:", err)
        }

        if (updatedCount >= 2) {
            toast.error("Exam terminated automatically due to repeated lockdown violations.")
            handleAutoSubmit()
        }
    }

    // Enter Fullscreen Mode to start exam
    const enterFullscreen = async () => {
        try {
            const elem = document.documentElement
            if (elem.requestFullscreen) {
                await elem.requestFullscreen()
            }
            setFullscreenActive(true)
            setStarted(true)
        } catch (e) {
            toast.error("Failed to request full-screen. Fullscreen is required to start the exam.")
        }
    }

    // Auto submit helper
    const handleAutoSubmit = async () => {
        setCompleted(true)
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {})
        }

        const onlineStatus = navigator.onLine
        if (!onlineStatus) {
            localStorage.setItem(`pioneer_offline_coding_exam_${attemptId}`, JSON.stringify({
                attemptId,
                codes,
                langs,
                timestamp: Date.now()
            }))
            setIsOfflinePending(true)
            toast.warning("You are currently offline. Your exam answers have been saved locally.")
            return
        }

        try {
            const res = await submitCodingExamAction(attemptId)
            if (res.success) {
                toast.success("Exam submitted successfully.")
                router.push("/student/coding-exam")
            } else {
                toast.error(res.error || "Failed to finalize exam.")
            }
        } catch (err) {
            console.error("Auto submit failed, caching offline:", err)
            localStorage.setItem(`pioneer_offline_coding_exam_${attemptId}`, JSON.stringify({
                attemptId,
                codes,
                langs,
                timestamp: Date.now()
            }))
            setIsOfflinePending(true)
        }
    }

    // Format seconds to MM:SS
    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60)
        const s = secs % 60
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    const currentQuestion = questions[currentIdx]

    // Code state handlers
    const currentCode = currentQuestion ? (codes[currentQuestion.id] || selectedLang.default) : ""
    
    useEffect(() => {
        if (!currentQuestion) return
        const savedLangId = langs[currentQuestion.id] || LANGUAGES[1].id // default python
        const lang = LANGUAGES.find(l => l.id === savedLangId) || LANGUAGES[1]
        setSelectedLang(lang)
    }, [currentIdx, currentQuestion])

    // Question switcher to save database draft before navigating
    const switchQuestion = (newIdx: number) => {
        if (currentQuestion && attemptId) {
            const codeToSave = codes[currentQuestion.id] || selectedLang.default
            const langId = langs[currentQuestion.id] || LANGUAGES[1].id
            const langObj = LANGUAGES.find(l => l.id === langId) || LANGUAGES[1]

            saveCodingDraftAction(attemptId, currentQuestion.id, codeToSave, langObj.judge0Id).catch(err => {
                console.error("Failed to save coding draft:", err)
            })
        }
        setCurrentIdx(newIdx)
    }

    // Periodic auto-save to database every 10 seconds
    useEffect(() => {
        if (!started || completed || !currentQuestion || !attemptId) return

        const autoSaveTimer = setInterval(() => {
            const onlineStatus = navigator.onLine
            if (onlineStatus) {
                const codeToSave = codes[currentQuestion.id] || selectedLang.default
                saveCodingDraftAction(attemptId, currentQuestion.id, codeToSave, selectedLang.judge0Id).catch(err => {
                    console.error("Failed to auto-save coding draft:", err)
                })
            }
        }, 10000)

        return () => clearInterval(autoSaveTimer)
    }, [started, completed, currentQuestion, attemptId, codes, selectedLang])

    const handleCodeChange = (val: string) => {
        if (!currentQuestion) return
        const newCodes = { ...codes, [currentQuestion.id]: val }
        setCodes(newCodes)
        localStorage.setItem(`pioneer_coding_exam_codes_draft_${attemptId}`, JSON.stringify(newCodes))
    }

    const handleLanguageChange = (langId: string) => {
        if (!currentQuestion) return
        const lang = LANGUAGES.find(l => l.id === langId)
        if (lang) {
            setSelectedLang(lang)
            const newLangs = { ...langs, [currentQuestion.id]: langId }
            setLangs(newLangs)
            localStorage.setItem(`pioneer_coding_exam_langs_draft_${attemptId}`, JSON.stringify(newLangs))
            // Only overwrite code if it wasn't modified
            if (!codes[currentQuestion.id] || codes[currentQuestion.id] === selectedLang.default) {
                const newCodes = { ...codes, [currentQuestion.id]: lang.default }
                setCodes(newCodes)
                localStorage.setItem(`pioneer_coding_exam_codes_draft_${attemptId}`, JSON.stringify(newCodes))
            }
        }
    }

    const handleReset = () => {
        if (!currentQuestion) return
        if (window.confirm("Reset current editor contents? Your current solution code will be lost.")) {
            setCodes(prev => ({ ...prev, [currentQuestion.id]: selectedLang.default }))
            setStdout("")
            setStderr("")
            setTestResults(null)
        }
    }

    // Compile & Run code locally on current question's Sample Input
    const handleCompileAndRun = async () => {
        if (!currentQuestion) return
        setIsRunning(true)
        setStdout("")
        setStderr("")
        setTestResults(null)

        try {
            const input = currentQuestion.sampleInput || ""
            const expected = (currentQuestion.sampleOutput || "").trim()

            const res = await runCodeAction(selectedLang.judge0Id, currentCode, input)
            setIsRunning(false)

            if (res.success && res.result) {
                const runResult = res.result
                if (runResult.compile_output) {
                    setStderr(runResult.compile_output)
                    toast.error("Compilation error detected.")
                } else if (runResult.stderr) {
                    setStderr(runResult.stderr)
                    toast.error("Runtime error detected.")
                } else {
                    const actualOut = (runResult.stdout || "").trim()
                    setStdout(runResult.stdout || "Execution completed with no stdout.")
                    
                    const passed = actualOut === expected
                    if (passed) {
                        toast.success("Sample testcase passed successfully!")
                    } else {
                        toast.error("Sample testcase failed (Wrong Answer).")
                    }
                }
            } else {
                toast.error(res.error || "Execution server error.")
            }
        } catch (err) {
            setIsRunning(false)
            setStderr("Error connecting to compiler backend API.")
            toast.error("Compilation network error.")
        }
    }

    // Grade and Submit Solution for Current Question (All Test Cases)
    const handleSubmitSolution = async () => {
        if (!currentQuestion) return
        setIsRunning(true)
        setStdout("")
        setStderr("")
        setTestResults(null)

        toast.loading("Submitting solution & executing hidden test cases...", { id: "grading" })

        try {
            const res = await gradeCodingQuestionAction(attemptId, currentQuestion.id, currentCode, selectedLang.judge0Id)
            setIsRunning(false)
            toast.dismiss("grading")

            if (res.success) {
                toast.success(`Question Graded! Score: ${res.score}/100`)
                setTestResults(res.results || [])
                setGradedSubmissions(prev => ({
                    ...prev,
                    [currentQuestion.id]: {
                        code: currentCode,
                        languageId: selectedLang.judge0Id,
                        marks: res.score,
                        testCaseResults: res.results
                    }
                }))
            } else {
                toast.error(res.error || "Failed to submit and grade solution.")
            }
        } catch (err) {
            setIsRunning(false)
            toast.dismiss("grading")
            toast.error("Grade submit failed.")
        }
    }

    // Submit complete exam
    const handleFinalSubmitExam = async () => {
        setShowSubmitModal(false)
        setLoading(true)

        const onlineStatus = navigator.onLine
        if (!onlineStatus) {
            setLoading(false)
            localStorage.setItem(`pioneer_offline_coding_exam_${attemptId}`, JSON.stringify({
                attemptId,
                codes,
                langs,
                timestamp: Date.now()
            }))
            setIsOfflinePending(true)
            toast.warning("You are currently offline. Your exam answers have been saved locally.")
            return
        }

        try {
            const res = await submitCodingExamAction(attemptId)
            if (res.success) {
                confetti({
                    particleCount: 150,
                    spread: 80,
                    origin: { y: 0.6 }
                })
                toast.success(`Exam submitted successfully! Final Score: ${res.score || 0}`)
                router.push("/student/coding-exam")
            } else {
                toast.error(res.error || "Submission failed.")
                setLoading(false)
            }
        } catch (err) {
            console.error("Submission failed, caching offline:", err)
            localStorage.setItem(`pioneer_offline_coding_exam_${attemptId}`, JSON.stringify({
                attemptId,
                codes,
                langs,
                timestamp: Date.now()
            }))
            setIsOfflinePending(true)
            setLoading(false)
        }
    }

    // Editor key handler for tab indents
    const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Tab") {
            e.preventDefault()
            const start = e.currentTarget.selectionStart
            const end = e.currentTarget.selectionEnd
            
            const newValue = currentCode.substring(0, start) + "    " + currentCode.substring(end)
            handleCodeChange(newValue)
            
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4
                }
            }, 0)
        }
    }

    // Entrance view
    if (!started) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <BackdropGradient className="w-[400px] h-[400px] opacity-20" container="absolute"><></></BackdropGradient>
                <GlassCard className="w-full max-w-xl p-8 border border-themeGrey space-y-6 text-center z-10">
                    <div className="flex justify-center text-red-500">
                        <div className="p-4 bg-zinc-900 border border-themeGrey rounded-2xl animate-pulse">
                            <Lock size={40} className="text-amber-500" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-3xl font-extrabold tracking-tight text-white">{examTitle || "Secure Coding Examination"}</h2>
                        <p className="text-xs text-themeTextGrey">Lockdown monitor is active. Ensure guidelines are adhered to.</p>
                    </div>

                    <div className="text-left bg-[#0c0c0c] p-6 rounded-2xl border border-themeGrey/60 space-y-4 text-xs text-themeTextGrey leading-relaxed">
                        <p className="font-bold text-white flex items-center gap-1.5 mb-1 text-sm border-b border-themeGrey/40 pb-2">
                            <ShieldAlert size={16} className="text-amber-500" />
                            Lockdown Integrity Agreement:
                        </p>
                        <ul className="list-disc pl-4 space-y-2.5">
                            <li>To prevent unauthorized resources, this workspace runs in **Fullscreen Mode**.</li>
                            <li>Switching tabs, minimizing, resizing, or exiting browser focus registers as a violation.</li>
                            <li>On the **2nd violation**, the session will automatically terminate, finalize, and grade.</li>
                            <li>Keyboard shortcuts for copying, pasting, and inspector keys are restricted.</li>
                        </ul>
                    </div>

                    <Button
                        onClick={enterFullscreen}
                        className="w-full py-6 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-sm flex items-center justify-center gap-2 group transition-all"
                    >
                        <Eye size={18} /> Enter Fullscreen & Begin Coding Exam
                    </Button>
                </GlassCard>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
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
                            Your coding solutions have been saved locally in your browser. We will grade and submit them to the database as soon as your internet connection is restored.
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
                        onClick={syncOfflineCodingExam}
                        disabled={offlineSubmitting || !isOnline}
                        className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 text-black font-semibold rounded-xl py-4 flex items-center justify-center gap-2"
                    >
                        {offlineSubmitting ? (
                            <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Syncing & Grading Code...
                            </>
                        ) : !isOnline ? (
                            "Waiting for Connection..."
                        ) : (
                            "Sync and Submit Now"
                        )}
                    </Button>
                    <p className="text-[10px] text-zinc-500">
                        Please do not close this browser tab. Your progress is safe.
                    </p>
                </div>
            </div>
        )
    }

    const linesCount = currentCode.split("\n").length || 1

    return (
        <div className="min-h-screen bg-black text-white flex flex-col overflow-hidden select-none">
            {/* Exam Header */}
            <header className="h-20 shrink-0 bg-zinc-950 border-none px-8 py-5 flex items-center justify-between z-10 shadow-2xl">
                <div className="flex items-center gap-3">
                    <span className="p-2.5 bg-zinc-900 border-none rounded-xl text-white font-bold text-sm shadow-sm">
                        TCS iON
                    </span>
                    <div>
                        <h2 className="font-extrabold text-lg tracking-tight text-white">{examTitle}</h2>
                        <p className="text-xs text-zinc-400 font-medium mt-0.5">Administrative Secure Workspace</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Warnings log */}
                    <span className={`text-xs font-bold px-3.5 py-2.5 rounded-full flex items-center gap-1.5 border-none transition-all ${
                        warnings > 0 
                            ? "bg-red-500/10 text-red-400" 
                            : "bg-zinc-900 text-zinc-400"
                    }`}>
                        <AlertTriangle size={14} /> Violations: {warnings} / 3
                    </span>

                    {/* Clock Badge */}
                    <div className="flex items-center gap-2 bg-zinc-900 px-3.5 py-2 rounded-xl border-none">
                        <Clock size={16} className="text-zinc-400 animate-pulse" />
                        <span className="font-mono font-bold text-sm sm:text-base tracking-wider text-white">
                            {formatTime(secondsLeft)}
                        </span>
                    </div>

                    <Button
                        onClick={() => setShowSubmitModal(true)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs px-5 py-2.5 h-10 border-none shadow-md"
                    >
                        Finish Exam
                    </Button>
                </div>
            </header>

            {/* Split Main View */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative p-3 gap-4">
                {/* Left Side: Question descriptions & Console */}
                <div className="w-full lg:w-[45%] flex flex-col gap-4 overflow-hidden h-full">
                    {/* Question Selectors */}
                    <GlassCard className="p-3 border-none shadow-xl flex items-center justify-between shrink-0">
                        <div className="flex gap-2">
                            {questions.map((q, idx) => {
                                const graded = gradedSubmissions[q.id]
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => {
                                            switchQuestion(idx)
                                            setStdout("")
                                            setStderr("")
                                            setTestResults(null)
                                        }}
                                        className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center border-none transition-all ${
                                            currentIdx === idx
                                                ? "bg-white text-black shadow-md"
                                                : graded
                                                    ? "bg-emerald-500/10 text-emerald-400"
                                                    : "bg-zinc-900/60 text-zinc-400 hover:text-white"
                                        }`}
                                    >
                                        Q{idx + 1}
                                    </button>
                                )
                            })}
                        </div>
                        <div className="flex gap-1.5">
                            <button
                                disabled={currentIdx === 0}
                                onClick={() => {
                                    switchQuestion(Math.max(0, currentIdx - 1))
                                    setStdout("")
                                    setStderr("")
                                    setTestResults(null)
                                }}
                                className="p-2 bg-zinc-900 border-none rounded-lg text-zinc-400 hover:text-white disabled:opacity-40"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <button
                                disabled={currentIdx === questions.length - 1}
                                onClick={() => {
                                    switchQuestion(Math.min(questions.length - 1, currentIdx + 1))
                                    setStdout("")
                                    setStderr("")
                                    setTestResults(null)
                                }}
                                className="p-2 bg-zinc-900 border-none rounded-lg text-zinc-400 hover:text-white disabled:opacity-40"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </GlassCard>

                    {/* Question details Panel */}
                    <GlassCard className="flex-1 border-none shadow-xl flex flex-col overflow-hidden min-h-[220px]">
                        <div className="bg-black/40 px-4 py-3 border-none shrink-0 flex justify-between items-center">
                            <span className="text-xs font-bold text-themeTextGrey uppercase tracking-wider">
                                Question Description (Q{currentIdx + 1})
                            </span>
                            {gradedSubmissions[currentQuestion?.id] && (
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border-none font-bold">
                                    Graded Score: {gradedSubmissions[currentQuestion.id].marks} / 100
                                </span>
                            )}
                        </div>
                        
                        <div className="flex-1 p-3.5 md:p-4 overflow-y-auto space-y-4 text-sm text-zinc-350 select-text leading-relaxed font-sans">
                            {currentQuestion ? (
                                <>
                                    <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">{currentQuestion.title || `Coding Challenge #${currentIdx + 1}`}</h3>
                                    
                                    <div className="space-y-1">
                                        <p className="font-semibold text-zinc-200">Problem Description:</p>
                                        <p className="whitespace-pre-wrap text-zinc-400 text-xs">{currentQuestion.questionText}</p>
                                    </div>

                                    {currentQuestion.constraints && (
                                        <div className="space-y-1">
                                            <p className="font-semibold text-zinc-200">Constraints:</p>
                                            <pre className="p-3 bg-zinc-950 border-none rounded-xl text-zinc-400 text-xs font-mono whitespace-pre-wrap">{currentQuestion.constraints}</pre>
                                        </div>
                                    )}

                                    {currentQuestion.inputFormat && (
                                        <div className="space-y-1">
                                            <p className="font-semibold text-zinc-200">Input Format:</p>
                                            <p className="text-zinc-400 text-xs">{currentQuestion.inputFormat}</p>
                                        </div>
                                    )}

                                    {currentQuestion.outputFormat && (
                                        <div className="space-y-1">
                                            <p className="font-semibold text-zinc-200">Output Format:</p>
                                            <p className="text-zinc-400 text-xs">{currentQuestion.outputFormat}</p>
                                        </div>
                                    )}

                                    {currentQuestion.sampleInput && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <p className="font-semibold text-zinc-200">Sample Input:</p>
                                                <pre className="p-3 bg-zinc-950 border-none rounded-xl text-zinc-400 text-xs font-mono whitespace-pre-wrap">{currentQuestion.sampleInput}</pre>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-semibold text-zinc-200">Sample Output:</p>
                                                <pre className="p-3 bg-zinc-950 border-none rounded-xl text-zinc-400 text-xs font-mono whitespace-pre-wrap">{currentQuestion.sampleOutput}</pre>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="italic text-zinc-500">Loading question details...</p>
                            )}
                        </div>
                    </GlassCard>
                </div>

                {/* Right Side: Code Editor Workspace */}
                <div className="flex-1 flex flex-col gap-4 overflow-hidden h-full">
                    {/* Editor header options */}
                    <GlassCard className="p-3 border border-themeGrey flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-themeTextGrey uppercase tracking-wider flex items-center gap-1">
                                <Code size={14} /> Solution Editor
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Reset Code */}
                            <button
                                onClick={handleReset}
                                className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-themeTextGrey hover:text-white hover:border-zinc-700 transition-all"
                                title="Reset Code Template"
                            >
                                <RefreshCw size={14} />
                            </button>

                            {/* Language selector */}
                            <div className="relative">
                                <select
                                    value={selectedLang.id}
                                    onChange={(e) => handleLanguageChange(e.target.value)}
                                    className="appearance-none bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold px-4 pr-10 py-2.5 rounded-xl focus:outline-none cursor-pointer focus:ring-1 focus:ring-white/20"
                                >
                                    {LANGUAGES.map(l => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-themeTextGrey pointer-events-none" />
                            </div>

                            {/* Compile & Run (Sample case) */}
                            <Button
                                onClick={handleCompileAndRun}
                                disabled={isRunning || !currentQuestion}
                                className="bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 hover:border-zinc-700 font-semibold rounded-xl flex items-center gap-1.5 px-4 py-2 text-xs"
                            >
                                {isRunning ? "Running..." : "Run Testcase"}
                            </Button>

                            {/* Submit & Grade Question (All Cases) */}
                            <Button
                                onClick={handleSubmitSolution}
                                disabled={isRunning || !currentQuestion}
                                className="bg-white hover:bg-zinc-200 text-black font-bold rounded-xl flex items-center gap-1.5 px-4 py-2 text-xs"
                            >
                                Submit Code
                            </Button>
                        </div>
                    </GlassCard>

                    {/* Editor Textarea with line numbers */}
                    <GlassCard className="flex-1 border border-themeGrey flex flex-col overflow-hidden min-h-[300px]">
                        <div className="flex-1 flex bg-black/20 font-mono text-sm leading-relaxed overflow-hidden p-4 h-full relative">
                            {/* Copy overlay warning if they somehow bypass */}
                            <div className="w-10 text-right pr-4 text-zinc-700 select-none border-r border-themeGrey/20 shrink-0">
                                {Array.from({ length: linesCount }).map((_, i) => (
                                    <div key={i} className="h-6">{i + 1}</div>
                                ))}
                            </div>
                            <textarea
                                ref={textareaRef}
                                value={currentCode}
                                onChange={(e) => handleCodeChange(e.target.value)}
                                onKeyDown={handleEditorKeyDown}
                                className="flex-1 bg-transparent border-none outline-none resize-none pl-4 text-white font-mono placeholder-zinc-800 h-full overflow-y-auto"
                                spellCheck={false}
                            />
                        </div>
                    </GlassCard>

                    {/* Compile & Run Console */}
                    <GlassCard className="h-[200px] border border-themeGrey flex flex-col bg-[#0b0b0b] overflow-hidden shrink-0">
                        <div className="bg-black/60 px-4 py-2 border-b border-themeGrey/60 flex items-center justify-between shrink-0">
                            <span className="text-xs font-bold text-themeTextGrey uppercase tracking-wider flex items-center gap-1.5">
                                <Terminal size={14} /> Compiler Output Console
                            </span>
                        </div>

                        <div className="flex-1 p-4 font-mono text-xs overflow-y-auto leading-relaxed select-text">
                            {isRunning ? (
                                <div className="text-themeTextGrey animate-pulse">Running compilation script...</div>
                            ) : testResults ? (
                                <div className="space-y-2">
                                    <p className="font-bold text-zinc-300">Test Case Execution Results:</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {testResults.map((tc, idx) => (
                                            <div 
                                                key={idx}
                                                className={`p-2 rounded-lg border flex items-center justify-between ${
                                                    tc.passed
                                                        ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                                                        : "bg-red-500/10 border-red-500/25 text-red-400"
                                                }`}
                                            >
                                                <span>
                                                    {tc.isSample ? "Sample case" : `Testcase #${idx + 1}`}
                                                </span>
                                                <span className="flex items-center gap-1 font-bold">
                                                    {tc.passed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                    {tc.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : stderr ? (
                                <pre className="text-red-450 whitespace-pre-wrap">{stderr}</pre>
                            ) : stdout ? (
                                <pre className="text-emerald-450 whitespace-pre-wrap">{stdout}</pre>
                            ) : (
                                <div className="text-zinc-600 italic">No execution logs. Click "Run Testcase" to check against sample inputs, or "Submit Code" to run against all hidden testcases.</div>
                            )}
                        </div>
                    </GlassCard>
                </div>
            </div>

            {/* Confirm Submit Modal */}
            {showSubmitModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-zinc-950 border border-themeGrey p-8 rounded-2xl w-full max-w-md space-y-6 text-center shadow-2xl relative">
                        <div className="flex justify-center text-emerald-500">
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-full animate-bounce">
                                <Award size={36} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold tracking-tight text-white">Finalize & Submit Exam</h2>
                            <p className="text-xs text-themeTextGrey">Are you sure you want to finish the exam? This will calculate your final marks and lock access to this attempt.</p>
                        </div>

                        <div className="flex gap-4">
                            <Button
                                onClick={() => setShowSubmitModal(false)}
                                variant="outline"
                                className="flex-1 py-5 border border-themeGrey hover:bg-themeGrey text-white rounded-xl text-xs font-semibold"
                            >
                                Back to Exam
                            </Button>
                            <Button
                                onClick={handleFinalSubmitExam}
                                className="flex-1 py-5 bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-semibold"
                            >
                                Submit Exam
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
