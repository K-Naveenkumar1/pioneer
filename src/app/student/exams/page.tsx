"use client"

import { motion } from "framer-motion"
import {
    Award,
    BookOpen,
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

export default function StudentExamsPage() {
    const router = useRouter()
    const [exams, setExams] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isPending, startTransition] = useTransition()
    const [showLobby, setShowLobby] = useState<any | null>(null)

    useEffect(() => {
        loadExams()
    }, [])

    const loadExams = async () => {
        setLoading(true)
        const res = await getStudentExams()
        if (res.success) {
            setExams(res.exams || [])
        } else {
            toast.error(res.error || "Failed to load exams")
        }
        setLoading(false)
    }

    const handleStartExam = (exam: any) => {
        setShowLobby(exam)
    }

    const confirmStartExam = () => {
        if (!showLobby) return

        startTransition(async () => {
            const res = await startExamAttemptAction(showLobby.id)
            if (res.success && res.attemptId) {
                toast.success("Exam session started! Entering lockdown...")
                setShowLobby(null)
                // Redirect to the lockdown page
                router.push(`/student/exams/${res.attemptId}`)
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
                    Examination Portal
                </h1>
                <p className="text-sm text-themeTextGrey">Write your scheduled exams in a secure environment.</p>
            </div>

            {/* Exams list */}
            {exams.length === 0 ? (
                <GlassCard className="p-8 text-center text-themeTextGrey border border-themeGrey">
                    No examinations have been scheduled yet. Check back later!
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
                                    ) : (
                                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-1 rounded-md">
                                            Available
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 text-xs text-themeTextGrey">
                                    <span className="flex items-center gap-1">
                                        <Clock size={14} /> {exam.duration} Min
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <BookOpen size={14} /> {exam.totalQuestions} Questions
                                    </span>
                                </div>
                            </div>

                            {exam.attempted ? (
                                <div className="mt-8 border-t border-themeGrey/40 pt-4 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Award size={18} className="text-emerald-400" />
                                        <div>
                                            <p className="text-xs text-themeTextGrey">Your Score</p>
                                            <p className="text-sm font-bold text-white">{exam.score}%</p>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-themeTextGrey">
                                        Completed: {new Date(exam.completedAt).toLocaleDateString()}
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-8 pt-4">
                                    <Button
                                        onClick={() => handleStartExam(exam)}
                                        className="w-full bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl flex items-center justify-center gap-1.5 py-5"
                                    >
                                        <Play size={14} fill="currentColor" /> Start Exam
                                    </Button>
                                </div>
                            )}
                        </GlassCard>
                    ))}
                </div>
            )}

            {/* Exam Pre-flight Lobby Modal */}
            {showLobby && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-full max-w-lg"
                    >
                        <GlassCard className="p-8 border border-themeGrey space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl shrink-0">
                                    <ShieldAlert size={26} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold text-white">Entering Lockdown Mode</h3>
                                    <p className="text-xs text-themeTextGrey">Exam: {showLobby.title}</p>
                                </div>
                            </div>

                            <div className="bg-[#121212] border border-themeGrey/60 rounded-xl p-5 space-y-3.5 text-xs text-themeTextWhite">
                                <h4 className="font-bold text-red-400 uppercase tracking-wider text-[10px]">
                                    Lockdown Rules & Instructions
                                </h4>
                                <ul className="list-disc pl-4 space-y-2 text-themeTextGrey leading-relaxed">
                                    <li>**Full-Screen Mode:** The exam will lock the browser in full screen. Do not press Esc or minimize.</li>
                                    <li>**Tab Tracking:** Switching tabs, opening developers console, or clicking away from the browser window is strictly prohibited.</li>
                                    <li>**Warnings Limit:** You will receive visual alerts. On the **3rd infraction**, your exam will automatically submit and finalize.</li>
                                    <li>**Timer Limit:** Keep track of the timer. If it runs out, your session submits automatically.</li>
                                    <li>**Controls Blocked:** Right-clicks, copy, paste, and text selection are disabled.</li>
                                </ul>
                            </div>

                            <div className="flex gap-4">
                                <Button
                                    onClick={() => setShowLobby(null)}
                                    variant="outline"
                                    className="flex-1 rounded-xl border border-themeGrey hover:bg-themeGrey py-5 text-white"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={confirmStartExam}
                                    disabled={isPending}
                                    className="flex-1 rounded-xl bg-white hover:bg-zinc-200 py-5 text-black font-semibold"
                                >
                                    {isPending ? "Configuring..." : "Agree & Start"}
                                </Button>
                            </div>
                        </GlassCard>
                    </motion.div>
                </div>
            )}
        </div>
    )
}
