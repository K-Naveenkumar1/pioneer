"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import { 
    Keyboard, 
    Award, 
    Play, 
    RefreshCw, 
    Timer, 
    CheckCircle,
    Loader2
} from "lucide-react"
import { toast } from "sonner"

import GlassCard from "@/components/global/glass-card"
import { Button } from "@/components/ui/button"
import { 
    studentGetActiveTypingSessionAction, 
    studentStartTypingRunAction, 
    studentUpdateTypingProgressAction 
} from "@/actions/student-actions"

export default function StudentTypingGamePage() {
    const [session, setSession] = useState<any>(null)
    const [runId, setRunId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    // Game States
    const [inputText, setInputText] = useState("")
    const [isStarted, setIsStarted] = useState(false)
    const [isFinished, setIsFinished] = useState(false)
    const [startTime, setStartTime] = useState<number | null>(null)
    const [elapsedSeconds, setElapsedSeconds] = useState(0)

    // Dynamic stats
    const [wpm, setWpm] = useState(0)
    const [accuracy, setAccuracy] = useState(100)
    const [progress, setProgress] = useState(0)

    // Refs
    const runIdRef = useRef<string | null>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const syncRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        checkSession()
        const checkTimer = setInterval(checkSession, 5000) // Poll active sessions every 5s
        return () => {
            clearInterval(checkTimer)
            if (timerRef.current) clearInterval(timerRef.current)
            if (syncRef.current) clearInterval(syncRef.current)
        }
    }, [])

    const checkSession = async () => {
        const res = await studentGetActiveTypingSessionAction()
        if (res.success && res.session) {
            setSession(res.session)
            if (loading) setLoading(false)
        } else {
            setSession(null)
            setIsStarted(false)
            setIsFinished(false)
            setInputText("")
            setLoading(false)
        }
    }

    const startTypingGame = async () => {
        if (!session) return
        setLoading(true)
        const res = await studentStartTypingRunAction(session.id)
        setLoading(false)

        if (res.success && res.runId) {
            setRunId(res.runId)
            runIdRef.current = res.runId
            setIsStarted(true)
            setIsFinished(false)
            setInputText("")
            setWpm(0)
            setAccuracy(100)
            setProgress(0)
            setStartTime(Date.now())
            setElapsedSeconds(0)

            // Timer interval
            if (timerRef.current) clearInterval(timerRef.current)
            timerRef.current = setInterval(() => {
                setElapsedSeconds(prev => prev + 1)
            }, 1000)

            // Real-time Database Sync (every 2s)
            if (syncRef.current) clearInterval(syncRef.current)
            syncRef.current = setInterval(syncProgressToDatabase, 2000)
        } else {
            toast.error(res.error || "Failed to initialize game run.")
        }
    }

    const syncProgressToDatabase = async (completedForce = false) => {
        const currentRunId = runIdRef.current
        if (!currentRunId) return

        // Compute current WPM, Accuracy, Progress
        const textLength = inputText.length
        const totalPassageLength = session?.passage?.length || 1
        const currentProgress = Math.min(100, Math.round((textLength / totalPassageLength) * 100))
        const isCompleted = completedForce || currentProgress >= 100

        // Accuracy Calculation
        let correctCount = 0
        const passage = session?.passage || ""
        for (let i = 0; i < textLength; i++) {
            if (inputText[i] === passage[i]) correctCount++
        }
        const currentAccuracy = textLength > 0 ? Math.round((correctCount / textLength) * 100) : 100

        // WPM Calculation
        const timeElapsedMin = Math.max(1, elapsedSeconds) / 60
        const currentWpm = Math.round((correctCount / 5) / timeElapsedMin)

        await studentUpdateTypingProgressAction(
            currentRunId,
            currentWpm,
            currentAccuracy,
            currentProgress,
            isCompleted
        )
    }

    // Handle character input
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (isFinished || !isStarted) return
        const val = e.target.value
        const passage = session?.passage || ""

        // Prevent typing beyond the passage length
        if (val.length > passage.length) return

        setInputText(val)

        // Calculate dynamic stats
        const textLength = val.length
        const currentProgress = Math.min(100, Math.round((textLength / passage.length) * 100))
        setProgress(currentProgress)

        let correctCount = 0
        for (let i = 0; i < val.length; i++) {
            if (val[i] === passage[i]) correctCount++
        }
        const currentAccuracy = val.length > 0 ? Math.round((correctCount / val.length) * 100) : 100
        setAccuracy(currentAccuracy)

        const timeElapsedMin = Math.max(1, elapsedSeconds) / 60
        const currentWpm = Math.round((correctCount / 5) / timeElapsedMin)
        setWpm(currentWpm)

        // Check if game finished
        if (val.length === passage.length) {
            finishTypingGame()
        }
    }

    const finishTypingGame = async () => {
        setIsFinished(true)
        setIsStarted(false)
        if (timerRef.current) clearInterval(timerRef.current)
        if (syncRef.current) clearInterval(syncRef.current)

        toast.loading("Saving your final typing score...", { id: "finishGame" })
        await syncProgressToDatabase(true)
        toast.dismiss("finishGame")
        toast.success("Game completed! Check out your stats.")

        // Confetti!
        confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
        })
    }

    // Render characters highlight helper
    const renderPassage = () => {
        if (!session) return null
        const passage = session.passage
        return passage.split("").map((char: string, index: number) => {
            let className = "text-zinc-600 font-mono transition-all duration-150"
            if (index < inputText.length) {
                className = inputText[index] === char 
                    ? "text-emerald-400 font-bold font-mono border-b-2 border-emerald-400/30" 
                    : "text-rose-500 font-bold font-mono bg-rose-500/10 border-b-2 border-rose-500"
            } else if (index === inputText.length && isStarted) {
                className = "text-white font-bold bg-white/20 font-mono animate-pulse underline decoration-white"
            }
            return (
                <span key={index} className={className}>
                    {char}
                </span>
            )
        })
    }

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Loader2 className="animate-spin text-white h-8 w-8" />
            </div>
        )
    }

    return (
        <div className="space-y-8 relative max-w-4xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-5xl font-bold tracking-tight text-white pb-3 flex items-center gap-3">
                    <Keyboard size={36} className="text-white" /> Typing Speed Racing
                </h1>
                <p className="text-sm text-themeTextGrey">Participate in live class typing tests hosted by your administrator.</p>
            </div>

            <AnimatePresence mode="wait">
                {!session ? (
                    /* Waiting Lobby State */
                    <motion.div
                        key="waiting-lobby"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                    >
                        <GlassCard className="p-12 border border-themeGrey/60 text-center space-y-6">
                            <div className="flex justify-center text-zinc-500">
                                <Loader2 size={48} className="animate-spin text-white/40" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-white">Waiting for game to begin</h3>
                                <p className="text-xs text-themeTextGrey max-w-md mx-auto leading-relaxed">
                                    The instructor has not started any active typing session yet. Once the session is activated, this page will automatically unlock. Keep this tab open.
                                </p>
                            </div>
                        </GlassCard>
                    </motion.div>
                ) : isFinished ? (
                    /* Finished Results State */
                    <motion.div
                        key="finished-results"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                    >
                        <GlassCard className="p-8 border border-emerald-500/20 text-center space-y-8 max-w-2xl mx-auto shadow-2xl relative overflow-hidden">
                            <div className="flex justify-center">
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400">
                                    <Award size={48} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-3xl font-extrabold text-white tracking-tight">Race Completed!</h2>
                                <p className="text-xs text-emerald-400">Your score has been updated on the admin racing leaderboard.</p>
                            </div>

                            {/* Stat Rings */}
                            <div className="grid grid-cols-2 gap-6 max-w-sm mx-auto">
                                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                                    <p className="text-2xl font-black text-white">{wpm} WPM</p>
                                    <p className="text-[10px] text-themeTextGrey uppercase font-semibold mt-1">Typing Speed</p>
                                </div>
                                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                                    <p className="text-2xl font-black text-white">{accuracy}%</p>
                                    <p className="text-[10px] text-themeTextGrey uppercase font-semibold mt-1">Accuracy</p>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4 justify-center">
                                <Button
                                    onClick={startTypingGame}
                                    className="px-6 py-5 bg-white hover:bg-zinc-200 text-black rounded-xl font-bold text-xs flex items-center gap-1.5"
                                >
                                    <RefreshCw size={14} /> Retry Race
                                </Button>
                            </div>
                        </GlassCard>
                    </motion.div>
                ) : !isStarted ? (
                    /* Ready To Begin State */
                    <motion.div
                        key="ready-lobby"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                    >
                        <GlassCard className="p-8 border border-themeGrey space-y-6 text-center">
                            <div className="flex justify-center text-white">
                                <div className="p-4 bg-zinc-900 border border-themeGrey rounded-2xl">
                                    <Keyboard size={36} />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className="text-2xl font-extrabold text-white">Instructor Conducted Typing Test</h3>
                                <p className="text-xs text-themeTextGrey max-w-sm mx-auto">
                                    Get ready to type! WPM represents words typed per minute. High accuracy is crucial.
                                </p>
                            </div>

                            <div className="bg-black/35 p-5 border border-zinc-850 rounded-2xl text-left text-xs text-zinc-400 space-y-2 max-w-md mx-auto leading-relaxed">
                                <p className="font-bold text-white mb-1">Game Instructions:</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Click "Start Race" to unlock the keyboard inputs.</li>
                                    <li>Accurately type the passage shown on the screen.</li>
                                    <li>Your live race car position is visible to the teacher in real-time.</li>
                                </ul>
                            </div>

                            <Button
                                onClick={startTypingGame}
                                className="w-full max-w-md py-6 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-sm flex items-center justify-center gap-2 group transition-all"
                            >
                                <Play size={16} fill="currentColor" /> Start typing test
                            </Button>
                        </GlassCard>
                    </motion.div>
                ) : (
                    /* Active Typing State */
                    <motion.div
                        key="active-typing"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="space-y-6"
                    >
                        {/* Live Stat Panel */}
                        <div className="grid grid-cols-3 gap-6">
                            <GlassCard className="p-4 border border-themeGrey flex flex-col items-center">
                                <span className="text-xl font-bold text-white flex items-center gap-1.5">
                                    <Timer size={16} className="text-themeTextGrey" /> {elapsedSeconds}s
                                </span>
                                <span className="text-[9px] text-themeTextGrey uppercase font-semibold mt-1">Time Elapsed</span>
                            </GlassCard>
                            <GlassCard className="p-4 border border-themeGrey flex flex-col items-center">
                                <span className="text-xl font-bold text-emerald-400">{wpm} WPM</span>
                                <span className="text-[9px] text-themeTextGrey uppercase font-semibold mt-1">Current Speed</span>
                            </GlassCard>
                            <GlassCard className="p-4 border border-themeGrey flex flex-col items-center">
                                <span className="text-xl font-bold text-amber-400">{accuracy}%</span>
                                <span className="text-[9px] text-themeTextGrey uppercase font-semibold mt-1">Accuracy</span>
                            </GlassCard>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden border border-zinc-800">
                            <motion.div 
                                className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full"
                                style={{ width: `${progress}%` }}
                                transition={{ duration: 0.2 }}
                            />
                        </div>

                        {/* Passage display Container */}
                        <GlassCard className="p-6 border border-themeGrey min-h-[160px] bg-black/45 flex items-center select-none pointer-events-none">
                            <div className="leading-relaxed text-lg tracking-wide text-justify select-none font-mono">
                                {renderPassage()}
                            </div>
                        </GlassCard>

                        {/* Typing Textarea input */}
                        <div className="relative">
                            <textarea
                                value={inputText}
                                onChange={handleInputChange}
                                placeholder="Type the passage here..."
                                className="w-full min-h-[120px] p-5 bg-zinc-950 border border-themeGrey rounded-2xl text-white placeholder-zinc-700 font-mono text-base focus:outline-none focus:ring-2 focus:ring-white/20 transition-all resize-none shadow-inner"
                                autoFocus
                                spellCheck={false}
                                autoComplete="off"
                                autoCapitalize="off"
                            />
                            <div className="absolute bottom-4 right-4 text-[10px] text-themeTextGrey font-mono select-none">
                                {inputText.length} / {session?.passage?.length || 0} characters
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
