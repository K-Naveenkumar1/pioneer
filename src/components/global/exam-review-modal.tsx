"use client"

import React, { useEffect, useState, useTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    X,
    CheckCircle2,
    XCircle,
    Award,
    HelpCircle,
    ChevronLeft,
    ChevronRight,
    Eye,
    Code,
    FileText,
    Sparkles,
    Lock
} from "lucide-react"
import GlassCard from "@/components/global/glass-card"
import { Button } from "@/components/ui/button"
import { getStudentExamReviewDetailsAction } from "@/actions/student-actions"

interface ExamReviewModalProps {
    isOpen: boolean
    onClose: () => void
    examIdOrAttemptId: string | null
}

const cleanText = (text?: string) => {
    if (!text) return ""
    return text.replace(/^(?:q|question)?\s*\d+\s*[\.\)\-:]\s*/i, "")
}

export default function ExamReviewModal({ isOpen, onClose, examIdOrAttemptId }: ExamReviewModalProps) {
    const [loading, setLoading] = useState(true)
    const [reviewData, setReviewData] = useState<any>(null)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [activeIdx, setActiveIdx] = useState(0)

    useEffect(() => {
        if (isOpen && examIdOrAttemptId) {
            fetchReviewData(examIdOrAttemptId)
        } else {
            setReviewData(null)
            setErrorMsg(null)
            setActiveIdx(0)
        }
    }, [isOpen, examIdOrAttemptId])

    const fetchReviewData = async (targetId: string) => {
        setLoading(true)
        setErrorMsg(null)
        const res = await getStudentExamReviewDetailsAction(targetId)
        if (res.success) {
            setReviewData(res)
        } else {
            setErrorMsg(res.error || "Unable to load answer key.")
        }
        setLoading(false)
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-4xl bg-[#09090b] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-950/80 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl">
                                <Eye size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                    {reviewData?.examTitle || "Exam Solutions & Answer Key"}
                                    {reviewData?.examType && (
                                        <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded border border-purple-500/30">
                                            {reviewData.examType}
                                        </span>
                                    )}
                                </h2>
                                <p className="text-xs text-zinc-400">
                                    Review official solutions and breakdown of your performance.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 overflow-y-auto flex-1 space-y-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4 text-zinc-400">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
                                <p className="text-sm font-medium">Fetching solutions & answer key...</p>
                            </div>
                        ) : errorMsg ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl">
                                    <Lock size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-white">Answers Locked</h3>
                                <p className="text-sm text-zinc-400 max-w-md">{errorMsg}</p>
                                <Button
                                    onClick={onClose}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs px-6 py-2"
                                >
                                    Close Window
                                </Button>
                            </div>
                        ) : reviewData && (
                            <>
                                {/* Score summary banner */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800/80">
                                    <div className="flex items-center gap-3">
                                        <Award className="text-emerald-400" size={24} />
                                        <div>
                                            <p className="text-[10px] text-zinc-400 font-semibold uppercase">Total Score</p>
                                            <p className="text-base font-extrabold text-white">
                                                {reviewData.score} Marks
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <FileText className="text-purple-400" size={24} />
                                        <div>
                                            <p className="text-[10px] text-zinc-400 font-semibold uppercase">Total Questions</p>
                                            <p className="text-base font-extrabold text-white">
                                                {reviewData.questions?.length || 0} Questions
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Sparkles className="text-amber-400" size={24} />
                                        <div>
                                            <p className="text-[10px] text-zinc-400 font-semibold uppercase">Answer Revelation</p>
                                            <p className="text-xs font-bold text-emerald-400">
                                                Verified Official Key
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Question Navigator Tabs */}
                                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-800">
                                    {reviewData.questions.map((q: any, idx: number) => {
                                        let isCorrect = false
                                        let isAttempted = false

                                        if (reviewData.examType === "MCQ") {
                                            const studentAns = reviewData.studentAnswers?.[q.id]
                                            isAttempted = !!studentAns
                                            isCorrect = isAttempted && studentAns.trim().toUpperCase() === q.correctAnswer?.trim().toUpperCase()
                                        } else {
                                            const codingSub = reviewData.codingSubmissions?.[q.id]
                                            isAttempted = !!codingSub?.code
                                            isCorrect = (codingSub?.marks || 0) > 0
                                        }

                                        return (
                                            <button
                                                key={q.id}
                                                onClick={() => setActiveIdx(idx)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 border ${
                                                    activeIdx === idx
                                                        ? "bg-purple-600 text-white border-purple-500 shadow-md"
                                                        : isCorrect
                                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                                        : isAttempted
                                                        ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                                                        : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300"
                                                }`}
                                            >
                                                Q{idx + 1}
                                                {isCorrect ? (
                                                    <CheckCircle2 size={12} className="text-emerald-400" />
                                                ) : isAttempted ? (
                                                    <XCircle size={12} className="text-red-400" />
                                                ) : (
                                                    <span className="text-[10px] text-zinc-500">•</span>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>

                                {/* Question Detail Display */}
                                {reviewData.questions[activeIdx] && (
                                    <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6 space-y-6">
                                        {/* Question Header */}
                                        <div className="flex justify-between items-start gap-4 pb-4 border-b border-zinc-800/60">
                                            <div className="space-y-1">
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                                                    Question {activeIdx + 1} of {reviewData.questions.length}
                                                </span>
                                                <h3 className="text-lg font-bold text-white leading-relaxed">
                                                    {reviewData.examType === "CODING" 
                                                        ? (reviewData.questions[activeIdx].title || cleanText(reviewData.questions[activeIdx].questionText))
                                                        : cleanText(reviewData.questions[activeIdx].questionText)
                                                    }
                                                </h3>
                                            </div>
                                        </div>

                                        {/* MCQ Answer Review */}
                                        {reviewData.examType === "MCQ" && (
                                            <div className="space-y-3">
                                                {["A", "B", "C", "D"].map((optKey) => {
                                                    const optionVal = reviewData.questions[activeIdx][`option${optKey}`]
                                                    if (!optionVal) return null

                                                    const isCorrectOption = reviewData.questions[activeIdx].correctAnswer?.toUpperCase() === optKey
                                                    const studentSelected = reviewData.studentAnswers?.[reviewData.questions[activeIdx].id]?.toUpperCase() === optKey

                                                    let cardStyle = "bg-zinc-900/50 border-zinc-800 text-zinc-300"
                                                    let badge = null

                                                    if (isCorrectOption && studentSelected) {
                                                        cardStyle = "bg-emerald-500/10 border-emerald-500/50 text-emerald-200 ring-1 ring-emerald-500/30"
                                                        badge = (
                                                            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                                                <CheckCircle2 size={11} /> Correct & Your Answer
                                                            </span>
                                                        )
                                                    } else if (isCorrectOption) {
                                                        cardStyle = "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                                                        badge = (
                                                            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                                                <CheckCircle2 size={11} /> Correct Answer
                                                            </span>
                                                        )
                                                    } else if (studentSelected) {
                                                        cardStyle = "bg-red-500/10 border-red-500/40 text-red-300"
                                                        badge = (
                                                            <span className="text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                                                <XCircle size={11} /> Your Answer (Incorrect)
                                                            </span>
                                                        )
                                                    }

                                                    return (
                                                        <div
                                                            key={optKey}
                                                            className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${cardStyle}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                                                    isCorrectOption 
                                                                        ? "bg-emerald-500 text-black" 
                                                                        : studentSelected 
                                                                        ? "bg-red-500 text-white" 
                                                                        : "bg-zinc-800 text-zinc-400"
                                                                }`}>
                                                                    {optKey}
                                                                </span>
                                                                <span className="text-sm font-medium leading-relaxed">
                                                                    {optionVal}
                                                                </span>
                                                            </div>
                                                            {badge}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}

                                        {/* Coding Answer Review */}
                                        {reviewData.examType === "CODING" && (
                                            <div className="space-y-6">
                                                {/* Problem description */}
                                                <div className="space-y-3 text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80">
                                                    <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">Problem Description</h4>
                                                    <p>{reviewData.questions[activeIdx].questionText}</p>

                                                    {reviewData.questions[activeIdx].constraints && (
                                                        <div>
                                                            <strong className="text-purple-400">Constraints:</strong>
                                                            <pre className="mt-1 font-mono text-[11px] bg-black/50 p-2 rounded border border-zinc-800">{reviewData.questions[activeIdx].constraints}</pre>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Submitted Code */}
                                                <div className="space-y-2">
                                                    <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                                                        <Code size={14} className="text-purple-400" /> Your Submitted Solution
                                                    </h4>
                                                    <pre className="bg-[#050507] border border-zinc-800 p-4 rounded-xl text-xs text-emerald-400 font-mono overflow-x-auto max-h-60 leading-relaxed">
                                                        {reviewData.codingSubmissions?.[reviewData.questions[activeIdx].id]?.code || "// No submission code recorded for this question."}
                                                    </pre>
                                                </div>

                                                {/* Test Cases / Sample Output */}
                                                <div className="space-y-2">
                                                    <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                                                        Sample Test Cases & Key
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-800 space-y-1">
                                                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Sample Input</span>
                                                            <pre className="font-mono text-xs text-zinc-200">{reviewData.questions[activeIdx].sampleInput || "N/A"}</pre>
                                                        </div>
                                                        <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-800 space-y-1">
                                                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Expected Sample Output</span>
                                                            <pre className="font-mono text-xs text-emerald-400">{reviewData.questions[activeIdx].sampleOutput || "N/A"}</pre>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer Controls */}
                    {reviewData && reviewData.questions?.length > 0 && (
                        <div className="p-4 border-t border-zinc-800 bg-zinc-950/90 flex justify-between items-center shrink-0">
                            <Button
                                onClick={() => setActiveIdx(prev => Math.max(0, prev - 1))}
                                disabled={activeIdx === 0}
                                variant="outline"
                                className="border-zinc-800 text-white rounded-xl text-xs flex items-center gap-1"
                            >
                                <ChevronLeft size={14} /> Previous
                            </Button>

                            <span className="text-xs font-semibold text-zinc-400">
                                {activeIdx + 1} / {reviewData.questions.length}
                            </span>

                            <Button
                                onClick={() => setActiveIdx(prev => Math.min(reviewData.questions.length - 1, prev + 1))}
                                disabled={activeIdx === reviewData.questions.length - 1}
                                variant="outline"
                                className="border-zinc-800 text-white rounded-xl text-xs flex items-center gap-1"
                            >
                                Next <ChevronRight size={14} />
                            </Button>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
