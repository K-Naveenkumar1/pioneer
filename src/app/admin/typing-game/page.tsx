"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
    Keyboard, 
    Play, 
    XOctagon, 
    Trophy, 
    RefreshCw, 
    Gamepad2,
    Users
} from "lucide-react"
import { toast } from "sonner"

import GlassCard from "@/components/global/glass-card"
import { Button } from "@/components/ui/button"
import { 
    adminStartTypingSessionAction, 
    adminEndTypingSessionAction, 
    adminGetTypingLeaderboardAction,
    adminGetClassesAction 
} from "@/actions/admin-actions"

const PRESETS = [
    {
        title: "Standard English",
        text: "The quick brown fox jumps over the lazy dog. Programming is the process of writing, testing, debugging, and maintaining the source code of computer programs."
    },
    {
        title: "Coding Paragraph (JavaScript)",
        text: "const solve = (n) => { let result = 0; for(let i = 1; i <= n; i++) { if (i % 2 === 0) { result += i; } } return result; }; solve(100);"
    },
    {
        title: "Tech Innovation",
        text: "Artificial intelligence, machine learning, and agentic workflows are shaping the future of web application development, allowing developers to create highly interactive tools."
    }
]

export default function AdminTypingGamePage() {
    const [passage, setPassage] = useState(PRESETS[0].text)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [runs, setRuns] = useState<any[]>([])
    const [isActive, setIsActive] = useState(false)
    const [loading, setLoading] = useState(false)
    const [timeLimit, setTimeLimit] = useState(60)
    const [classes, setClasses] = useState<any[]>([])
    const [selectedClassId, setSelectedClassId] = useState("")
    const [password, setPassword] = useState("")

    const runsRef = useRef<any[]>([])
    const pollingRef = useRef<NodeJS.Timeout | null>(null)

    // Retrieve active session from localStorage on mount if any, or do initial check
    useEffect(() => {
        const storedSession = localStorage.getItem("active_typing_session_id")
        if (storedSession) {
            setSessionId(storedSession)
            setIsActive(true)
            startPolling(storedSession)
        }
        loadClasses()
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current)
        }
    }, [])

    const loadClasses = async () => {
        const res = await adminGetClassesAction()
        if (res.success) {
            setClasses(res.classes || [])
            if (res.classes && res.classes.length > 0) {
                setSelectedClassId(res.classes[0].id)
            }
        } else {
            toast.error(res.error || "Failed to load classes")
        }
    }

    const startPolling = (sid: string) => {
        if (pollingRef.current) clearInterval(pollingRef.current)
        loadLeaderboard(sid)
        pollingRef.current = setInterval(() => loadLeaderboard(sid), 2000)
    }

    const stopPolling = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
        }
    }

    const loadLeaderboard = async (sid: string) => {
        const res = await adminGetTypingLeaderboardAction(sid)
        if (res.success && res.runs) {
            // Sort runs by WPM first, then accuracy, then progress percentage to determine race rank
            const sortedRuns = [...res.runs].sort((a, b) => {
                if (b.wpm !== a.wpm) {
                    return b.wpm - a.wpm
                }
                if (b.accuracy !== a.accuracy) {
                    return b.accuracy - a.accuracy
                }
                return b.progressPercentage - a.progressPercentage
            })
            setRuns(sortedRuns)
            runsRef.current = sortedRuns
        } else if (!res.success) {
            console.error("Leaderboard poll error:", res.error)
        }
    }

    const handleStartSession = async () => {
        if (!passage.trim()) {
            toast.error("Please enter or select a typing passage.")
            return
        }

        if (!selectedClassId) {
            toast.error("Please select a class/batch first.")
            return
        }

        setLoading(true)
        const res = await adminStartTypingSessionAction(passage, timeLimit, selectedClassId, password)
        setLoading(false)

        if (res.success && res.sessionId) {
            toast.success("Live typing session started!")
            setSessionId(res.sessionId)
            setIsActive(true)
            setRuns([])
            setPassword("")
            localStorage.setItem("active_typing_session_id", res.sessionId)
            startPolling(res.sessionId)
        } else {
            toast.error(res.error || "Failed to start typing session.")
        }
    }

    const handleEndSession = async () => {
        if (!sessionId) return

        if (!window.confirm("Are you sure you want to end this live typing game session? Students will be booted back to lobby.")) return

        setLoading(true)
        const res = await adminEndTypingSessionAction(sessionId)
        setLoading(false)

        if (res.success) {
            toast.success("Session closed.")
            setIsActive(false)
            setSessionId(null)
            stopPolling()
            localStorage.removeItem("active_typing_session_id")
        } else {
            toast.error(res.error || "Failed to end session.")
        }
    }

    // F1 Car SVG helper
    const renderF1CarSvg = (color: string, progress: number) => {
        // Flame scales dynamically with progress (from 0.8x up to 1.5x length)
        const flameScale = 0.8 + (progress / 100) * 0.7;

        return (
            <svg className="w-20 h-10" viewBox="0 0 140 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Car translated to make room for exhaust trail */}
                <g transform="translate(20, 0)">
                    {/* Rear wing (large F1 spoiler) */}
                    <path d="M 10 12 H 24 V 16 H 10 Z" fill="#222" />
                    <path d="M 12 16 L 16 32 H 18 L 14 16 Z" fill="#444" />
                    
                    {/* Main body / Chassis (aerodynamic curve) */}
                    <path d="M 16 32 Q 35 22 55 22 H 75 Q 95 24 105 32 Z" fill={color} />
                    
                    {/* Cockpit & Air Intake (halo area) */}
                    <path d="M 45 22 Q 52 12 60 22 Z" fill="#111" />
                    <circle cx="53" cy="18" r="3" fill="#ff4444" />
                    
                    {/* Sidepods */}
                    <path d="M 40 26 H 70 L 68 32 H 38 Z" fill={color} opacity="0.8" />
                    
                    {/* Front wing / Nose cone */}
                    <path d="M 100 29 L 115 32 H 100 Z" fill={color} />
                    <path d="M 110 32 H 120 V 35 H 110 Z" fill="#222" />
                    
                    {/* Wheels / Tires (with bright outer stroke and compounds to make them clearly visible) */}
                    <circle cx="28" cy="30" r="10" fill="#444446" stroke="#d1d1d6" strokeWidth="1.5" />
                    <circle cx="28" cy="30" r="6" fill="#8e8e93" />
                    <circle cx="28" cy="30" r="3" fill="#ffeb3b" />
                    
                    <circle cx="92" cy="31" r="9" fill="#444446" stroke="#d1d1d6" strokeWidth="1.5" />
                    <circle cx="92" cy="31" r="5.5" fill="#8e8e93" />
                    <circle cx="92" cy="31" r="2.5" fill="#ffeb3b" />
                </g>
            </svg>
        )
    }

    return (
        <div className="space-y-8 select-none">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Gamepad2 className="text-white" /> Typing Speed Race Conductor
                    </h1>
                    <p className="text-sm text-themeTextGrey">Conduct live class-wide typing speed races. Monitor progress via car animation.</p>
                </div>
            </div>

            {/* Session Controller panel */}
            {!isActive ? (
                /* Creator Form */
                <GlassCard className="p-6 border border-themeGrey space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-white">Setup Live Typing Match</h3>
                        
                        {/* Preset Selectors */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {PRESETS.map((p, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setPassage(p.text)}
                                    className={`p-4 border rounded-xl text-left transition-all ${
                                        passage === p.text
                                            ? "bg-white text-black border-white"
                                            : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                                    }`}
                                >
                                    <p className="font-bold text-xs">{p.title}</p>
                                    <p className="text-[10px] mt-1 line-clamp-2 opacity-80">{p.text}</p>
                                </button>
                            ))}
                        </div>

                        {/* Class Dropdown Selector */}
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-themeTextGrey uppercase">
                                Target Class / Batch
                            </label>
                            <select
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                                className="w-full p-4 bg-black/40 border border-themeGrey rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all text-sm cursor-pointer"
                            >
                                <option value="" className="bg-zinc-950 text-zinc-400">Select Class</option>
                                {classes.map((cls: any) => (
                                    <option key={cls.id} value={cls.id} className="bg-zinc-950 text-white">
                                        {cls.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Text Passage Input */}
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-themeTextGrey uppercase">
                                Custom Passage Text
                            </label>
                            <textarea
                                value={passage}
                                onChange={(e) => setPassage(e.target.value)}
                                placeholder="Enter paragraphs or codes students should copy type..."
                                className="w-full min-h-[100px] p-4 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-zinc-800 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all text-sm resize-none"
                            />
                        </div>

                        {/* Time Limit Input */}
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-themeTextGrey uppercase">
                                Time Limit (Seconds)
                            </label>
                            <input
                                type="number"
                                min={10}
                                max={600}
                                value={timeLimit}
                                onChange={(e) => setTimeLimit(parseInt(e.target.value) || 60)}
                                className="w-full p-4 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-zinc-800 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all text-sm"
                            />
                        </div>

                        {/* Password Input */}
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-themeTextGrey uppercase">
                                Game Password / Code (Optional)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. RACE123 (leave empty for no password)"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-4 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-zinc-800 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all text-sm"
                            />
                        </div>
                    </div>

                    <Button
                        onClick={handleStartSession}
                        disabled={loading}
                        className="w-full py-6 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                        <Play size={14} fill="currentColor" /> Publish & Start Live Race
                    </Button>
                </GlassCard>
            ) : (
                /* Live Conduct Monitor */
                <div className="space-y-8">
                    {/* Active Match Banner */}
                    <GlassCard className="p-5 border border-amber-500/20 bg-amber-500/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-amber-400 font-bold">
                                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                                Live Match Active
                            </div>
                            <p className="text-sm font-semibold text-white max-w-xl truncate">Passage: "{passage}"</p>
                        </div>

                        <Button
                            onClick={handleEndSession}
                            disabled={loading}
                            className="bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs px-5 py-3 flex items-center gap-1.5 self-stretch md:self-auto justify-center"
                        >
                            <XOctagon size={14} /> End Live Game
                        </Button>
                    </GlassCard>

                    {/* Live Car Racing Track View */}
                    <GlassCard className="p-6 border border-themeGrey space-y-6">
                        <div className="flex justify-between items-center border-b border-themeGrey/40 pb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Trophy size={20} className="text-amber-400" /> Live Racing Standings
                            </h3>
                            <span className="text-xs text-themeTextGrey flex items-center gap-1">
                                <Users size={14} /> Active Racers: {runs.length}
                            </span>
                        </div>

                        {runs.length === 0 ? (
                            <div className="py-16 text-center text-zinc-500 italic text-sm">
                                Waiting for students to connect and press "Start Race" in their portal...
                            </div>
                        ) : (
                            /* Track lanes container */
                            <div className="space-y-6">
                                {runs.map((run, idx) => {
                                    const percent = run.progressPercentage || 0
                                    const studentColor = `hsl(${(idx * 68) % 360}, 85%, 55%)`
                                    return (
                                        <div key={run.id} className="space-y-2">
                                            {/* Racer Name & current Speed */}
                                            <div className="flex justify-between items-center text-xs font-semibold">
                                                <span className="text-zinc-300 flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: studentColor }} />
                                                    {run.student?.name} <span className="text-[10px] text-zinc-500 font-mono">({run.student?.rollNo})</span>
                                                </span>
                                                <span className="text-zinc-400">
                                                    {run.wpm} WPM • Accuracy: {run.accuracy}% • Progress: {percent}%
                                                </span>
                                            </div>

                                            {/* Race Track Lane */}
                                            <div className="h-12 bg-zinc-950 border border-zinc-900 rounded-xl relative overflow-hidden flex items-center p-1.5 shadow-inner">
                                                {/* Background Progress Track (Total path line starting at exhaust line, dark green gradient for remaining progress) */}
                                                <div className="absolute left-[32px] h-1 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950/80 border border-emerald-900/30 rounded-full pointer-events-none" style={{ width: "calc(100% - 80px)" }} />
                                                
                                                {/* Finish Checkered Line */}
                                                <div className="absolute right-12 inset-y-0 w-2.5 bg-gradient-to-b from-black via-white to-black bg-[size:10px_10px] opacity-30 border-l border-r border-zinc-850" />

                                                {/* Progress Trail Line (Green line trailing the car exhaust - Solid Green) */}
                                                <motion.div 
                                                    className="absolute left-[32px] bg-emerald-500 rounded-l-full top-1/2 -translate-y-1/2 pointer-events-none z-0 shadow-[0_0_6px_rgba(16,185,129,0.85)]"
                                                    style={{ 
                                                        width: `calc(${percent}% - ${(percent * 1.28).toFixed(2)}px)`,
                                                        height: '4px'
                                                    }}
                                                    animate={{ width: `calc(${percent}% - ${(percent * 1.28).toFixed(2)}px)` }}
                                                    transition={{ type: "spring", stiffness: 60, damping: 15 }}
                                                />

                                                {/* Sliding Racer Car container */}
                                                <motion.div 
                                                    className="absolute z-10"
                                                    style={{ left: `calc(${percent}% - ${(percent * 1.28).toFixed(2)}px)` }}
                                                    animate={{ left: `calc(${percent}% - ${(percent * 1.28).toFixed(2)}px)` }}
                                                    transition={{ type: "spring", stiffness: 60, damping: 15 }}
                                                >
                                                    <div className="flex flex-col items-center">
                                                        {renderF1CarSvg(studentColor, percent)}
                                                    </div>
                                                </motion.div>

                                                {/* Checkered flag at completion */}
                                                {run.isCompleted && (
                                                    <div className="absolute right-3.5 text-xs text-emerald-400 font-black animate-bounce">
                                                        🏁 FINISH
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </GlassCard>
                </div>
            )}
        </div>
    )
}
