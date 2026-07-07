"use client"

import React, { useState, useTransition, useEffect } from "react"
import { motion } from "framer-motion"
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
    Eye,
    Pencil,
    X
} from "lucide-react"
import { toast } from "sonner"

import GlassCard from "@/components/global/glass-card"
import { Button } from "@/components/ui/button"
import { 
    parseDocxQuestionsAction, 
    adminCreateExamAction,
    adminGetExamsListAction,
    adminDeleteExamAction,
    adminGetExamDetailsAction,
    adminUpdateExamAction
} from "@/actions/admin-actions"

export default function AdminExamsPage() {
    const [title, setTitle] = useState("")
    const [duration, setDuration] = useState(60)
    const [examCode, setExamCode] = useState("")
    const [isPending, startTransition] = useTransition()

    // Exams list states
    const [exams, setExams] = useState<any[]>([])
    const [loadingExams, setLoadingExams] = useState(true)

    // Edit Exam Modal States
    const [editingExamId, setEditingExamId] = useState<string | null>(null)
    const [editTitle, setEditTitle] = useState("")
    const [editDuration, setEditDuration] = useState(60)
    const [editExamCode, setEditExamCode] = useState("")
    const [editQuestions, setEditQuestions] = useState<any[]>([])
    const [savingEdit, setSavingEdit] = useState(false)

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
            const res = await adminCreateExamAction(title, duration, parsedQuestions, examCode)
            if (res.success) {
                toast.success(res.message || "Exam created successfully!")
                // Reset form
                setTitle("")
                setDuration(60)
                setExamCode("")
                setFileSelected(null)
                setParsedQuestions([])
                setParseReport(null)
                loadExams()
            } else {
                toast.error(res.error || "Failed to publish exam")
            }
        })
    }

    const handleStartEditExam = async (examId: string) => {
        try {
            const res = await adminGetExamDetailsAction(examId)
            if (res.success && res.exam) {
                setEditingExamId(examId)
                setEditTitle(res.exam.title)
                setEditDuration(res.exam.duration)
                setEditExamCode(res.exam.examCode || "")
                setEditQuestions(res.exam.questions || [])
            } else {
                toast.error(res.error || "Failed to fetch exam details.")
            }
        } catch (e: any) {
            toast.error("Error fetching exam details.")
        }
    }

    const handleSaveExamEdit = () => {
        if (!editTitle.trim()) {
            toast.error("Please provide an exam title.")
            return
        }
        if (editDuration <= 0) {
            toast.error("Duration must be at least 1 minute.")
            return
        }
        if (editQuestions.length === 0) {
            toast.error("Exam must have at least one question.")
            return
        }

        setSavingEdit(true)
        startTransition(async () => {
            const res = await adminUpdateExamAction(editingExamId!, editTitle, editDuration, editExamCode, editQuestions)
            setSavingEdit(false)
            if (res.success) {
                toast.success(res.message || "Exam updated successfully.")
                setEditingExamId(null)
                loadExams()
            } else {
                toast.error(res.error || "Failed to update exam.")
            }
        })
    }

    const handleEditQuestionField = (idx: number, field: string, value: string) => {
        setEditQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q))
    }

    const handleDeleteEditQuestion = (idx: number) => {
        setEditQuestions(prev => prev.filter((_, i) => i !== idx))
    }

    const handleAddEditQuestion = () => {
        setEditQuestions(prev => [
            ...prev,
            {
                questionText: "New Question Text",
                optionA: "Option A",
                optionB: "Option B",
                optionC: "Option C",
                optionD: "Option D",
                correctAnswer: "A"
            }
        ])
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

                        {/* Exam Entrance Code */}
                        <div>
                            <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">
                                Exam Entrance Code (Optional)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. CS101-MID (leave blank for no code)"
                                value={examCode}
                                onChange={(e) => setExamCode(e.target.value)}
                                className="w-full px-4 py-3 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-themeTextGrey focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm"
                            />
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
                                                Duration: {ex.duration} mins | Questions: {ex.questions?.length || 0} {ex.examCode && `| Code: ${ex.examCode}`}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleStartEditExam(ex.id)}
                                                className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:border-zinc-700 transition-all flex items-center justify-center"
                                                title="Edit Exam"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteExam(ex.id)}
                                                className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-red-400 hover:border-red-500/30 transition-all flex items-center justify-center"
                                                title="Delete Exam"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
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

            {/* Edit Exam Full-screen Overlay Modal */}
            {editingExamId && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-full max-w-4xl my-8"
                    >
                        <GlassCard className="p-8 border border-themeGrey space-y-6 flex flex-col max-h-[85vh]">
                            <div className="flex justify-between items-center border-b border-themeGrey/40 pb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Pencil size={20} /> Edit Exam details & MCQ questions
                                </h3>
                                <button 
                                    onClick={() => setEditingExamId(null)}
                                    className="p-1.5 bg-zinc-900 border border-themeGrey rounded-lg text-themeTextGrey hover:text-white transition-all"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Exam Metadata Inputs */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">
                                            Exam Title
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            className="w-full px-4 py-3 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-themeTextGrey focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">
                                            Duration (Minutes)
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min={1}
                                            value={editDuration}
                                            onChange={(e) => setEditDuration(Number(e.target.value))}
                                            className="w-full px-4 py-3 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-themeTextGrey focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">
                                            Entrance Code (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={editExamCode}
                                            placeholder="Leave empty for no code"
                                            onChange={(e) => setEditExamCode(e.target.value)}
                                            className="w-full px-4 py-3 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-themeTextGrey focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm font-medium"
                                        />
                                    </div>

                                    <Button
                                        onClick={handleSaveExamEdit}
                                        disabled={savingEdit}
                                        className="w-full py-5 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl mt-4"
                                    >
                                        {savingEdit ? "Saving..." : "Save Changes"}
                                    </Button>
                                </div>

                                {/* Questions list and editor */}
                                <div className="md:col-span-2 flex flex-col space-y-4 overflow-hidden">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-xs font-semibold text-themeTextGrey uppercase">
                                            MCQ Questions List ({editQuestions.length})
                                        </label>
                                        <Button
                                            onClick={handleAddEditQuestion}
                                            className="h-8 bg-zinc-900 border border-themeGrey hover:bg-zinc-800 text-white text-xs px-2.5 rounded-lg flex items-center gap-1"
                                        >
                                            <Plus size={12} /> Add Question
                                        </Button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 max-h-[50vh] border border-themeGrey/40 rounded-2xl p-4 bg-black/35">
                                        {editQuestions.length === 0 ? (
                                            <p className="text-xs text-themeTextGrey italic text-center py-8">No questions. Add one using the button above.</p>
                                        ) : (
                                            editQuestions.map((q, idx) => (
                                                <div key={idx} className="bg-zinc-950/70 p-4 border border-themeGrey/40 rounded-xl space-y-3 relative group/edit">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider bg-zinc-900 border border-themeGrey/80 px-2 py-0.5 rounded-md">
                                                            Question {idx + 1}
                                                        </span>
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleDeleteEditQuestion(idx)}
                                                            className="text-zinc-500 hover:text-red-400 transition-all"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>

                                                    <input
                                                        type="text"
                                                        value={q.questionText}
                                                        placeholder="Question text"
                                                        onChange={(e) => handleEditQuestionField(idx, "questionText", e.target.value)}
                                                        className="w-full px-3 py-2 bg-black border border-themeGrey/60 rounded-lg text-xs text-white placeholder-zinc-600 focus:outline-none"
                                                    />

                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div>
                                                            <span className="text-[10px] text-zinc-500 font-bold block mb-1">Option A</span>
                                                            <input
                                                                type="text"
                                                                value={q.optionA}
                                                                onChange={(e) => handleEditQuestionField(idx, "optionA", e.target.value)}
                                                                className="w-full px-2 py-1.5 bg-black border border-themeGrey/60 rounded-md text-xs text-white"
                                                            />
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] text-zinc-500 font-bold block mb-1">Option B</span>
                                                            <input
                                                                type="text"
                                                                value={q.optionB}
                                                                onChange={(e) => handleEditQuestionField(idx, "optionB", e.target.value)}
                                                                className="w-full px-2 py-1.5 bg-black border border-themeGrey/60 rounded-md text-xs text-white"
                                                            />
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] text-zinc-500 font-bold block mb-1">Option C</span>
                                                            <input
                                                                type="text"
                                                                value={q.optionC}
                                                                onChange={(e) => handleEditQuestionField(idx, "optionC", e.target.value)}
                                                                className="w-full px-2 py-1.5 bg-black border border-themeGrey/60 rounded-md text-xs text-white"
                                                            />
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] text-zinc-500 font-bold block mb-1">Option D</span>
                                                            <input
                                                                type="text"
                                                                value={q.optionD}
                                                                onChange={(e) => handleEditQuestionField(idx, "optionD", e.target.value)}
                                                                className="w-full px-2 py-1.5 bg-black border border-themeGrey/60 rounded-md text-xs text-white"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-zinc-500 font-bold uppercase">Correct Option:</span>
                                                        <select
                                                            value={q.correctAnswer}
                                                            onChange={(e) => handleEditQuestionField(idx, "correctAnswer", e.target.value)}
                                                            className="bg-black border border-themeGrey/60 text-white rounded px-2.5 py-1 text-xs focus:outline-none"
                                                        >
                                                            <option value="A">A</option>
                                                            <option value="B">B</option>
                                                            <option value="C">C</option>
                                                            <option value="D">D</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                </div>
            )}
        </div>
    )
}
