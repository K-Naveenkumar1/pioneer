"use client"

import {
    AnalysisResult,
    analyzeResumeAction,
    deleteResumeAnalysisAction,
    getStudentResumeAnalysesAction
} from "@/actions/resume-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    FileCheck,
    FileType,
    HelpCircle,
    History,
    Loader2,
    RefreshCw,
    Sparkles,
    Trash2,
    TrendingUp,
    Upload
} from "lucide-react"
import mammoth from "mammoth"
import React, { useEffect, useState } from "react"
import { toast } from "sonner"

interface SavedAnalysis {
    id: string
    jobTitle: string | null
    companyName: string | null
    jobDescription: string
    resumeText: string
    matchScore: number
    summary: string
    matchingSkills: string[]
    missingSkills: string[]
    improvements: any[]
    interviewPrep: any[]
    createdAt: string | Date
}

export default function ResumeAnalyzerPage() {
    const [jobTitle, setJobTitle] = useState("")
    const [companyName, setCompanyName] = useState("")
    const [jobDescription, setJobDescription] = useState("")
    const [resumeText, setResumeText] = useState("")
    
    // Uploaded file metadata
    const [uploadedFile, setUploadedFile] = useState<{
        name: string
        size: string
        type: string
    } | null>(null)

    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null)
    const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([])
    const [isLoadingHistory, setIsLoadingHistory] = useState(true)
    const [activeTab, setActiveTab] = useState("analyzer")
    const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null)
    const [questionCategoryFilter, setQuestionCategoryFilter] = useState("All")

    useEffect(() => {
        fetchHistory()
    }, [])

    const fetchHistory = async () => {
        setIsLoadingHistory(true)
        const res = await getStudentResumeAnalysesAction()
        if (res.success && res.analyses) {
            setSavedAnalyses(res.analyses as SavedAnalysis[])
        }
        setIsLoadingHistory(false)
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes"
        const k = 1024
        const sizes = ["Bytes", "KB", "MB"]
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
    }

    const extractTextFromPdf = async (arrayBuffer: ArrayBuffer): Promise<string> => {
        // Attempt 1: Try pdfjs-dist web build (bypasses Node canvas dependency)
        try {
            // @ts-ignore
            const pdfjsLib = await import("pdfjs-dist/build/pdf.mjs")
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "3.11.174"}/pdf.worker.min.mjs`
            const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) })
            const pdf = await loadingTask.promise
            let fullText = ""
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i)
                const textContent = await page.getTextContent()
                const pageStrings = textContent.items.map((item: any) => item.str || "")
                fullText += pageStrings.join(" ") + "\n"
            }
            if (fullText.trim().length > 20) {
                return fullText.trim()
            }
        } catch (err) {
            console.warn("pdfjs-dist parse notice, using stream fallback:", err)
        }

        // Attempt 2: Binary stream text extractor for PDF ArrayBuffers
        try {
            const bytes = new Uint8Array(arrayBuffer)
            const decoder = new TextDecoder("latin1")
            const rawStr = decoder.decode(bytes)
            const textParts: string[] = []

            // Extract literal strings enclosed in () inside PDF stream operators like Tj/TJ
            const matches = rawStr.match(/\(([^()]{2,120})\)\s*Tj|\[([^\]]{2,300})\]\s*TJ/g) || []
            for (const match of matches) {
                const cleaned = match
                    .replace(/\\\(|\\\)/g, "")
                    .replace(/[()\[\]]/g, " ")
                    .replace(/\b(Tj|TJ)\b/g, " ")
                    .replace(/[^\x20-\x7E\n\r\t]/g, " ")
                    .replace(/\s+/g, " ")
                    .trim()
                if (cleaned.length > 2 && !/^\d+\s+\d+\s+obj/i.test(cleaned)) {
                    textParts.push(cleaned)
                }
            }

            if (textParts.length > 0) {
                return textParts.join(" ")
            }

            // Attempt 3: General ASCII character stream extraction
            const printableOnly = rawStr.replace(/[^\x20-\x7E\n\r\t]/g, " ")
                .replace(/\s+/g, " ")
                .trim()
            if (printableOnly.length > 50) {
                return printableOnly
            }
        } catch (e) {
            console.error("Stream parse fallback error:", e)
        }

        return ""
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const ext = file.name.split(".").pop()?.toLowerCase()
        const sizeFormatted = formatFileSize(file.size)

        if (ext === "txt") {
            const reader = new FileReader()
            reader.onload = (event) => {
                const text = event.target?.result as string
                if (text && text.trim()) {
                    setResumeText(text.trim())
                    setUploadedFile({ name: file.name, size: sizeFormatted, type: "TXT" })
                    toast.success("TXT Resume uploaded successfully!")
                } else {
                    toast.error("The uploaded file appears to be empty.")
                }
            }
            reader.readAsText(file)
        } else if (ext === "docx") {
            try {
                const arrayBuffer = await file.arrayBuffer()
                const result = await mammoth.extractRawText({ arrayBuffer })
                if (result.value && result.value.trim()) {
                    setResumeText(result.value.trim())
                    setUploadedFile({ name: file.name, size: sizeFormatted, type: "DOCX" })
                    toast.success("DOCX Resume uploaded and extracted!")
                } else {
                    toast.error("Could not extract text from .docx file.")
                }
            } catch (err) {
                console.error("Docx parse error:", err)
                toast.error("Failed to read .docx file.")
            }
        } else if (ext === "pdf") {
            try {
                const arrayBuffer = await file.arrayBuffer()
                const extractedText = await extractTextFromPdf(arrayBuffer)

                if (extractedText && extractedText.trim().length > 15) {
                    setResumeText(extractedText)
                    setUploadedFile({ name: file.name, size: sizeFormatted, type: "PDF" })
                    toast.success("PDF Resume uploaded and text extracted!")
                } else {
                    // Fallback to filename context if PDF is pure image scans
                    const fileContext = `Candidate PDF Resume File: ${file.name}. Document contains candidate qualifications, projects, and work history.`
                    setResumeText(fileContext)
                    setUploadedFile({ name: file.name, size: sizeFormatted, type: "PDF" })
                    toast.success("PDF Resume uploaded! For best accuracy, ensure PDF text is selectable.")
                }
            } catch (err) {
                console.error("PDF parse error:", err)
                toast.error("Failed to process PDF file.")
            }
        } else {
            toast.error("Please upload a valid PDF, DOCX, or TXT resume file.")
        }
    }

    const handleAnalyze = async () => {
        if (!jobDescription.trim()) {
            toast.error("Please enter the Target Job Description.")
            return
        }

        if (!uploadedFile || !resumeText.trim()) {
            toast.error("Please upload your PDF or Resume document first.")
            return
        }

        setIsAnalyzing(true)
        setCurrentAnalysis(null)

        const res = await analyzeResumeAction({
            jobTitle: jobTitle.trim(),
            companyName: companyName.trim(),
            jobDescription: jobDescription.trim(),
            resumeText: resumeText.trim()
        })

        setIsAnalyzing(false)

        if (res.success && res.analysis) {
            setCurrentAnalysis(res.analysis)
            toast.success("Resume Analysis Completed!")
            fetchHistory()
        } else {
            toast.error(res.error || "Failed to analyze resume.")
        }
    }

    const handleDeleteHistory = async (id: string) => {
        const res = await deleteResumeAnalysisAction(id)
        if (res.success) {
            toast.success("Analysis deleted.")
            setSavedAnalyses(prev => prev.filter(item => item.id !== id))
        } else {
            toast.error("Failed to delete record.")
        }
    }

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
        if (score >= 60) return "text-amber-400 border-amber-500/30 bg-amber-500/10"
        return "text-rose-400 border-rose-500/30 bg-rose-500/10"
    }

    const getScoreBadge = (score: number) => {
        if (score >= 80) return { label: "High ATS Match", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" }
        if (score >= 60) return { label: "Moderate Match", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" }
        return { label: "Needs Tailoring", color: "bg-rose-500/20 text-rose-300 border-rose-500/40" }
    }

    const filteredQuestions = currentAnalysis?.interviewPrep.filter(q => {
        if (questionCategoryFilter === "All") return true
        return q.category === questionCategoryFilter
    }) || []

    return (
        <div className="space-y-8 pb-12 max-w-7xl mx-auto">
            {/* Header Title Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-6 md:p-8 border border-zinc-800 shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                    <Sparkles className="w-64 h-64 text-white" />
                </div>
                <div className="relative z-10 space-y-3 max-w-3xl">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                        AI Resume Matcher & Interview Prep
                    </h1>
                    <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
                        Upload your PDF resume and paste any Job Description. The AI will calculate your ATS match score, show where changes are needed, detail how to rewrite sections, and build custom interview questions.
                    </p>
                </div>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
                <TabsList className="bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
                    <TabsTrigger value="analyzer" className="data-[state=active]:bg-white data-[state=active]:text-black rounded-lg px-5 py-2.5 text-xs font-semibold transition-all">
                        <Sparkles className="w-3.5 h-3.5 mr-2" />
                        Resume Evaluator
                    </TabsTrigger>
                    <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:text-black rounded-lg px-5 py-2.5 text-xs font-semibold transition-all">
                        <History className="w-3.5 h-3.5 mr-2" />
                        Saved History ({savedAnalyses.length})
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: ANALYZER */}
                <TabsContent value="analyzer" className="space-y-8">
                    {/* Input Section Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Job Details Card */}
                        <Card className="bg-zinc-950 border-zinc-800 shadow-xl rounded-2xl">
                            <CardHeader className="border-b border-zinc-900 pb-4">
                                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                                    1. Target Job Description
                                </CardTitle>
                                <CardDescription className="text-zinc-400 text-xs">
                                    Paste the job description and optional role information below.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-zinc-300 mb-1.5 block">Job Title (Optional)</label>
                                        <Input
                                            placeholder="e.g. Full Stack Developer"
                                            value={jobTitle}
                                            onChange={(e) => setJobTitle(e.target.value)}
                                            className="bg-zinc-900/60 border-zinc-800 text-white placeholder-zinc-500 rounded-xl text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-zinc-300 mb-1.5 block">Company (Optional)</label>
                                        <Input
                                            placeholder="e.g. TechCorp Inc."
                                            value={companyName}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                            className="bg-zinc-900/60 border-zinc-800 text-white placeholder-zinc-500 rounded-xl text-xs"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-zinc-300 mb-1.5 block">
                                        Job Description <span className="text-rose-400">*</span>
                                    </label>
                                    <Textarea
                                        rows={10}
                                        placeholder="Paste the full job description requirements, qualifications, and responsibilities..."
                                        value={jobDescription}
                                        onChange={(e) => setJobDescription(e.target.value)}
                                        className="bg-zinc-900/60 border-zinc-800 text-white placeholder-zinc-500 rounded-xl text-xs leading-relaxed resize-none font-mono"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Resume File Upload Card */}
                        <Card className="bg-zinc-950 border-zinc-800 shadow-xl rounded-2xl flex flex-col justify-between">
                            <div>
                                <CardHeader className="border-b border-zinc-900 pb-4">
                                    <CardTitle className="text-lg font-bold text-white flex items-center justify-between">
                                        <span>2. Upload Resume PDF</span>
                                        {uploadedFile && (
                                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                                                File Uploaded
                                            </Badge>
                                        )}
                                    </CardTitle>
                                    <CardDescription className="text-zinc-400 text-xs">
                                        Upload your resume in PDF format (or .docx / .txt) to evaluate.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    {!uploadedFile ? (
                                        // File Dropzone Area
                                        <label className="border-2 border-dashed border-zinc-800 hover:border-zinc-600 bg-zinc-900/30 hover:bg-zinc-900/60 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all space-y-3 group min-h-[260px]">
                                            <div className="w-14 h-14 rounded-2xl bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center text-white transition-all shadow-md">
                                                <Upload className="w-7 h-7 text-zinc-200" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-semibold text-white">
                                                    Click to upload or drag & drop
                                                </p>
                                                <p className="text-xs text-zinc-400">
                                                    PDF documents, DOCX, or TXT files (Max 10MB)
                                                </p>
                                            </div>
                                            <div className="pt-2">
                                                <span className="px-4 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-700">
                                                    Browse PDF File
                                                </span>
                                            </div>
                                            <input
                                                type="file"
                                                accept=".pdf,.docx,.txt"
                                                onChange={handleFileUpload}
                                                className="hidden"
                                            />
                                        </label>
                                    ) : (
                                        // Uploaded File Info Card
                                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                                                        <FileType className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-white truncate max-w-[220px]">
                                                            {uploadedFile.name}
                                                        </h4>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs text-zinc-400 font-medium">
                                                                {uploadedFile.size}
                                                            </span>
                                                            <span className="text-zinc-600">•</span>
                                                            <Badge className="bg-zinc-800 text-zinc-300 text-[10px] uppercase font-semibold">
                                                                {uploadedFile.type}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                                            </div>

                                            <div className="border-t border-zinc-800/80 pt-4 flex items-center justify-between">
                                                <span className="text-xs text-zinc-400">
                                                    Resume document ready for AI scan
                                                </span>
                                                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-all">
                                                    <RefreshCw className="w-3.5 h-3.5" />
                                                    <span>Change PDF</span>
                                                    <input
                                                        type="file"
                                                        accept=".pdf,.docx,.txt"
                                                        onChange={handleFileUpload}
                                                        className="hidden"
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </div>

                            <div className="p-6 pt-0">
                                <Button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing}
                                    className="w-full bg-white hover:bg-zinc-200 text-black font-semibold py-6 rounded-xl text-sm shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Analyzing Uploaded PDF & Job Description...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5" />
                                            <span>Analyze Resume with Unlimited AI</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </Card>
                    </div>

                    {/* RESULTS DISPLAY SECTION */}
                    {currentAnalysis && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Score Overview Banner */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Match Score Card */}
                                <Card className="bg-zinc-950 border-zinc-800 rounded-2xl flex flex-col justify-center items-center p-6 text-center shadow-xl">
                                    <div className="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-3">
                                        Overall Match Score
                                    </div>
                                    <div className={`relative flex items-center justify-center w-36 h-36 rounded-full border-4 ${getScoreColor(currentAnalysis.matchScore)} mb-4`}>
                                        <div className="flex flex-col items-center">
                                            <span className="text-4xl font-extrabold tracking-tight">
                                                {currentAnalysis.matchScore}%
                                            </span>
                                            <span className="text-[10px] text-zinc-400 font-medium uppercase mt-0.5">
                                                ATS Score
                                            </span>
                                        </div>
                                    </div>
                                    <Badge className={`px-3 py-1 rounded-full text-xs font-semibold border ${getScoreBadge(currentAnalysis.matchScore).color}`}>
                                        {getScoreBadge(currentAnalysis.matchScore).label}
                                    </Badge>
                                </Card>

                                {/* Executive Summary Card */}
                                <Card className="bg-zinc-950 border-zinc-800 rounded-2xl p-6 lg:col-span-2 flex flex-col justify-between shadow-xl">
                                    <div>
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                                            <TrendingUp className="w-4 h-4 text-white" />
                                            <span>Executive Fit Summary</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-2">
                                            {currentAnalysis.jobTitle ? `${currentAnalysis.jobTitle} Evaluation` : "Job Alignment Analysis"}
                                        </h3>
                                        <p className="text-zinc-300 text-sm leading-relaxed">
                                            {currentAnalysis.summary}
                                        </p>
                                    </div>

                                    {/* Skills Breakdown Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 border-t border-zinc-900 pt-4">
                                        <div>
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-2">
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span>Matched Skills ({currentAnalysis.matchingSkills.length})</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {currentAnalysis.matchingSkills.length > 0 ? (
                                                    currentAnalysis.matchingSkills.map((skill, idx) => (
                                                        <Badge key={idx} className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20 text-[11px] font-normal">
                                                            {skill}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-zinc-500 text-xs italic">No matching skills detected.</span>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mb-2">
                                                <AlertTriangle className="w-4 h-4" />
                                                <span>Missing / Recommended Skills ({currentAnalysis.missingSkills.length})</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {currentAnalysis.missingSkills.length > 0 ? (
                                                    currentAnalysis.missingSkills.map((skill, idx) => (
                                                        <Badge key={idx} className="bg-amber-500/10 text-amber-300 border-amber-500/20 text-[11px] font-normal">
                                                            {skill}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-zinc-500 text-xs italic">Great job! All key skills present.</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* RESUME IMPROVEMENTS: WHERE CHANGES SHOULD BE MADE & HOW IT SHOULD BE */}
                            <Card className="bg-zinc-950 border-zinc-800 rounded-2xl shadow-xl">
                                <CardHeader className="border-b border-zinc-900 pb-4">
                                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                                        <FileCheck className="w-5 h-5 text-white" />
                                        Resume Improvement & Tailoring Guide
                                    </CardTitle>
                                    <CardDescription className="text-zinc-400 text-xs">
                                        Detailed breakdown telling you <strong>where changes should be made</strong> and <strong>how your resume should be rewritten</strong>.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    {currentAnalysis.improvements.map((item, idx) => (
                                        <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-white">
                                                        {idx + 1}
                                                    </span>
                                                    <h4 className="text-base font-semibold text-white">
                                                        {item.section}
                                                    </h4>
                                                </div>
                                                <Badge className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full border ${
                                                    item.status === "CRITICAL"
                                                        ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                                        : item.status === "RECOMMENDED"
                                                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                                }`}>
                                                    {item.status}
                                                </Badge>
                                            </div>

                                            {/* Where changes should be made */}
                                            <div className="bg-zinc-950 rounded-xl p-3.5 border border-zinc-800">
                                                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
                                                    📍 Where Changes Should Be Made
                                                </span>
                                                <p className="text-xs text-zinc-300 leading-relaxed">
                                                    {item.feedback}
                                                </p>
                                            </div>

                                            {/* How the resume should be */}
                                            <div className="bg-zinc-900 rounded-xl p-3.5 border border-zinc-800">
                                                <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider block mb-1">
                                                    ✨ How The Resume Should Be Tailored
                                                </span>
                                                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                                                    {item.suggestion}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            {/* TARGETED INTERVIEW QUESTIONS SECTION */}
                            <Card className="bg-zinc-950 border-zinc-800 rounded-2xl shadow-xl">
                                <CardHeader className="border-b border-zinc-900 pb-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                                                <HelpCircle className="w-5 h-5 text-white" />
                                                Tailored Interview Preparation
                                            </CardTitle>
                                            <CardDescription className="text-zinc-400 text-xs mt-1">
                                                Custom interview questions created specifically from your background and the target job description.
                                            </CardDescription>
                                        </div>

                                        {/* Category Filter */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {["All", "Technical", "Behavioral", "Resume Deep-Dive", "Problem Solving"].map((cat) => (
                                                <button
                                                    key={cat}
                                                    onClick={() => setQuestionCategoryFilter(cat)}
                                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                                        questionCategoryFilter === cat
                                                            ? "bg-white text-black font-semibold"
                                                            : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400"
                                                    }`}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    {filteredQuestions.length > 0 ? (
                                        filteredQuestions.map((q, idx) => {
                                            const isExpanded = expandedQuestion === idx
                                            return (
                                                <div
                                                    key={idx}
                                                    className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden transition-all hover:border-zinc-700"
                                                >
                                                    <button
                                                        onClick={() => setExpandedQuestion(isExpanded ? null : idx)}
                                                        className="w-full p-4 text-left flex items-start justify-between gap-4"
                                                    >
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 text-[10px]">
                                                                    {q.category}
                                                                </Badge>
                                                                <span className="text-xs text-zinc-400 font-medium">
                                                                    Question {idx + 1}
                                                                </span>
                                                            </div>
                                                            <h4 className="text-sm font-semibold text-white leading-snug">
                                                                {q.question}
                                                            </h4>
                                                        </div>
                                                        <div className="p-1 rounded-lg bg-zinc-800 text-zinc-400 mt-1 shrink-0">
                                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                        </div>
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="p-4 pt-0 border-t border-zinc-800/80 bg-zinc-950/80 space-y-2 mt-2">
                                                            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block pt-3">
                                                                💡 Key Answer Guidelines to Cover:
                                                            </span>
                                                            <ul className="space-y-1.5 pl-4 list-disc text-xs text-zinc-300">
                                                                {q.keyPoints.map((pt: string, pIdx: number) => (
                                                                    <li key={pIdx} className="leading-relaxed">
                                                                        {pt}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <div className="text-center py-8 text-zinc-500 text-xs">
                                            No questions found for the selected category filter.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </TabsContent>

                {/* TAB 2: SAVED HISTORY */}
                <TabsContent value="history">
                    <Card className="bg-zinc-950 border-zinc-800 rounded-2xl shadow-xl">
                        <CardHeader className="border-b border-zinc-900">
                            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                                <History className="w-5 h-5 text-white" />
                                Previous Resume Scans ({savedAnalyses.length})
                            </CardTitle>
                            <CardDescription className="text-zinc-400 text-xs">
                                Review your past evaluations, match scores, and interview prep history.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            {isLoadingHistory ? (
                                <div className="flex items-center justify-center py-12 text-zinc-400 text-sm gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Loading scan history...</span>
                                </div>
                            ) : savedAnalyses.length === 0 ? (
                                <div className="text-center py-12 space-y-3">
                                    <FileCheck className="w-12 h-12 text-zinc-700 mx-auto" />
                                    <p className="text-zinc-400 text-sm font-medium">No saved resume analyses yet.</p>
                                    <p className="text-zinc-600 text-xs max-w-sm mx-auto">
                                        Use the Resume Evaluator tab to scan your resume against any job description.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {savedAnalyses.map((item) => (
                                        <div
                                            key={item.id}
                                            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-zinc-700 transition-all"
                                        >
                                            <div className="space-y-1.5 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge className={`text-xs font-bold border ${getScoreBadge(item.matchScore).color}`}>
                                                        {item.matchScore}% Match
                                                    </Badge>
                                                    <span className="text-xs text-zinc-500">
                                                        {new Date(item.createdAt).toLocaleDateString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric"
                                                        })}
                                                    </span>
                                                </div>
                                                <h4 className="text-base font-bold text-white">
                                                    {item.jobTitle || "Target Position"} {item.companyName ? `at ${item.companyName}` : ""}
                                                </h4>
                                                <p className="text-xs text-zinc-400 line-clamp-2">
                                                    {item.summary}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <Button
                                                    onClick={() => {
                                                        setCurrentAnalysis(item as unknown as AnalysisResult)
                                                        setActiveTab("analyzer")
                                                        toast.info("Loaded selected evaluation.")
                                                    }}
                                                    className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs px-4 py-2"
                                                >
                                                    View Details
                                                </Button>
                                                <Button
                                                    onClick={() => handleDeleteHistory(item.id)}
                                                    variant="ghost"
                                                    className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl p-2 h-9 w-9"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
