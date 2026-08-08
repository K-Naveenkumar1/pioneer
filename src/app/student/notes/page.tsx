"use client"

import {
    Calendar as CalendarIcon,
    Download as DownloadIcon,
    FileText as FileTextIcon,
    Lock as LockIcon
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import {
    getAllNoteDatesAction,
    getAllNotesAction,
    getAttendanceStatus,
    getNoteAction,
    saveNoteAction
} from "@/actions/student-actions"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"

export default function StudentNotesPage() {
    const [isCheckedIn, setIsCheckedIn] = useState(false)
    const [loading, setLoading] = useState(true)

    // Notes States
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [noteContent, setNoteContent] = useState<string>("")
    const [noteDates, setNoteDates] = useState<string[]>([])
    const [saveStatus, setSaveStatus] = useState<string>("")
    const [promptText, setPromptText] = useState<string>("")
    const loadedContentRef = useRef<string>("")

    const PROMPTS = [
        "What is the main topic you are studying/coding today?",
        "Describe one major bug or challenge you faced today and how you solved it.",
        "List 3 coding/learning victories you achieved in this session.",
        "What is the most interesting thing you learned in class today?",
        "Write a quick snippet of code you found useful today and explain it.",
        "What is your primary goal for the next 2 hours?",
        "If you could explain today's topic to a beginner, what would you say?"
    ]

    const handleGeneratePrompt = () => {
        const randomIdx = Math.floor(Math.random() * PROMPTS.length)
        setPromptText(PROMPTS[randomIdx])
    }

    const handleInsertTag = (tag: string) => {
        setNoteContent(prev => {
            const prefix = prev ? `${prev}\n\n` : ""
            const newContent = `${prefix}### ${tag}\n- `
            setSaveStatus("Typing...")
            return newContent
        })
    }

    const getLocalDateString = (d: Date = new Date()) => {
        const offset = d.getTimezoneOffset()
        const localDate = new Date(d.getTime() - (offset * 60 * 1000))
        return localDate.toISOString().split('T')[0]
    }

    const fetchNoteForDate = async (date: Date) => {
        if (!isCheckedIn) return
        const dateStr = getLocalDateString(date)
        const res = await getNoteAction(dateStr)
        if (res.success && res.note) {
            loadedContentRef.current = res.note.content
            setNoteContent(res.note.content)
            setSaveStatus("Saved")
        } else {
            loadedContentRef.current = ""
            setNoteContent("")
            setSaveStatus("")
        }
    }

    const loadInitialData = async () => {
        setLoading(true)
        const attendance = await getAttendanceStatus()
        setIsCheckedIn(attendance.isCheckedIn)

        const noteDatesRes = await getAllNoteDatesAction()
        if (noteDatesRes.success && noteDatesRes.dates) {
            setNoteDates(noteDatesRes.dates)
        }
        setLoading(false)
    }

    useEffect(() => {
        loadInitialData()
        handleGeneratePrompt()
    }, [])

    // Auto-save logic
    useEffect(() => {
        if (!isCheckedIn) return
        if (noteContent === undefined) return
        if (noteContent === loadedContentRef.current) return

        setSaveStatus("Saving...")
        const delayDebounceFn = setTimeout(async () => {
            const dateStr = getLocalDateString(selectedDate)
            const res = await saveNoteAction(dateStr, noteContent)
            if (res.success) {
                setSaveStatus("Saved")
                loadedContentRef.current = noteContent
                if (!noteDates.includes(dateStr)) {
                    setNoteDates(prev => [...prev, dateStr])
                }
            } else {
                setSaveStatus("Error saving note")
            }
        }, 1000)

        return () => clearTimeout(delayDebounceFn)
    }, [noteContent, isCheckedIn, selectedDate])

    // Load note when date changes or check-in status changes
    useEffect(() => {
        if (isCheckedIn) {
            fetchNoteForDate(selectedDate)
        }
    }, [selectedDate, isCheckedIn])

    const handleDownloadCurrentNote = () => {
        if (!noteContent) {
            toast.error("Note is empty.")
            return
        }
        const dateStr = getLocalDateString(selectedDate)
        const blob = new Blob([noteContent], { type: "text/plain;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `navedx-notes-${dateStr}.txt`
        link.click()
        URL.revokeObjectURL(url)
        toast.success("Note downloaded successfully!")
    }

    const handleDownloadAllNotes = async () => {
        const res = await getAllNotesAction()
        if (res.success && res.notes && res.notes.length > 0) {
            const combinedContent = res.notes
                .map((n: any) => `========================================\nDATE: ${n.date}\n========================================\n\n${n.content}\n\n`)
                .join("\n")
            const blob = new Blob([combinedContent], { type: "text/plain;charset=utf-8" })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = `navedx-all-notes.txt`
            link.click()
            URL.revokeObjectURL(url)
            toast.success("All notes downloaded successfully!")
        } else {
            toast.error("No notes found to download.")
        }
    }

    if (loading) {
        return (
            <div className="space-y-8">
                {/* Header */}
                <div className="space-y-2">
                    <div className="skeleton-shimmer h-12 w-52 rounded-xl" />
                    <div className="skeleton-shimmer h-3.5 w-80 rounded-lg" />
                </div>
                {/* 3-col grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Calendar card */}
                    <div className="bg-[#121212] rounded-2xl p-6 flex flex-col gap-4 min-h-[400px]">
                        <div className="skeleton-shimmer h-5 w-32 rounded" />
                        {/* Calendar grid placeholder */}
                        <div className="space-y-2 flex-1">
                            <div className="grid grid-cols-7 gap-1">
                                {[...Array(7)].map((_, i) => (
                                    <div key={i} className="skeleton-shimmer h-6 rounded" />
                                ))}
                            </div>
                            {[...Array(5)].map((_, w) => (
                                <div key={w} className="grid grid-cols-7 gap-1">
                                    {[...Array(7)].map((_, d) => (
                                        <div key={d} className="skeleton-shimmer h-8 rounded-lg" />
                                    ))}
                                </div>
                            ))}
                        </div>
                        <div className="skeleton-shimmer h-9 w-full rounded-xl mt-auto" />
                    </div>
                    {/* Editor card */}
                    <div className="bg-[#121212] rounded-2xl p-6 flex flex-col gap-4 col-span-1 lg:col-span-1 min-h-[400px]">
                        <div className="flex justify-between items-center">
                            <div className="skeleton-shimmer h-5 w-28 rounded" />
                            <div className="skeleton-shimmer h-5 w-16 rounded" />
                        </div>
                        <div className="skeleton-shimmer flex-1 rounded-xl min-h-[280px]" />
                        <div className="flex gap-2">
                            <div className="skeleton-shimmer h-9 flex-1 rounded-xl" />
                            <div className="skeleton-shimmer h-9 w-9 rounded-xl" />
                        </div>
                    </div>
                    {/* All notes list card */}
                    <div className="bg-[#121212] rounded-2xl p-6 flex flex-col gap-3 min-h-[400px]">
                        <div className="skeleton-shimmer h-5 w-28 rounded" />
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 py-2 border-b border-zinc-800/40">
                                <div className="skeleton-shimmer h-4 w-4 rounded" />
                                <div className="skeleton-shimmer h-3 flex-1 rounded" />
                                <div className="skeleton-shimmer h-3 w-12 rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-5xl font-extrabold tracking-tight text-white flex items-center gap-2 pb-4">
                    Digital notes
                </h1>
                <p className="text-sm text-zinc-400">Keep track of your study sessions, logs, and notes daily.</p>
            </div>

            {/* Notes Grid Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Notes Calendar Card */}
                <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl shadow-lg p-6 flex flex-col justify-between overflow-hidden relative col-span-1 hover:border-zinc-700/80 transition-all duration-300">
                    <div className="h-full flex flex-col justify-between gap-4">
                        <div>
                            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-4">
                                <CalendarIcon size={14} /> Notes Calendar
                            </span>
                            <div className="flex justify-center bg-black/20 rounded-2xl p-2 border border-zinc-800/80">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={(d) => d && setSelectedDate(d)}
                                    className="w-full flex justify-center"
                                    modifiers={{
                                        hasNote: (d) => noteDates.includes(getLocalDateString(d))
                                    }}
                                    modifiersClassNames={{
                                        hasNote: "after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-indigo-400 after:rounded-full relative font-bold"
                                    }}
                                />
                            </div>
                        </div>
                        {isCheckedIn && (
                            <Button
                                onClick={handleDownloadAllNotes}
                                variant="outline"
                                className="w-full h-11 border border-zinc-800/80 bg-zinc-950/40 hover:bg-zinc-900 text-zinc-300 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all mt-4"
                            >
                                <DownloadIcon size={14} />
                                Download All Notes (.txt)
                            </Button>
                        )}
                    </div>
                </div>

                {/* Notes Editor Card */}
                <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl shadow-lg p-6 flex flex-col justify-between overflow-hidden relative lg:col-span-2 min-h-[420px] hover:border-zinc-700/80 transition-all duration-300">
                    <div className="flex flex-col h-full gap-4 flex-1">
                        {/* Editor Header */}
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                    Digital Notes Workspace
                                </span>
                                <h3 className="text-lg font-bold text-white mt-0.5 flex items-center gap-2">
                                    <FileTextIcon size={16} className="text-indigo-400" />
                                    {selectedDate.toLocaleDateString(undefined, { dateStyle: 'long' })}
                                </h3>
                            </div>
                            {/* Saved / Typing status and actions */}
                            <div className="flex items-center gap-3">
                                {isCheckedIn && (
                                    <>
                                        <span className="text-[10px] text-zinc-400 font-mono">
                                            {saveStatus}
                                        </span>
                                        <Button
                                            onClick={handleDownloadCurrentNote}
                                            variant="outline"
                                            size="sm"
                                            className="h-8 rounded-lg text-xs border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900 text-zinc-300"
                                        >
                                            <DownloadIcon size={12} className="mr-1" />
                                            Download (.txt)
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Editor Content Area */}
                        {!isCheckedIn ? (
                            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40 p-6 relative overflow-hidden backdrop-blur-sm">
                                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 mb-3 animate-pulse">
                                    <LockIcon size={20} />
                                </div>
                                <h4 className="text-sm font-semibold text-white">Digital Notes Locked</h4>
                                <p className="text-xs text-zinc-500 text-center max-w-xs mt-1.5 leading-relaxed">
                                    Please Check In on the Check-In page to unlock your personal digital notes, retrieve calendar logs, and start journaling.
                                </p>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col gap-3">
                                {/* Prompt & Fun elements */}
                                <div className="flex flex-wrap gap-2 items-center justify-between bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3 text-xs leading-relaxed">
                                    <span className="text-indigo-300 font-medium flex items-center gap-1.5">
                                        💡 Daily Prompt: {promptText || "Click for a fresh prompt!"}
                                    </span>
                                    <button 
                                        onClick={handleGeneratePrompt}
                                        className="text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                    >
                                        Roll Prompt
                                    </button>
                                </div>

                                {/* Mood tags insertion */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Quick Tags:</span>
                                    {["📝 Study", "💡 Idea", "🧠 Reflection", "🎯 Goal", "🚀 Focus"].map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => handleInsertTag(tag)}
                                            className="text-[10px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>

                                {/* Editor text area */}
                                <textarea
                                    value={noteContent}
                                    onChange={(e) => {
                                        setNoteContent(e.target.value)
                                        setSaveStatus("Typing...")
                                    }}
                                    placeholder="Start writing notes, ideas, goals, code blocks, or reflections here..."
                                    className="flex-1 w-full bg-zinc-950/60 border border-zinc-800 focus:border-zinc-500 outline-none rounded-xl p-4 text-sm text-zinc-200 resize-none min-h-[220px] font-mono leading-relaxed"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
