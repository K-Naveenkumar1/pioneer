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
    EyeOff,
    Pencil,
    X,
    Activity,
    Download,
    RefreshCw,
    Code,
    ShieldCheck
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
    adminUpdateExamAction,
    adminGetExamSubmissionsAction,
    adminResetExamAttemptAction,
    adminForceSubmitExamAttemptAction,
    adminCreateCodingExamAction,
    adminGetClassesAction,
    adminEndExamAction,
    adminPublishExamAgainAction,
    adminToggleRevealAnswersAction
} from "@/actions/admin-actions"
import { getAdminUser } from "@/actions/custom-auth"

export default function AdminExamsPage() {
    const [currentAdmin, setCurrentAdmin] = useState<any>(null)
    const [title, setTitle] = useState("")
    const [duration, setDuration] = useState(60)
    const [examCode, setExamCode] = useState("")
    const [classes, setClasses] = useState<any[]>([])
    const [classId, setClassId] = useState("")
    const [editClassId, setEditClassId] = useState("")
    const [isPending, startTransition] = useTransition()

    // Tab control
    const [activeTab, setActiveTab] = useState<"published" | "creator" | "submissions" | "monitoring">("published")

    // Creator Type Toggle
    const [examType, setExamType] = useState<"MCQ" | "CODING">("MCQ")
    const [codingQuestions, setCodingQuestions] = useState<any[]>([])

    // Exams list states
    const [exams, setExams] = useState<any[]>([])
    const [loadingExams, setLoadingExams] = useState(true)

    // Submissions and Live Monitoring states
    const [selectedSubmissionsExamId, setSelectedSubmissionsExamId] = useState("")
    const [completedAttempts, setCompletedAttempts] = useState<any[]>([])
    const [liveAttempts, setLiveAttempts] = useState<any[]>([])
    const [loadingSubmissions, setLoadingSubmissions] = useState(false)

    // Completed submissions sorting state
    const [sortBy, setSortBy] = useState<"scoreDesc" | "scoreAsc" | "timeAsc" | "timeDesc">("scoreDesc")
    const sortedCompletedAttempts = React.useMemo(() => {
        return [...completedAttempts].sort((a, b) => {
            if (sortBy === "scoreDesc") {
                return b.score - a.score
            }
            if (sortBy === "scoreAsc") {
                return a.score - b.score
            }
            if (sortBy === "timeAsc") {
                return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
            }
            if (sortBy === "timeDesc") {
                return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
            }
            return 0
        })
    }, [completedAttempts, sortBy])
    const [submittingAction, setSubmittingAction] = useState(false)

    // Edit Exam Modal States
    const [editingExamId, setEditingExamId] = useState<string | null>(null)
    const [editTitle, setEditTitle] = useState("")
    const [editDuration, setEditDuration] = useState(60)
    const [editExamCode, setEditExamCode] = useState("")
    const [editQuestions, setEditQuestions] = useState<any[]>([])
    const [savingEdit, setSavingEdit] = useState(false)

    const loadSubmissions = async (examId: string, forceSpinner = false) => {
        if (!examId) return
        const hasData = completedAttempts.length > 0 || liveAttempts.length > 0
        if (!hasData || forceSpinner) {
            setLoadingSubmissions(true)
        }
        try {
            const res = await adminGetExamSubmissionsAction(examId)
            if (res.success) {
                setCompletedAttempts(res.completed || [])
                setLiveAttempts(res.live || [])
            } else {
                toast.error(res.error || "Failed to load attempts")
            }
        } catch (e) {
            console.error(e)
            toast.error("Failed to fetch submissions")
        } finally {
            setLoadingSubmissions(false)
        }
    }

    const handleResetAttempt = async (attemptId: string) => {
        if (!confirm("Are you sure you want to revoke this attempt? The student's score will be deleted and they will be allowed to rewrite the exam from scratch.")) return
        setSubmittingAction(true)
        const res = await adminResetExamAttemptAction(attemptId)
        setSubmittingAction(false)
        if (res.success) {
            toast.success(res.message)
            loadSubmissions(selectedSubmissionsExamId)
        } else {
            toast.error(res.error || "Failed to revoke attempt.")
        }
    }

    const handleForceSubmitAttempt = async (attemptId: string) => {
        if (!confirm("Are you sure you want to force submit this active attempt? This will grade their answers submitted so far and complete their exam.")) return
        setSubmittingAction(true)
        const res = await adminForceSubmitExamAttemptAction(attemptId)
        setSubmittingAction(false)
        if (res.success) {
            toast.success(res.message)
            loadSubmissions(selectedSubmissionsExamId)
        } else {
            toast.error(res.error || "Failed to force submit attempt.")
        }
    }

    const handleDownloadExcel = () => {
        const selectedExam = exams.find(e => e.id === selectedSubmissionsExamId)
        const examName = selectedExam ? selectedExam.title : "Exam"
        
        if (completedAttempts.length === 0) {
            toast.warning("No completed results available to export.")
            return
        }

        const headers = ["Student Name", "Roll Number", "Marks"]
        const rows = completedAttempts.map(att => [
            att.studentName,
            att.rollNo,
            att.marks
        ])

        const csvContent = "\uFEFF" + [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        ].join("\n")

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `${examName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_results.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success("Results exported successfully.")
    }

    useEffect(() => {
        loadExams()
        loadClasses()
    }, [])

    // Poll for live submissions when an exam is selected for viewing submissions/monitoring
    useEffect(() => {
        if (!selectedSubmissionsExamId) return
        if (activeTab !== "submissions" && activeTab !== "monitoring") return

        // Fetch immediately on tab switch/exam change
        adminGetExamSubmissionsAction(selectedSubmissionsExamId).then(res => {
            if (res.success) {
                setCompletedAttempts(res.completed || [])
                setLiveAttempts(res.live || [])
            }
        })

        const interval = setInterval(() => {
            adminGetExamSubmissionsAction(selectedSubmissionsExamId).then(res => {
                if (res.success) {
                    setCompletedAttempts(res.completed || [])
                    setLiveAttempts(res.live || [])
                }
            })
        }, 5000) // Poll every 5 seconds to reduce server load

        return () => clearInterval(interval)
    }, [selectedSubmissionsExamId, activeTab])

    useEffect(() => {
        getAdminUser().then(user => setCurrentAdmin(user))
    }, [])

    const loadClasses = async () => {
        const res = await adminGetClassesAction()
        if (res.success) {
            setClasses(res.classes || [])
        }
    }

    const loadExams = async () => {
        setLoadingExams(true)
        const res = await adminGetExamsListAction()
        if (res.success) {
            setExams(res.exams || [])
            if (res.exams && res.exams.length > 0) {
                setSelectedSubmissionsExamId(prev => {
                    const nextId = prev || res.exams[0].id
                    loadSubmissions(nextId)
                    return nextId
                })
            }
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

    const handleEndExam = async (examId: string) => {
        if (!confirm("Are you sure you want to end this exam? Students will not be able to attend it anymore.")) return
        startTransition(async () => {
            const res = await adminEndExamAction(examId)
            if (res.success) {
                toast.success(res.message || "Exam ended successfully.")
                loadExams()
            } else {
                toast.error(res.error || "Failed to end exam.")
            }
        })
    }

    const handlePublishAgain = async (examId: string) => {
        if (!confirm("Are you sure you want to publish this exam again? Students will be able to take it.")) return
        startTransition(async () => {
            const res = await adminPublishExamAgainAction(examId)
            if (res.success) {
                toast.success(res.message || "Exam republished successfully.")
                loadExams()
            } else {
                toast.error(res.error || "Failed to republish exam.")
            }
        })
    }

    const handleToggleRevealAnswers = async (examId: string, currentStatus: boolean) => {
        const nextStatus = !currentStatus
        const msg = nextStatus
            ? "Are you sure you want to reveal answers for this exam to students?"
            : "Are you sure you want to hide answers for this exam from students?"
        if (!confirm(msg)) return
        startTransition(async () => {
            const res = await adminToggleRevealAnswersAction(examId, nextStatus)
            if (res.success) {
                toast.success(res.message || "Updated answer revelation state.")
                loadExams()
            } else {
                toast.error(res.error || "Failed to update answer revelation.")
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
            const res = await adminCreateExamAction(title, duration, parsedQuestions, examCode, classId)
            if (res.success) {
                toast.success(res.message || "Exam created successfully!")
                // Reset form
                setTitle("")
                setDuration(60)
                setExamCode("")
                setClassId("")
                setFileSelected(null)
                setParsedQuestions([])
                setParseReport(null)
                loadExams()
            } else {
                toast.error(res.error || "Failed to publish exam")
            }
        })
    }

    // Coding Exam helpers
    const handleAddCodingQuestion = () => {
        setCodingQuestions(prev => [
            ...prev,
            {
                title: `Challenge #${prev.length + 1}`,
                questionText: "",
                constraints: "",
                inputFormat: "",
                outputFormat: "",
                sampleInput: "",
                sampleOutput: "",
                testCases: []
            }
        ])
    }

    const handleRemoveCodingQuestion = (qIdx: number) => {
        setCodingQuestions(prev => prev.filter((_, i) => i !== qIdx))
    }

    const handleCodingQuestionChange = (qIdx: number, field: string, value: any) => {
        setCodingQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, [field]: value } : q))
    }

    const handleAddTestCase = (qIdx: number) => {
        setCodingQuestions(prev => prev.map((q, i) => {
            if (i !== qIdx) return q
            return {
                ...q,
                testCases: [...(q.testCases || []), { input: "", output: "", isSample: false }]
            }
        }))
    }

    const handleRemoveTestCase = (qIdx: number, tcIdx: number) => {
        setCodingQuestions(prev => prev.map((q, i) => {
            if (i !== qIdx) return q
            return {
                ...q,
                testCases: q.testCases.filter((_: any, t: number) => t !== tcIdx)
            }
        }))
    }

    const handleTestCaseChange = (qIdx: number, tcIdx: number, field: string, value: any) => {
        setCodingQuestions(prev => prev.map((q, i) => {
            if (i !== qIdx) return q
            const updatedTcs = q.testCases.map((tc: any, t: number) => t === tcIdx ? { ...tc, [field]: value } : tc)
            return { ...q, testCases: updatedTcs }
        }))
    }

    const handlePublishCodingExam = () => {
        if (!title.trim()) {
            toast.error("Please provide an exam title.")
            return
        }
        if (duration <= 0) {
            toast.error("Exam duration must be at least 1 minute.")
            return
        }
        if (codingQuestions.length === 0) {
            toast.error("Please add at least one coding question.")
            return
        }

        // Validate
        for (let i = 0; i < codingQuestions.length; i++) {
            const q = codingQuestions[i]
            if (!q.title.trim() || !q.questionText.trim()) {
                toast.error(`Question #${i + 1} is missing title or description.`)
                return
            }
            if (!q.testCases || q.testCases.length === 0) {
                toast.error(`Question #${i + 1} must have at least one testcase.`)
                return
            }
        }

        // Format
        const formatted = codingQuestions.map(q => ({
            title: q.title,
            questionText: q.questionText,
            constraints: q.constraints,
            inputFormat: q.inputFormat,
            outputFormat: q.outputFormat,
            sampleInput: q.sampleInput,
            sampleOutput: q.sampleOutput,
            testCases: JSON.stringify(q.testCases)
        }))

        startTransition(async () => {
            const res = await adminCreateCodingExamAction(title, duration, examCode, formatted, classId)
            if (res.success) {
                toast.success(res.message || "Coding Exam published successfully!")
                setTitle("")
                setDuration(60)
                setExamCode("")
                setClassId("")
                setCodingQuestions([])
                loadExams()
            } else {
                toast.error(res.error || "Failed to publish coding exam.")
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
                setEditClassId(res.exam.classId || "")
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
            const res = await adminUpdateExamAction(editingExamId!, editTitle, editDuration, editExamCode, editQuestions, editClassId)
            setSavingEdit(false)
            if (res.success) {
                toast.success(res.message || "Exam updated successfully.")
                setEditingExamId(null)
                setEditClassId("")
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

            {/* Tabs Navigation */}
            <div className="flex border-b border-themeGrey/60">
                <button
                    onClick={() => setActiveTab("published")}
                    className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === "published"
                            ? "border-white text-white bg-white/[0.02]"
                            : "border-transparent text-themeTextGrey hover:text-white"
                    }`}
                >
                    <FileText size={16} /> Published Exams
                </button>
                <button
                    onClick={() => setActiveTab("creator")}
                    className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === "creator"
                            ? "border-white text-white bg-white/[0.02]"
                            : "border-transparent text-themeTextGrey hover:text-white"
                    }`}
                >
                    <Plus size={16} /> MCQ/Coding Creator
                </button>
                <button
                    onClick={() => {
                        setActiveTab("submissions")
                        if (selectedSubmissionsExamId) {
                            loadSubmissions(selectedSubmissionsExamId)
                        }
                    }}
                    className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === "submissions"
                            ? "border-white text-white bg-white/[0.02]"
                            : "border-transparent text-themeTextGrey hover:text-white"
                    }`}
                >
                    <CheckCircle size={16} /> Completed Results
                </button>
                <button
                    onClick={() => {
                        setActiveTab("monitoring")
                        if (selectedSubmissionsExamId) {
                            loadSubmissions(selectedSubmissionsExamId)
                        }
                    }}
                    className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === "monitoring"
                            ? "border-white text-white bg-white/[0.02]"
                            : "border-transparent text-themeTextGrey hover:text-white"
                    }`}
                >
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    Live Monitoring
                </button>
            </div>

            {/* Mode selection toggle */}
            {activeTab === "creator" && (
                <div className="flex gap-4 p-4 bg-zinc-950 border border-themeGrey/60 rounded-2xl items-center shrink-0">
                    <span className="text-xs font-bold text-themeTextGrey uppercase">Exam Creation Mode:</span>
                    <button
                        onClick={() => setExamType("MCQ")}
                        className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                            examType === "MCQ"
                                ? "bg-white text-black border-white"
                                : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700"
                        }`}
                    >
                        MCQ Exam (Docx Upload)
                    </button>
                    <button
                        onClick={() => setExamType("CODING")}
                        className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                            examType === "CODING"
                                ? "bg-white text-black border-white"
                                : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700"
                        }`}
                    >
                        Coding Exam (Manual Builder)
                    </button>
                </div>
            )}

            {activeTab === "published" && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <FileText size={20} /> Published Exams ({exams.length})
                            </h3>
                            <p className="text-xs text-themeTextGrey mt-1">Manage your active, scheduled, and ended MCQ or coding exams.</p>
                        </div>
                        <Button 
                            onClick={() => setActiveTab("creator")}
                            className="bg-white hover:bg-zinc-200 text-black font-bold rounded-xl flex items-center gap-1.5 px-4 py-2.5 text-xs transition-all shadow-lg"
                        >
                            <Plus size={14} /> Create New Exam
                        </Button>
                    </div>

                    {loadingExams ? (
                        <div className="flex justify-center py-12">
                            <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></span>
                        </div>
                    ) : exams.length === 0 ? (
                        <GlassCard className="p-12 text-center text-themeTextGrey text-sm border border-themeGrey/60 space-y-3">
                            <BookOpen className="mx-auto text-zinc-600 mb-2" size={32} />
                            <p className="font-semibold text-white">No exams published yet</p>
                            <p className="text-xs text-themeTextGrey">Get started by creating a new exam from the creator tab.</p>
                            <Button 
                                onClick={() => setActiveTab("creator")}
                                className="bg-zinc-900 border border-zinc-800 text-white font-semibold rounded-xl text-xs px-4 py-2 hover:bg-zinc-800 transition-all mt-2"
                            >
                                Open Creator
                            </Button>
                        </GlassCard>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {exams.map((ex: any) => (
                                <GlassCard key={ex.id} className="p-6 border border-themeGrey/40 flex flex-col justify-between hover:border-zinc-700 hover:bg-white/[0.01] transition-all duration-300">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-start gap-4">
                                            <h4 className="font-bold text-base text-white tracking-tight line-clamp-1" title={ex.title}>
                                                {ex.title}
                                            </h4>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                                    ex.isAnswerRevealed
                                                        ? "bg-purple-500/10 text-purple-400 border-purple-500/20 flex items-center gap-1"
                                                        : "bg-zinc-800/80 text-zinc-400 border-zinc-700/80 flex items-center gap-1"
                                                }`}>
                                                    {ex.isAnswerRevealed ? <><Eye size={10} /> Answers Revealed</> : <><EyeOff size={10} /> Hidden</>}
                                                </span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                                    ex.isActive === false
                                                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                                                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                }`}>
                                                    {ex.isActive === false ? "Ended" : "Active"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2.5 pt-1">
                                            <span className="text-[10px] bg-white/10 text-zinc-300 font-bold px-2 py-0.5 rounded">
                                                {ex.type || "MCQ"}
                                            </span>
                                            <span className="text-[10px] bg-zinc-900 border border-zinc-800/80 text-zinc-400 font-medium px-2 py-0.5 rounded flex items-center gap-1">
                                                <Clock size={10} /> {ex.duration}m
                                            </span>
                                            <span className="text-[10px] bg-zinc-900 border border-zinc-800/80 text-zinc-400 font-medium px-2 py-0.5 rounded flex items-center gap-1">
                                                <BookOpen size={10} /> Qs: {ex.questions?.length || 0}
                                            </span>
                                            {ex.class?.name && (
                                                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                                                    {ex.class.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-themeGrey/30">
                                        <button
                                            onClick={() => handleToggleRevealAnswers(ex.id, !!ex.isAnswerRevealed)}
                                            className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1 text-[11px] font-bold ${
                                                ex.isAnswerRevealed
                                                    ? "bg-purple-950/40 border-purple-900/50 text-purple-400 hover:bg-purple-950/80 hover:text-purple-300 hover:border-purple-500/40"
                                                    : "bg-purple-600 hover:bg-purple-500 text-white border-purple-500 shadow-md shadow-purple-900/30"
                                            }`}
                                            title={ex.isAnswerRevealed ? "Hide Answers from Students" : "Reveal Answers to Students"}
                                        >
                                            {ex.isAnswerRevealed ? (
                                                <><EyeOff size={12} /> Hide Answers</>
                                            ) : (
                                                <><Eye size={12} /> Reveal Answers</>
                                            )}
                                        </button>
                                        {ex.isActive !== false ? (
                                            <button
                                                onClick={() => handleEndExam(ex.id)}
                                                className="px-3 py-1.5 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 hover:bg-red-950/80 hover:text-red-300 hover:border-red-500/40 transition-all flex items-center gap-1 text-[11px] font-bold"
                                                title="End Exam"
                                            >
                                                <X size={12} /> End Exam
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handlePublishAgain(ex.id)}
                                                className="px-3 py-1.5 bg-emerald-950/40 border border-emerald-900/50 rounded-xl text-emerald-400 hover:bg-emerald-950/80 hover:text-emerald-300 hover:border-emerald-500/40 transition-all flex items-center gap-1 text-[11px] font-bold"
                                                title="Publish Again"
                                            >
                                                <RefreshCw size={12} /> Publish Again
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleStartEditExam(ex.id)}
                                            className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:border-zinc-700 transition-all flex items-center justify-center"
                                            title="Edit Exam"
                                        >
                                            <Pencil size={13} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteExam(ex.id)}
                                            className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-red-400 hover:border-red-500/30 transition-all flex items-center justify-center"
                                            title="Delete Exam"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </GlassCard>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === "creator" && (
                currentAdmin?.adminRole === "SUPER_ADMIN" ? (
                    <GlassCard className="p-8 text-center border border-amber-500/30 bg-amber-500/5 space-y-3">
                        <ShieldCheck size={32} className="mx-auto text-amber-400" />
                        <h3 className="text-lg font-bold text-white">Super Admin Oversight Mode</h3>
                        <p className="text-sm text-zinc-300 max-w-xl mx-auto leading-relaxed">
                            Super Admins monitor published exams and student attempt results across all classes. Creating and publishing exams is managed by Class Admins for their assigned classes.
                        </p>
                    </GlassCard>
                ) : (
                /* Split layout */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form & Setup Column */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            {examType === "MCQ" ? "MCQ Exam Settings" : "Coding Exam Settings"}
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
                                    placeholder="e.g. CS101-MID"
                                    value={examCode}
                                    onChange={(e) => setExamCode(e.target.value)}
                                    className="w-full px-4 py-3 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-themeTextGrey focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm"
                                />
                            </div>

                            {/* Target Class Selector */}
                            <div>
                                <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">
                                    Target Class / Batch (Optional)
                                </label>
                                <select
                                    value={classId}
                                    onChange={(e) => setClassId(e.target.value)}
                                    className="w-full px-4 py-3 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-themeTextGrey focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm font-medium"
                                >
                                    <option value="" className="bg-zinc-950 text-white">All Classes (Global)</option>
                                    {classes.map(cls => (
                                        <option key={cls.id} value={cls.id} className="bg-zinc-950 text-white">
                                            {cls.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {examType === "MCQ" ? (
                                <>
                                    {/* Word File Upload Box */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-xs font-semibold text-themeTextGrey uppercase">
                                                Upload MCQ Word Document (.docx)
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

                                    {/* MCQ Publish Trigger */}
                                    <Button
                                        onClick={handlePublishExam}
                                        disabled={isPending || parsedQuestions.length === 0}
                                        className="w-full py-5 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl"
                                    >
                                        {isPending ? "Publishing..." : "Confirm & Publish MCQ Exam"}
                                    </Button>
                                </>
                            ) : (
                                /* Coding Publish Trigger */
                                <Button
                                    onClick={handlePublishCodingExam}
                                    disabled={isPending || codingQuestions.length === 0}
                                    className="w-full py-5 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl"
                                >
                                    {isPending ? "Publishing..." : "Confirm & Publish Coding Exam"}
                                </Button>
                            )}
                        </GlassCard>
                    </div>

                    {/* Right column view: MCQ Preview vs Coding Questions manual builder */}
                    <div className="lg:col-span-2 space-y-6">
                        {examType === "MCQ" ? (
                            <>
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Eye size={18} /> MCQ Questions Preview
                                    </h3>
                                    {parseReport && (
                                        <div className="flex gap-3 text-[10px] font-semibold text-themeTextGrey">
                                            <span>Parsed: <span className="text-white font-bold">{parseReport.totalParsed}</span></span>
                                            <span>Valid: <span className="text-emerald-400 font-bold">{parseReport.validCount}</span></span>
                                        </div>
                                    )}
                                </div>

                                {parsedQuestions.length === 0 ? (
                                    <GlassCard className="p-8 text-center text-themeTextGrey text-sm border border-themeGrey">
                                        Upload and parse a `.docx` file to display MCQ questions.
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

                                                <h4 className="font-bold text-sm text-white whitespace-pre-wrap">{q.questionText}</h4>

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
                            </>
                        ) : (
                            /* Coding questions builder */
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Code size={18} /> Coding Tasks Builder
                                    </h3>
                                    <Button
                                        onClick={handleAddCodingQuestion}
                                        className="bg-white hover:bg-zinc-200 text-black text-xs font-bold rounded-xl flex items-center gap-1 px-4 py-2"
                                    >
                                        <Plus size={14} /> Add Coding Task
                                    </Button>
                                </div>

                                {codingQuestions.length === 0 ? (
                                    <GlassCard className="p-8 text-center text-themeTextGrey text-sm border border-themeGrey">
                                        No coding tasks created yet. Click "Add Coding Task" above to add challenges.
                                    </GlassCard>
                                ) : (
                                    <div className="space-y-6 max-h-[600px] overflow-y-auto pr-1">
                                        {codingQuestions.map((q, qIdx) => (
                                            <GlassCard key={qIdx} className="p-6 border border-themeGrey/50 space-y-4">
                                                <div className="flex justify-between items-center border-b border-themeGrey/40 pb-3">
                                                    <span className="text-xs font-bold text-themeTextWhite uppercase">
                                                        Task #{qIdx + 1} Settings
                                                    </span>
                                                    <button
                                                        onClick={() => handleRemoveCodingQuestion(qIdx)}
                                                        className="text-xs text-red-400 hover:text-red-500 font-semibold flex items-center gap-1"
                                                    >
                                                        <Trash2 size={14} /> Remove Task
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[10px] font-semibold text-themeTextGrey uppercase mb-1.5">Question Title</label>
                                                        <input
                                                            type="text"
                                                            value={q.title}
                                                            onChange={(e) => handleCodingQuestionChange(qIdx, "title", e.target.value)}
                                                            className="w-full px-3 py-2 bg-black/40 border border-themeGrey rounded-lg text-white text-xs"
                                                            placeholder="e.g. Reverse a String"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-semibold text-themeTextGrey uppercase mb-1.5">Constraints (Optional)</label>
                                                        <input
                                                            type="text"
                                                            value={q.constraints}
                                                            onChange={(e) => handleCodingQuestionChange(qIdx, "constraints", e.target.value)}
                                                            className="w-full px-3 py-2 bg-black/40 border border-themeGrey rounded-lg text-white text-xs"
                                                            placeholder="e.g. 1 <= N <= 10^5"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-semibold text-themeTextGrey uppercase mb-1.5">Problem Description</label>
                                                    <textarea
                                                        value={q.questionText}
                                                        onChange={(e) => handleCodingQuestionChange(qIdx, "questionText", e.target.value)}
                                                        className="w-full min-h-[80px] p-3 bg-black/40 border border-themeGrey rounded-lg text-white text-xs resize-none"
                                                        placeholder="Write full question prompt, instructions, and constraints here..."
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[10px] font-semibold text-themeTextGrey uppercase mb-1.5">Input Format</label>
                                                        <input
                                                            type="text"
                                                            value={q.inputFormat}
                                                            onChange={(e) => handleCodingQuestionChange(qIdx, "inputFormat", e.target.value)}
                                                            className="w-full px-3 py-2 bg-black/40 border border-themeGrey rounded-lg text-white text-xs"
                                                            placeholder="e.g. A single line containing integer N"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-semibold text-themeTextGrey uppercase mb-1.5">Output Format</label>
                                                        <input
                                                            type="text"
                                                            value={q.outputFormat}
                                                            onChange={(e) => handleCodingQuestionChange(qIdx, "outputFormat", e.target.value)}
                                                            className="w-full px-3 py-2 bg-black/40 border border-themeGrey rounded-lg text-white text-xs"
                                                            placeholder="e.g. Output the reversed string"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[10px] font-semibold text-themeTextGrey uppercase mb-1.5">Sample Input</label>
                                                        <textarea
                                                            value={q.sampleInput}
                                                            onChange={(e) => handleCodingQuestionChange(qIdx, "sampleInput", e.target.value)}
                                                            className="w-full min-h-[50px] p-3 bg-black/40 border border-themeGrey rounded-lg text-white text-xs font-mono"
                                                            placeholder="Sample Input value"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-semibold text-themeTextGrey uppercase mb-1.5">Sample Output</label>
                                                        <textarea
                                                            value={q.sampleOutput}
                                                            onChange={(e) => handleCodingQuestionChange(qIdx, "sampleOutput", e.target.value)}
                                                            className="w-full min-h-[50px] p-3 bg-black/40 border border-themeGrey rounded-lg text-white text-xs font-mono"
                                                            placeholder="Expected Sample Output value"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Test Cases Builder */}
                                                <div className="space-y-3 pt-2">
                                                    <div className="flex justify-between items-center border-t border-themeGrey/30 pt-3">
                                                        <span className="text-[10px] font-bold text-themeTextGrey uppercase">Test Cases List ({q.testCases?.length || 0})</span>
                                                        <button
                                                            onClick={() => handleAddTestCase(qIdx)}
                                                            className="text-[10px] text-white hover:underline flex items-center gap-1 font-semibold"
                                                        >
                                                            <Plus size={12} /> Add Test Case
                                                        </button>
                                                    </div>

                                                    {q.testCases?.map((tc: any, tcIdx: number) => (
                                                        <div key={tcIdx} className="grid grid-cols-1 md:grid-cols-3 gap-2.5 p-3 bg-black/40 border border-themeGrey/40 rounded-xl items-center">
                                                            <div>
                                                                <input
                                                                    type="text"
                                                                    value={tc.input}
                                                                    onChange={(e) => handleTestCaseChange(qIdx, tcIdx, "input", e.target.value)}
                                                                    placeholder="Input"
                                                                    className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-[11px] font-mono"
                                                                />
                                                            </div>
                                                            <div>
                                                                <input
                                                                    type="text"
                                                                    value={tc.output}
                                                                    onChange={(e) => handleTestCaseChange(qIdx, tcIdx, "output", e.target.value)}
                                                                    placeholder="Expected Output"
                                                                    className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-[11px] font-mono"
                                                                />
                                                            </div>
                                                            <div className="flex justify-between items-center gap-2">
                                                                <label className="flex items-center gap-1 cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={tc.isSample}
                                                                        onChange={(e) => handleTestCaseChange(qIdx, tcIdx, "isSample", e.target.checked)}
                                                                        className="rounded border-zinc-800 bg-zinc-950 text-white"
                                                                    />
                                                                    <span className="text-[10px] text-zinc-400">Sample?</span>
                                                                </label>
                                                                <button
                                                                    onClick={() => handleRemoveTestCase(qIdx, tcIdx)}
                                                                    className="text-red-400 hover:text-red-500"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </GlassCard>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {(activeTab === "submissions" || activeTab === "monitoring") && (
                /* Submissions & Monitoring Tab Panel Grid */
                <div className="space-y-8">
                    {/* Selector Row */}
                    <GlassCard className="p-6 border border-themeGrey flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-themeTextGrey uppercase">
                                Select Published Exam
                            </label>
                            <select
                                value={selectedSubmissionsExamId}
                                onChange={(e) => {
                                    setSelectedSubmissionsExamId(e.target.value)
                                    loadSubmissions(e.target.value)
                                }}
                                className="bg-black/40 border border-themeGrey rounded-xl text-white px-4 py-2.5 text-sm font-medium focus:outline-none w-64 mt-1.5"
                            >
                                {exams.length === 0 ? (
                                    <option value="" className="bg-zinc-950 text-white">No Exams Available</option>
                                ) : (
                                    exams.map(ex => (
                                        <option key={ex.id} value={ex.id} className="bg-zinc-950 text-white">
                                            {ex.title}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div className="flex gap-3 shrink-0">
                            <Button
                                onClick={() => loadSubmissions(selectedSubmissionsExamId, true)}
                                disabled={loadingSubmissions || !selectedSubmissionsExamId}
                                variant="outline"
                                className="border border-themeGrey hover:bg-themeGrey/40 text-white flex items-center gap-1.5 py-4 rounded-xl text-xs"
                            >
                                <RefreshCw size={14} className={loadingSubmissions ? "animate-spin" : ""} /> Refresh Status
                            </Button>
                            {activeTab === "submissions" && (
                                <Button
                                    onClick={handleDownloadExcel}
                                    disabled={loadingSubmissions || completedAttempts.length === 0 || !selectedSubmissionsExamId}
                                    className="bg-white hover:bg-zinc-200 text-black font-semibold flex items-center gap-1.5 py-4 rounded-xl text-xs"
                                >
                                    <Download size={14} /> Export Results (Excel/CSV)
                                </Button>
                            )}
                        </div>
                    </GlassCard>

                    {loadingSubmissions ? (
                        <div className="min-h-[30vh] flex items-center justify-center">
                            <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></span>
                        </div>
                    ) : !selectedSubmissionsExamId ? (
                        <GlassCard className="p-8 text-center text-themeTextGrey text-sm border border-themeGrey">
                            Please publish an exam first to monitor and view submissions.
                        </GlassCard>
                    ) : activeTab === "submissions" ? (
                        /* Completed Submissions Column */
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-zinc-950/40 p-4 border border-themeGrey/40 rounded-2xl">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <CheckCircle size={18} className="text-emerald-400" />
                                    Completed Results ({completedAttempts.length})
                                </h3>

                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-zinc-500 font-semibold uppercase">Sort By:</span>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className="bg-zinc-900 border border-themeGrey rounded-lg text-white px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-white/20 cursor-pointer"
                                    >
                                        <option value="scoreDesc">Marks: High to Low</option>
                                        <option value="scoreAsc">Marks: Low to High</option>
                                        <option value="timeAsc">Completed: First to Last</option>
                                        <option value="timeDesc">Completed: Last to First</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1">
                                {sortedCompletedAttempts.length === 0 ? (
                                    <GlassCard className="p-8 text-center text-themeTextGrey text-sm border border-themeGrey">
                                        No students have finished this exam yet.
                                    </GlassCard>
                                ) : (
                                    sortedCompletedAttempts.map((att: any) => (
                                        <GlassCard key={att.id} className="p-5 border border-themeGrey/40 hover:border-zinc-700 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div className="space-y-1 overflow-hidden">
                                                <h4 className="font-bold text-sm text-white truncate">{att.studentName}</h4>
                                                <p className="text-xs text-themeTextGrey truncate font-medium">Roll No: {att.rollNo}</p>
                                                <p className="text-[10px] text-zinc-500">
                                                    Finished: {new Date(att.completedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-6">
                                                <div className="text-center min-w-[70px]">
                                                    <p className="text-[10px] text-zinc-500 uppercase">Score</p>
                                                    <p className="text-lg font-extrabold text-emerald-400 mt-0.5">{att.score} pts</p>
                                                </div>
                                                <div className="text-center min-w-[70px]">
                                                    <p className="text-[10px] text-zinc-500 uppercase">Marks</p>
                                                    <p className="text-sm font-bold text-white mt-1">{att.marks}</p>
                                                </div>
                                                <div className="text-center min-w-[70px]">
                                                    <p className="text-[10px] text-zinc-500 uppercase">Warnings</p>
                                                    <p className={`text-sm font-bold mt-1 ${att.warnings > 0 ? "text-red-400 font-bold" : "text-white"}`}>
                                                        {att.warnings}
                                                    </p>
                                                </div>

                                                <button
                                                    onClick={() => handleResetAttempt(att.id)}
                                                    disabled={submittingAction}
                                                    className="px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all rounded-lg text-xs font-bold shrink-0"
                                                >
                                                    Allow Rewrite
                                                </button>
                                            </div>
                                        </GlassCard>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Live Monitoring Column */
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <span className="flex h-2.5 w-2.5 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                    </span>
                                    Live Writing Now ({liveAttempts.length})
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[700px] overflow-y-auto pr-1">
                                {liveAttempts.length === 0 ? (
                                    <div className="col-span-full">
                                        <GlassCard className="p-8 text-center text-themeTextGrey text-sm border border-themeGrey italic">
                                            No students are currently taking this exam.
                                        </GlassCard>
                                    </div>
                                ) : (
                                    liveAttempts.map((att: any) => (
                                        <GlassCard key={att.id} className="p-5 border border-red-500/10 bg-red-500/[0.02] space-y-4 hover:border-red-500/20 transition-all">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="overflow-hidden">
                                                    <h4 className="font-bold text-sm text-white truncate">{att.studentName}</h4>
                                                    <p className="text-[10px] text-themeTextGrey truncate">{att.rollNo}</p>
                                                </div>
                                                <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                                    Active
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-xs text-themeTextGrey">
                                                <div>
                                                    <p className="text-[10px] text-zinc-500">Progress</p>
                                                    <p className="font-semibold text-white mt-0.5">
                                                        {att.answeredCount} / {att.totalQuestions} Ans
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-zinc-500">Warnings</p>
                                                    <p className={`font-semibold mt-0.5 ${att.warnings > 0 ? "text-amber-400 font-bold" : "text-white"}`}>
                                                        {att.warnings} / 3
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Live Questions Answered Map */}
                                            {att.questions && att.questions.length > 0 && (
                                                <div className="border-t border-themeGrey/40 pt-3 space-y-1.5">
                                                    <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Answered Map</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {att.questions.map((q: any, idx: number) => {
                                                            const isAnswered = att.answeredQuestions?.includes(q.id)
                                                            return (
                                                                <div
                                                                    key={q.id}
                                                                    className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-bold border transition-all ${
                                                                        isAnswered
                                                                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-extrabold"
                                                                            : "bg-zinc-900 text-zinc-600 border-zinc-800"
                                                                    }`}
                                                                    title={`Question ${idx + 1}: ${isAnswered ? "Answered" : "Unanswered"}`}
                                                                >
                                                                    {idx + 1}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="text-[10px] text-zinc-500 border-t border-themeGrey/40 pt-3 flex justify-between items-center">
                                                <span>Started: {new Date(att.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                <button
                                                    onClick={() => handleForceSubmitAttempt(att.id)}
                                                    disabled={submittingAction}
                                                    className="text-[10px] font-bold text-amber-500 hover:text-amber-400 transition-all"
                                                >
                                                    Force Submit
                                                </button>
                                            </div>
                                        </GlassCard>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

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
                                    <div>
                                        <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">
                                            Target Class / Batch (Optional)
                                        </label>
                                        <select
                                            value={editClassId}
                                            onChange={(e) => setEditClassId(e.target.value)}
                                            className="w-full px-4 py-3 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-themeTextGrey focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm font-medium"
                                        >
                                            <option value="" className="bg-zinc-950 text-white">All Classes (Global)</option>
                                            {classes.map(cls => (
                                                <option key={cls.id} value={cls.id} className="bg-zinc-950 text-white">
                                                    {cls.name}
                                                </option>
                                            ))}
                                        </select>
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

                                                    <textarea
                                                        value={q.questionText}
                                                        placeholder="Question text"
                                                        onChange={(e) => handleEditQuestionField(idx, "questionText", e.target.value)}
                                                        className="w-full min-h-[60px] px-3 py-2 bg-black border border-themeGrey/60 rounded-lg text-xs text-white placeholder-zinc-600 focus:outline-none resize-y"
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
