"use client"

import { motion } from "framer-motion"
import {
    Award,
    Code,
    CheckCircle2,
    Clock,
    Play,
    ShieldAlert
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

import { getStudentExams, startExamAttemptAction } from "@/actions/student-actions"
import GlassCard from "@/components/global/glass-card"
import { Button } from "@/components/ui/button"

export default function StudentCodingExamsPage() {
    const router = useRouter()
    const [exams, setExams] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isPending, startTransition] = useTransition()
    const [showLobby, setShowLobby] = useState<any | null>(null)
    const [examCodeInput, setExamCodeInput] = useState("")

    useEffect(() => {
        loadExams()
    }, [])

    const loadExams = async () => {
        setLoading(true)
        const res = await getStudentExams("CODING")
        if (res.success) {
            setExams(res.exams || [])
        } else {
            toast.error(res.error || "Failed to load coding exams")
        }
        setLoading(false)
    }

    const handleStartExam = (exam: any) => {
        setShowLobby(exam)
        setExamCodeInput("")
    }

    const confirmStartExam = () => {
        if (!showLobby) return

        startTransition(async () => {
            const res = await startExamAttemptAction(showLobby.id, examCodeInput)
            if (res.success && res.attemptId) {
                toast.success("Exam session started! Entering lockdown...")
                setShowLobby(null)
                setExamCodeInput("")
                router.push(`/student/coding-exam/${res.attemptId}`)
            } else {
                toast.error(res.error || "Could not start exam attempt")
            }
        })
    }

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></span>
            </div>
        )
    }

    return (
        <div className="space-y-8 relative">
            {/* Header */}
            <div>
                <h1 className="text-5xl font-bold tracking-tight text-white pb-4">
                    Coding Examinations
                </h1>
                <p className="text-sm text-themeTextGrey">Write your scheduled coding exams in a secure environment.</p>
            </div>

            {/* Exams list */}
            {exams.length === 0 ? (
                <GlassCard className="p-8 text-center text-themeTextGrey border border-themeGrey">
                    No coding examinations have been scheduled yet. Check back later!
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {exams.map((exam: any) => (
                        <GlassCard 
                            key={exam.id} 
                            className="p-6 border border-themeGrey flex flex-col justify-between hover:border-zinc-700 transition-all duration-300"
                        >
                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-lg font-bold text-white tracking-tight">{exam.title}</h3>
                                    {exam.attempted ? (
                                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded-md">
                                            <CheckCircle2 size={12} /> Attempted
                                        </span>
                                    ) : exam.isActive === false ? (
                                        <span className="flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-400/10 border border-red-500/20 px-2 py-1 rounded-md">
                                            Ended
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-1 rounded-md animate-pulse">
                                            <Play size={12} fill="currentColor" /> Active
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-4 text-xs text-themeTextGrey pt-2">
                                    <span className="flex items-center gap-1">
                                        <Clock size={14} /> {exam.duration} Minutes
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Code size={14} /> {exam.totalQuestions} Coding Tasks
                                    </span>
                                </div>
                            </div>

                            <div className="pt-6 mt-4 border-t border-themeGrey/60 flex items-center justify-between">
                                {exam.attempted ? (
                                    <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                                        <Award size={16} /> Score: {exam.score} / 100
                                    </div>
                                ) : exam.isActive === false ? (
                                    <Button
                                        disabled
                                        className="bg-zinc-800 text-zinc-500 font-semibold text-xs rounded-xl px-5 py-4 w-full cursor-not-allowed border border-zinc-700"
                                    >
                                        Exam Ended
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => handleStartExam(exam)}
                                        disabled={isPending}
                                        className="bg-white hover:bg-zinc-200 text-black font-semibold text-xs rounded-xl px-5 py-4 w-full"
                                    >
                                        Start Coding Exam
                                    </Button>
                                )}
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}

            {/* Entrance Lobby Modal */}
            {showLobby && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-zinc-950 border border-themeGrey p-8 rounded-2xl w-full max-w-lg space-y-6 text-center shadow-2xl relative"
                    >
                        <button 
                            onClick={() => setShowLobby(null)}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                        >
                            ✕
                        </button>

                        <div className="flex justify-center text-red-500">
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-full animate-pulse">
                                <ShieldAlert size={40} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold tracking-tight text-white">Enter Exam Lockdown Mode</h2>
                            <p className="text-xs text-themeTextGrey">Please verify security guidelines for: <span className="text-white font-bold">{showLobby.title}</span></p>
                        </div>

                        <div className="text-left bg-black/40 p-5 rounded-2xl border border-themeGrey/40 space-y-3 text-xs text-themeTextGrey leading-relaxed">
                            <p className="font-bold text-white flex items-center gap-1.5 mb-1 text-sm">
                                <ShieldAlert size={16} className="text-amber-400" />
                                Lockdown Rules & Instructions:
                            </p>
                            <ul className="list-disc pl-4 space-y-2">
                                <li>The coding exam must be completed in **Fullscreen Mode**.</li>
                                <li>Exiting fullscreen, changing browser tabs, or blurring focus will trigger a **warning**.</li>
                                <li>If you register **3 warnings**, your exam session is **terminated and submitted**.</li>
                                <li>Right-clicks, text copying, pasting, and common editor shortcuts are disabled.</li>
                            </ul>
                        </div>

                        {showLobby.examCode && (
                            <div className="space-y-2 text-left">
                                <label className="block text-xs font-semibold text-themeTextGrey uppercase">
                                    Exam Access Code
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter access code from instructor"
                                    value={examCodeInput}
                                    onChange={(e) => setExamCodeInput(e.target.value)}
                                    className="w-full px-4 py-3 bg-black/45 border border-themeGrey rounded-xl text-white placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all text-sm"
                                />
                            </div>
                        )}

                        <div className="flex gap-4">
                            <Button
                                onClick={() => setShowLobby(null)}
                                variant="outline"
                                className="flex-1 py-5 border border-themeGrey hover:bg-themeGrey text-white rounded-xl text-xs font-semibold"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={confirmStartExam}
                                disabled={isPending}
                                className="flex-1 py-5 bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-semibold"
                            >
                                {isPending ? "Entering..." : "Start Exam"}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    )
}
