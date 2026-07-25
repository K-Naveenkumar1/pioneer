"use client"

import React, { useState, useEffect, useTransition } from "react"
import { Calendar, Clock, RefreshCw, UserCheck, AlertTriangle, CheckCircle, UploadCloud, Plus, Lock, Unlock } from "lucide-react"
import { toast } from "sonner"

import GlassCard from "@/components/global/glass-card"
import { Button } from "@/components/ui/button"
import {
    adminGetClassesAction,
    adminGetAttendanceReportAction,
    adminUpdateAttendanceAction,
    adminDeleteAttendanceAction,
    adminSetAttendanceStatusAction,
    adminBatchSetAttendanceStatusAction,
    adminBlockAllCheckinsAction,
    adminUnblockAllCheckinsAction,
    adminGiveCheckinAccessAction,
    adminEndCheckinAction
} from "@/actions/admin-actions"

export default function AdminAttendancePage() {
    const [classes, setClasses] = useState<any[]>([])
    const [selectedClassId, setSelectedClassId] = useState("")
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date()
        const offset = d.getTimezoneOffset()
        return new Date(d.getTime() - (offset*60*1000)).toISOString().split('T')[0]
    })
    const [report, setReport] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Editing attendance states
    const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(null)
    const [editCheckIn, setEditCheckIn] = useState("")
    const [editCheckOut, setEditCheckOut] = useState("")

    // Action transition state
    const [isPendingAction, startTransitionAction] = useTransition()

    const handleGiveAccess = () => {
        if (!selectedClassId) {
            toast.error("Please select a class first.")
            return
        }
        if (!confirm(`Are you sure you want to unblock check-ins for the marked (Present) students in this class for the date ${selectedDate}?`)) return

        startTransitionAction(async () => {
            const res = await adminGiveCheckinAccessAction(selectedClassId, selectedDate)
            if (res.success) {
                toast.success(res.message)
                loadAttendanceReport()
            } else {
                toast.error(res.error || "Failed to give check-in access.")
            }
        })
    }

    const handleEndCheckin = () => {
        if (!selectedClassId) {
            toast.error("Please select a class first.")
            return
        }
        if (!confirm("Are you sure you want to end check-in? All students in this class will be checked out and check-in access will be blocked.")) return

        startTransitionAction(async () => {
            const res = await adminEndCheckinAction(selectedClassId)
            if (res.success) {
                toast.success(res.message)
                loadAttendanceReport()
            } else {
                toast.error(res.error || "Failed to end check-in.")
            }
        })
    }



    useEffect(() => {
        loadClasses()
    }, [])

    useEffect(() => {
        if (selectedClassId) {
            loadAttendanceReport()
        } else {
            setReport([])
        }
    }, [selectedClassId, selectedDate])

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

    const loadAttendanceReport = async () => {
        setLoading(true)
        const res = await adminGetAttendanceReportAction(selectedDate, selectedClassId)
        if (res.success) {
            setReport(res.report || [])
        } else {
            toast.error(res.error || "Failed to load attendance report")
        }
        setLoading(false)
    }

    const handleStartEditAttendance = (log: any) => {
        setEditingAttendanceId(log.id)
        setEditCheckIn(new Date(new Date(log.checkIn).getTime() - new Date().getTimezoneOffset()*60*1000).toISOString().slice(0, 16))
        setEditCheckOut(log.checkOut ? new Date(new Date(log.checkOut).getTime() - new Date().getTimezoneOffset()*60*1000).toISOString().slice(0, 16) : "")
    }

    const handleSaveAttendanceEdit = async (attendanceId: string) => {
        if (!editCheckIn) {
            toast.error("Check-in time is required.")
            return
        }
        const res = await adminUpdateAttendanceAction(attendanceId, editCheckIn, editCheckOut || null)
        if (res.success) {
            toast.success(res.message)
            setEditingAttendanceId(null)
            loadAttendanceReport()
        } else {
            toast.error(res.error || "Failed to update attendance log")
        }
    }

    const handleDeleteAttendance = async (attendanceId: string) => {
        if (!confirm("Are you sure you want to delete this attendance session?")) return
        const res = await adminDeleteAttendanceAction(attendanceId)
        if (res.success) {
            toast.success(res.message)
            loadAttendanceReport()
        } else {
            toast.error(res.error || "Failed to delete attendance log")
        }
    }

    const handleToggleAttendance = async (studentId: string, markPresent: boolean) => {
        // Optimistic UI update
        setReport(prev => prev.map(r => r.studentId === studentId ? { ...r, isPresent: markPresent } : r))

        const res = await adminSetAttendanceStatusAction(studentId, selectedDate, markPresent)
        if (res.success) {
            toast.success(res.message || "Attendance status updated.")
            loadAttendanceReport()
        } else {
            toast.error(res.error || "Failed to update attendance status.")
            loadAttendanceReport()
        }
    }

    const handleBatchToggleAttendance = async (markPresent: boolean) => {
        const studentIds = report.map(r => r.studentId)
        if (studentIds.length === 0) return

        // Optimistic UI update
        setReport(prev => prev.map(r => ({ ...r, isPresent: markPresent })))

        const res = await adminBatchSetAttendanceStatusAction(studentIds, selectedDate, markPresent)
        if (res.success) {
            toast.success(res.message || "All student attendance statuses updated.")
            loadAttendanceReport()
        } else {
            toast.error(res.error || "Failed to update batch attendance.")
            loadAttendanceReport()
        }
    }

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Calendar size={26} /> Attendance Manager
                    </h1>
                    <p className="text-sm text-themeTextGrey">Audit check-in sessions, active hours, date filters, and class lists.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        onClick={handleEndCheckin}
                        disabled={isPendingAction || !selectedClassId}
                        variant="outline"
                        className="border-red-500/20 hover:bg-red-500/10 text-red-400 font-semibold flex items-center gap-1.5 py-2.5 px-4 rounded-xl text-xs"
                    >
                        <Lock size={14} /> End Check-in
                    </Button>
                    <Button
                        onClick={handleGiveAccess}
                        disabled={isPendingAction || !selectedClassId}
                        className="bg-white hover:bg-zinc-200 text-black font-semibold flex items-center gap-1.5 py-2.5 px-4 rounded-xl text-xs"
                    >
                        <Unlock size={14} /> Give Access
                    </Button>
                    <button
                        onClick={loadAttendanceReport}
                        className="p-2.5 bg-zinc-900 border border-themeGrey rounded-xl text-themeTextGrey hover:text-white hover:border-zinc-700 transition-all"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>



            {/* Filters Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-zinc-950/40 p-5 rounded-2xl border border-themeGrey/40">
                <div>
                    <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">Class / Batch</label>
                    <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="w-full px-4 py-3 bg-black/40 border border-themeGrey rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm cursor-pointer"
                    >
                        <option value="" className="bg-zinc-950 text-zinc-400">Select Class</option>
                        {classes.map((cls: any) => (
                            <option key={cls.id} value={cls.id} className="bg-zinc-950 text-white">
                                {cls.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">Date</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-4 py-3 bg-black/40 border border-themeGrey rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm cursor-pointer"
                    />
                </div>


            </div>

            {/* Attendance List */}
            {loading ? (
                <div className="min-h-[30vh] flex items-center justify-center">
                    <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></span>
                </div>
            ) : !selectedClassId ? (
                <GlassCard className="p-8 text-center text-themeTextGrey text-sm border border-themeGrey">
                    Select a class and date above to review attendance reports.
                </GlassCard>
            ) : report.length === 0 ? (
                <GlassCard className="p-8 text-center text-themeTextGrey text-sm border border-themeGrey">
                    No students found in this class/batch. Register students on the Students tab first.
                </GlassCard>
            ) : (
                <div className="border border-themeGrey rounded-2xl bg-zinc-950/20 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs select-text">
                            <thead>
                                <tr className="border-b border-themeGrey bg-zinc-950 text-themeTextGrey font-bold uppercase tracking-wider">
                                    <th className="p-4">Student</th>
                                    <th className="p-4">Department</th>
                                    <th className="p-4">Total Check-In Hours</th>
                                    <th className="p-4">Daily Task Status</th>
                                    <th className="p-4 w-64">
                                        <div className="flex flex-col gap-1.5">
                                            <span>Attendance Status</span>
                                            <div className="flex items-center gap-4 text-[10px] normal-case font-semibold">
                                                <label className="flex items-center gap-1 cursor-pointer hover:text-white select-none">
                                                    <input 
                                                        type="checkbox"
                                                        checked={report.length > 0 && report.every(r => r.isPresent)}
                                                        onChange={(e) => handleBatchToggleAttendance(e.target.checked)}
                                                        className="rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer"
                                                    />
                                                    All Present
                                                </label>
                                                <label className="flex items-center gap-1 cursor-pointer hover:text-white select-none">
                                                    <input 
                                                        type="checkbox"
                                                        checked={report.length > 0 && report.every(r => !r.isPresent)}
                                                        onChange={(e) => handleBatchToggleAttendance(!e.target.checked)}
                                                        className="rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer"
                                                    />
                                                    All Absent
                                                </label>
                                            </div>
                                        </div>
                                    </th>
                                    <th className="p-4">Logs & Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.map((row: any) => (
                                    <tr 
                                        key={row.studentId} 
                                        className="border-b border-themeGrey/40 hover:bg-white/[0.01] transition-all text-themeTextWhite font-medium"
                                    >
                                        <td className="p-4">
                                            <div className="font-semibold text-white">{row.name}</div>
                                            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{row.rollNo}</div>
                                        </td>
                                        <td className="p-4">{row.department}</td>
                                        <td className="p-4 font-mono font-bold text-sm">
                                            {row.totalHours} hrs
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${
                                                row.taskStatus === "COMPLETED" 
                                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                    : row.taskStatus === "PENDING"
                                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                                    : row.taskStatus === "NO_TASK_DECLARED" || row.taskStatus === "NO_TASK"
                                                    ? "bg-zinc-800 text-zinc-400 border-zinc-700/60"
                                                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                            }`}>
                                                {row.taskMessage}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-6">
                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={row.isPresent}
                                                        onChange={() => handleToggleAttendance(row.studentId, true)}
                                                        className="rounded-full border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                                                    />
                                                    <span className={row.isPresent ? "text-emerald-400 font-bold" : "text-zinc-500 font-medium"}>Present</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={!row.isPresent}
                                                        onChange={() => handleToggleAttendance(row.studentId, false)}
                                                        className="rounded-full border-zinc-700 bg-zinc-900 text-rose-500 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                                                    />
                                                    <span className={!row.isPresent ? "text-rose-400 font-bold" : "text-zinc-500 font-medium"}>Absent</span>
                                                </label>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="space-y-2">
                                                {row.attendanceLogs.length === 0 ? (
                                                    <span className="text-zinc-500 italic text-[10px]">No logs for this date</span>
                                                ) : (
                                                    row.attendanceLogs.map((log: any) => (
                                                        <div key={log.id} className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800/80 px-2.5 py-1.5 rounded-lg w-max text-[10px]">
                                                            {editingAttendanceId === log.id ? (
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <input 
                                                                        type="datetime-local" 
                                                                        value={editCheckIn}
                                                                        onChange={(e) => setEditCheckIn(e.target.value)}
                                                                        className="bg-black border border-themeGrey rounded px-1.5 py-0.5 text-white"
                                                                    />
                                                                    <span className="text-zinc-500">to</span>
                                                                    <input 
                                                                        type="datetime-local" 
                                                                        value={editCheckOut}
                                                                        onChange={(e) => setEditCheckOut(e.target.value)}
                                                                        className="bg-black border border-themeGrey rounded px-1.5 py-0.5 text-white"
                                                                    />
                                                                    <button 
                                                                        onClick={() => handleSaveAttendanceEdit(log.id)}
                                                                        className="px-2 py-0.5 bg-white text-black font-bold rounded"
                                                                    >
                                                                        Save
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => setEditingAttendanceId(null)}
                                                                        className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <span className="font-mono text-zinc-300">
                                                                        {formatTime(log.checkIn)} - {log.checkOut ? formatTime(log.checkOut) : "Active"}
                                                                    </span>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <button 
                                                                            onClick={() => handleStartEditAttendance(log)}
                                                                            className="text-indigo-400 hover:text-indigo-300 font-bold"
                                                                        >
                                                                            Edit
                                                                        </button>
                                                                        <span className="text-zinc-700">|</span>
                                                                        <button 
                                                                            onClick={() => handleDeleteAttendance(log.id)}
                                                                            className="text-rose-400 hover:text-rose-300 font-bold"
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
