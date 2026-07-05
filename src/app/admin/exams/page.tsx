"use client"

import React, { useState, useTransition, useEffect } from "react"
import { 
    BookOpen, 
    UploadCloud, 
    FileText, 
    CheckCircle, 
    AlertTriangle, 
    Clock, 
    Plus, 
    Check, 
    Trash2, 
    Eye
} from "lucide-react"
import { toast } from "sonner"

import GlassCard from "@/components/global/glass-card"
import { Button } from "@/components/ui/button"
import { 
    parseDocxQuestionsAction, 
    adminCreateExamAction,
    adminGetExamsListAction,
    adminDeleteExamAction
} from "@/actions/admin-actions"

export default function AdminExamsPage() {
    const [title, setTitle] = useState("")
    const [duration, setDuration] = useState(60)
    const [isPending, startTransition] = useTransition()

    // Exams list states
    const [exams, setExams] = useState<any[]>([])
    const [loadingExams, setLoadingExams] = useState(true)

    useEffect(() => {
        loadExams()
    }, [])

    const loadExams = async () => {
        setLoadingExams(true)
        const res = await adminGetExamsListAction()
        if (res.success) {
            setExams(res.exams || [])
        } else {
            toast.error(res.error || "Failed to load exams list")
        }
        setLoadingExams(false)
    }

    const handleDeleteExam = async (examId: string) => {
        if (!confirm("Are you sure you want to delete this exam? This will also delete all student attempts for this exam.")) return
        startTransition(async () => {
            const res = await adminDeleteExamAction(examId)
            if (res.success) {
                toast.success(res.message || "Exam deleted successfully.")
                loadExams()
            } else {
                toast.error(res.error || "Failed to delete exam.")
            }
        })
    }

    // Parsing states
    const [fileSelected, setFileSelected] = useState<File | null>(null)
    const [parsedQuestions, setParsedQuestions] = useState<any[]>([])
    const [parsing, setParsing] = useState(false)
    const [parseReport, setParseReport] = useState<any>(null)

    // Handle Word Document Upload & Conversion to Base64 -> trigger Server Action
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            const extension = file.name.split(".").pop()?.toLowerCase()
            if (extension !== "docx") {
                toast.error("Invalid file format. Please upload a Word Document (.docx).")
                return
            }
            setFileSelected(file)
            setParsedQuestions([])
            setParseReport(null)
        }
    }

    const handleParseDocument = () => {
        if (!fileSelected) {
            toast.error("Please upload a .docx file first.")
            return
        }

        setParsing(true)
        const reader = new FileReader()
        
        reader.onload = async () => {
            try {
                const base64String = (reader.result as string).split(",")[1]
                const res = await parseDocxQuestionsAction(base64String)

                if (res.success) {
                    setParsedQuestions(res.questions || [])
                    setParseReport({
                        totalParsed: res.totalParsed || 0,
                        validCount: res.validCount || 0,
                        invalidCount: (res.totalParsed || 0) - (res.validCount || 0)
                    })
                    toast.success(`Parsing complete! Found ${res.validCount} valid MCQ questions.`)
                } else {
                    toast.error(res.error || "Parsing failed.")
                }
            } catch (e: any) {
                toast.error("Error reading file.")
            } finally {
                setParsing(false)
            }
        }

        reader.readAsDataURL(fileSelected)
    }

    const handlePublishExam = () => {
        if (!title.trim()) {
            toast.error("Please provide an exam title.")
            return
        }
        if (duration <= 0) {
            toast.error("Exam duration must be at least 1 minute.")
            return
        }
        if (parsedQuestions.length === 0) {
            toast.error("No questions found. Please parse a valid Word Document first.")
            return
        }

        startTransition(async () => {
            const res = await adminCreateExamAction(title, duration, parsedQuestions)
            if (res.success) {
                toast.success(res.message || "Exam created successfully!")
                // Reset form
                setTitle("")
                setDuration(60)
                setFileSelected(null)
                setParsedQuestions([])
                setParseReport(null)
                loadExams()
            } else {
                toast.error(res.error || "Failed to publish exam")
            }
        })
    }

    const handleDeleteQuestion = (idx: number) => {
        setParsedQuestions(prev => prev.filter((_, i) => i !== idx))
        setParseReport((prev: any) => {
            if (!prev) return null
            return {
                ...prev,
                validCount: prev.validCount - 1
            }
        })
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                    <BookOpen size={26} /> MCQ Exam Creator
                </h1>
                <p className="text-sm text-themeTextGrey">Upload MCQ banks in Word Format (.docx) to generate lockdown exams.</p>
            </div>

            {/* Split layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form & Upload Column */}
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        Exam Details & Upload
                    </h3>
                    <GlassCard className="p-6 border border-themeGrey space-y-6">
                        {/* Title */}
                        <div>
                            <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">
                                Exam Title
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g., Midterm Computer Science"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-3 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-themeTextGrey focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm"
                            />
                        </div>

                        {/* Duration */}
                        <div>
                            <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">
                                Duration (Minutes)
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-themeTextGrey">
                                    <Clock size={16} />
                                </span>
                                <input
                                    type="number"
                                    required
                                    min={1}
                                    value={duration}
                                    onChange={(e) => setDuration(Number(e.target.value))}
                                    className="w-full pl-10 pr-4 py-3 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-themeTextGrey focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm"
                                />
                            </div>
                        </div>

                        {/* Word File Upload Box */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-semibold text-themeTextGrey uppercase">
                                    Upload Questions Word Document (.docx)
                                </label>
                                <a 
                                    href="/api/sample-mcq" 
                                    className="text-[10px] text-zinc-400 hover:text-white underline transition-all font-medium"
                                >
                                    Download Sample (.docx)
                                </a>
                            </div>
                            <div className="border border-dashed border-themeGrey rounded-2xl bg-black/30 p-6 text-center hover:bg-black/50 transition-all relative cursor-pointer">
                                <input
                                    type="file"
                                    accept=".docx"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                                <div className="space-y-2">
                                    <UploadCloud size={28} className="mx-auto text-themeTextGrey" />
                                    <div className="text-xs text-themeTextWhite font-semibold">
                                        {fileSelected ? fileSelected.name : "Select Word Document (.docx)"}
                                    </div>
                                    <div className="text-[10px] text-themeTextGrey">
                                        Supports files up to 10MB
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Parse Trigger */}
                        {fileSelected && (
                            <Button
                                onClick={handleParseDocument}
                                disabled={parsing}
                                variant="outline"
                                className="w-full py-5 border border-themeGrey hover:bg-themeGrey/50 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5"
                            >
                                {parsing ? (
                                    <>
                                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                        Parsing File...
                                    </>
                                ) : (
                                    <>
                                        <FileText size={16} /> Parse Questions Document
                                    </>
                                )}
                            </Button>
                        )}

                        {/* Publish Trigger */}
                        <Button
                            onClick={handlePublishExam}
                            disabled={isPending || parsedQuestions.length === 0}
                            className="w-full py-5 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl"
                        >
                            {isPending ? "Publishing..." : "Confirm & Publish Exam"}
                        </Button>
                    </GlassCard>

                    {/* Active Exams List */}
                    <div className="space-y-6 pt-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <BookOpen size={18} /> Published Exams ({exams.length})
                        </h3>
                        {loadingExams ? (
                            <div className="flex justify-center p-4">
                                <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></span>
                            </div>
                        ) : exams.length === 0 ? (
                            <GlassCard className="p-6 text-center text-themeTextGrey text-xs border border-themeGrey">
                                No exams published yet. Create one above.
                            </GlassCard>
                        ) : (
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                                {exams.map((ex: any) => (
                                    <GlassCard key={ex.id} className="p-4 border border-themeGrey/40 flex items-center justify-between hover:border-zinc-700 transition-all">
                                        <div>
                                            <h4 className="font-bold text-sm text-white">{ex.title}</h4>
                                            <p className="text-xs text-themeTextGrey mt-0.5">
                                                Duration: {ex.duration} mins | Questions: {ex.questions?.length || 0}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteExam(ex.id)}
                                            className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-red-400 hover:border-red-500/30 transition-all flex items-center justify-center"
                                            title="Delete Exam"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </GlassCard>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Parsing Results Preview Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Eye size={18} /> Questions Preview Grid
                        </h3>
                        {parseReport && (
                            <div className="flex gap-3 text-[10px] font-semibold text-themeTextGrey">
                                <span>Parsed: <span className="text-white font-bold">{parseReport.totalParsed}</span></span>
                                <span>Valid: <span className="text-emerald-400 font-bold">{parseReport.validCount}</span></span>
                                {parseReport.invalidCount > 0 && <span>Invalid: <span className="text-red-400 font-bold">{parseReport.invalidCount}</span></span>}
                            </div>
                        )}
                    </div>

                    {parsedQuestions.length === 0 ? (
                        <GlassCard className="p-8 text-center text-themeTextGrey text-sm border border-themeGrey">
                            Upload and parse a `.docx` file to display questions preview.
                        </GlassCard>
                    ) : (
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                            {parsedQuestions.map((q, idx) => (
                                <GlassCard 
                                    key={idx} 
                                    className="p-5 border border-themeGrey/40 space-y-4 hover:border-zinc-700 transition-all relative group"
                                >
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-themeTextGrey uppercase tracking-wider bg-zinc-900 border border-themeGrey px-2.5 py-0.5 rounded-md">
                                                Question {idx + 1}
                                            </span>
                                            <span className="text-xs font-bold text-emerald-400 bg-emerald-400/5 px-2 py-0.5 rounded-md">
                                                Ans: {q.correctAnswer}
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => handleDeleteQuestion(idx)}
                                            className="text-themeTextGrey hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                                            title="Delete Question"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <h4 className="font-bold text-sm text-white">{q.questionText}</h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-themeTextGrey border-t border-themeGrey/30 pt-3">
                                        <p className={q.correctAnswer === "A" ? "text-emerald-400 font-semibold" : ""}>A) {q.optionA}</p>
                                        <p className={q.correctAnswer === "B" ? "text-emerald-400 font-semibold" : ""}>B) {q.optionB}</p>
                                        <p className={q.correctAnswer === "C" ? "text-emerald-400 font-semibold" : ""}>C) {q.optionC}</p>
                                        <p className={q.correctAnswer === "D" ? "text-emerald-400 font-semibold" : ""}>D) {q.optionD}</p>
                                    </div>
                                </GlassCard>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
