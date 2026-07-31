"use client"

import confetti from "canvas-confetti"
import { AnimatePresence, motion } from "framer-motion"
import gsap from "gsap"
import {
    AlertCircle,
    Calendar as CalendarIcon,
    Clock,
    Play
} from "lucide-react"
import { useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import {
    checkInAction,
    checkOutAction,
    getAttendanceStatus,
    getStudentProfileDetails
} from "@/actions/student-actions"
import { Button } from "@/components/ui/button"

const FlipDigit = ({ val }: { val: string }) => {
    const [currentVal, setCurrentVal] = useState(val)
    const [previousVal, setPreviousVal] = useState(val)

    useEffect(() => {
        if (val !== currentVal) {
            setPreviousVal(currentVal)
            setCurrentVal(val)
        }
    }, [val, currentVal])

    return (
        <div className="relative w-10 h-16 md:w-14 md:h-20 bg-[#1c1c1e] border border-zinc-800/80 rounded-xl select-none shadow-[0_6px_10px_rgba(0,0,0,0.5)] [perspective:400px] [transform-style:preserve-3d]">
            {/* Top Half (Static) */}
            <div className="absolute inset-x-0 top-0 h-1/2 overflow-hidden bg-[#1c1c1e] rounded-t-xl border-b border-black/40">
                <div className="absolute top-0 inset-x-0 h-[200%] flex items-center justify-center">
                    <span className="text-3xl md:text-5xl font-black font-mono text-zinc-200 leading-none">
                        {currentVal}
                    </span>
                </div>
            </div>

            {/* Bottom Half (Static) */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden bg-[#171719] rounded-b-xl border-t border-white/5">
                <div className="absolute bottom-0 inset-x-0 h-[200%] flex items-center justify-center">
                    <span className="text-3xl md:text-5xl font-black font-mono text-zinc-200 leading-none">
                        {currentVal}
                    </span>
                </div>
            </div>

            {/* Flipping Top Card (folds down) */}
            {currentVal !== previousVal && (
                <motion.div
                    key={`top-${currentVal}`}
                    initial={{ rotateX: 0 }}
                    animate={{ rotateX: -90 }}
                    transition={{ duration: 0.18, ease: "easeIn" }}
                    className="absolute inset-x-0 top-0 h-1/2 overflow-hidden bg-[#1c1c1e] rounded-t-xl border-b border-black/40 z-20"
                    style={{ transformOrigin: "bottom", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transformStyle: "preserve-3d" }}
                >
                    <div className="absolute top-0 inset-x-0 h-[200%] flex items-center justify-center">
                        <span className="text-3xl md:text-5xl font-black font-mono text-zinc-200 leading-none">
                            {previousVal}
                        </span>
                    </div>
                    {/* Shadow overlay */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.8 }}
                        transition={{ duration: 0.18 }}
                        className="absolute inset-0 bg-black pointer-events-none"
                    />
                </motion.div>
            )}

            {/* Flipping Bottom Card (falls down) */}
            {currentVal !== previousVal && (
                <motion.div
                    key={`bottom-${currentVal}`}
                    initial={{ rotateX: 90 }}
                    animate={{ rotateX: 0 }}
                    transition={{ delay: 0.15, duration: 0.35, type: "spring", stiffness: 100, damping: 12 }}
                    className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden bg-[#171719] rounded-b-xl border-t border-white/5 z-20"
                    style={{ transformOrigin: "top", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transformStyle: "preserve-3d" }}
                >
                    <div className="absolute bottom-0 inset-x-0 h-[200%] flex items-center justify-center">
                        <span className="text-3xl md:text-5xl font-black font-mono text-zinc-200 leading-none">
                            {currentVal}
                        </span>
                    </div>
                    {/* Highlight/shading overlay */}
                    <motion.div 
                        initial={{ opacity: 0.8 }}
                        animate={{ opacity: 0 }}
                        transition={{ delay: 0.15, duration: 0.35 }}
                        className="absolute inset-0 bg-black pointer-events-none"
                    />
                </motion.div>
            )}

            {/* Reflection shine and borders */}
            <div className="absolute inset-0 rounded-xl pointer-events-none border border-white/[0.04] shadow-[inset_0_1px_3px_rgba(255,255,255,0.06)]" />
            
            {/* The horizontal split line */}
            <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/80 z-30 shadow-sm pointer-events-none" />
        </div>
    )
}

const FlipSeparator = () => {
    return (
        <div className="flex flex-col justify-center items-center h-16 md:h-20 px-1.5 select-none">
            <span className="text-2xl md:text-4xl font-black font-mono text-zinc-600 animate-pulse leading-none">
                :
            </span>
        </div>
    )
}

export default function StudentCheckInPage() {
    const [isCheckedIn, setIsCheckedIn] = useState(false)
    const [activeRecord, setActiveRecord] = useState<any>(null)
    const [todayRecords, setTodayRecords] = useState<any[]>([])
    const [profile, setProfile] = useState<any>(null)
    const [todayTotalMs, setTodayTotalMs] = useState(0)
    const [allRecords, setAllRecords] = useState<any[]>([])
    const [yesterdayTotalMs, setYesterdayTotalMs] = useState(0)
    
    const [elapsedTime, setElapsedTime] = useState("00:00:00")
    const [isPending, startTransition] = useTransition()

    // GSAP Refs
    const clockRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchCheckInData()
    }, [])

    // Real-time Clock tick for check-in duration
    useEffect(() => {
        let interval: NodeJS.Timeout
        
        const updateTick = () => {
            let pastMs = 0
            todayRecords.forEach((rec: any) => {
                if (rec.checkOut) {
                    const cIn = new Date(rec.checkIn).getTime()
                    const cOut = new Date(rec.checkOut).getTime()
                    pastMs += (cOut - cIn)
                }
            })

            if (isCheckedIn && activeRecord?.checkIn) {
                const checkInTime = new Date(activeRecord.checkIn).getTime()
                const now = new Date().getTime()
                const diff = now - checkInTime
                
                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                const seconds = Math.floor((diff % (1000 * 60)) / 1000)
                
                const formatNum = (num: number) => String(num).padStart(2, '0')
                setElapsedTime(`${formatNum(hours)}:${formatNum(minutes)}:${formatNum(seconds)}`)
                setTodayTotalMs(pastMs + diff)
            } else {
                setElapsedTime("00:00:00")
                setTodayTotalMs(pastMs)
            }
        }

        updateTick()

        if (isCheckedIn && activeRecord?.checkIn) {
            interval = setInterval(updateTick, 1000)
        }

        return () => {
            if (interval) clearInterval(interval)
        }
    }, [isCheckedIn, activeRecord, todayRecords])

    const fetchCheckInData = async () => {
        const attendance = await getAttendanceStatus()
        setIsCheckedIn(attendance.isCheckedIn)
        setActiveRecord(attendance.activeRecord)
        const records = attendance.todayRecords || []
        setTodayRecords(records)
        setAllRecords(attendance.allRecords || [])
        setYesterdayTotalMs(attendance.yesterdayTotalMs || 0)

        // Calculate initial total hours for today (including active if checked in)
        let totalMs = 0
        records.forEach((rec: any) => {
            if (rec.checkOut) {
                const checkInTime = new Date(rec.checkIn).getTime()
                const checkOutTime = new Date(rec.checkOut).getTime()
                totalMs += (checkOutTime - checkInTime)
            }
        })
        if (attendance.isCheckedIn && attendance.activeRecord?.checkIn) {
            const checkInTime = new Date(attendance.activeRecord.checkIn).getTime()
            const now = new Date().getTime()
            totalMs += (now - checkInTime)
        }
        setTodayTotalMs(totalMs)

        const profileRes = await getStudentProfileDetails()
        if (profileRes.success) {
            setProfile(profileRes.profile)
        }
    }

    const handleCheckIn = () => {
        startTransition(async () => {
            const res = await checkInAction()
            if (res.success) {
                setIsCheckedIn(true)
                setActiveRecord(res.record)
                toast.success(res.message || "Successfully Checked-In!")
                
                // Trigger celebratory confetti
                confetti({
                    particleCount: 80,
                    spread: 60,
                    origin: { y: 0.8 },
                    colors: ["#ffffff", "#6366f1", "#4f46e5"]
                })

                // GSAP Pulsate timer card
                if (clockRef.current) {
                    gsap.fromTo(clockRef.current, { scale: 0.95 }, { scale: 1, duration: 0.5, ease: "bounce.out" })
                }
                
                fetchCheckInData()
            } else {
                toast.error(res.error || "Failed to check in")
            }
        })
    }

    const handleCheckOut = () => {
        startTransition(async () => {
            const res = await checkOutAction()
            if (res.success) {
                setIsCheckedIn(false)
                setActiveRecord(null)
                toast.success(res.message || "Successfully Checked-Out!")
                fetchCheckInData()
            } else {
                toast.error(res.error || "Failed to check out")
            }
        })
    }

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }

    const formatHours = (ms: number) => {
        const hours = ms / (1000 * 60 * 60)
        return hours.toFixed(2)
    }

    const formatRemainingHours = (ms: number) => {
        const targetMs = 8 * 60 * 60 * 1000
        const remainingMs = Math.max(0, targetMs - ms)
        const hours = remainingMs / (1000 * 60 * 60)
        return `${hours.toFixed(2)}h`
    }

    const formatDate = (dateStr: string) => {
        if (!dateStr) return ""
        const [year, month, day] = dateStr.split("-")
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        return dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-5xl font-extrabold tracking-tight text-white pb-4">
                    Attendance Check-In
                </h1>
                <p className="text-sm text-zinc-400">Clock in to register class presence and unlock workspace tasks and notes.</p>
            </div>

            {/* Attendance Workspace Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (lg:col-span-2): Stack of Timer Control and Daily Progress */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Timer Control Card */}
                    <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl shadow-lg p-5 flex flex-col gap-6 overflow-hidden relative hover:border-zinc-700/80 transition-all duration-300 h-fit">
                        <div className="flex justify-between items-start z-10">
                            <div>
                                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Clock size={14} /> Attendance Status
                                </span>
                                <h2 className="text-2xl font-bold text-white mt-1">
                                    {isCheckedIn ? "Checked In" : "Checked Out"}
                                </h2>
                                
                                {/* Attendance type/permission details */}
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {profile?.isAllowedInClass && (
                                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-lg">
                                            In-Class Session Active
                                        </span>
                                    )}
                                    {profile?.isAssignedWFH && (
                                        <span className="text-[10px] font-bold text-sky-400 bg-sky-400/10 border border-sky-400/20 px-2.5 py-1 rounded-lg flex flex-col gap-0.5">
                                            <span>Work From Home Session</span>
                                            {profile.wfhDeadline && (
                                                <span className="text-[9px] text-sky-300/80 font-mono">
                                                    Task Deadline: {new Date(profile.wfhDeadline).toLocaleString("en-US", { dateStyle: 'short', timeStyle: 'short' })}
                                                </span>
                                            )}
                                        </span>
                                    )}
                                    {!profile?.isAllowedInClass && !profile?.isAssignedWFH && (
                                        <span className="text-[10px] font-bold text-rose-400 bg-rose-400/10 border border-rose-400/20 px-2.5 py-1 rounded-lg">
                                            Check-in Blocked (No active permissions)
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs text-white">
                                <CalendarIcon size={14} />
                                {new Date().toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric' })}
                            </div>
                        </div>

                        {/* Elapsed Clock View */}
                        <div ref={clockRef} className="my-3 flex flex-col items-center justify-center relative z-10">
                            <span className="text-xs text-zinc-400 uppercase tracking-widest font-semibold mb-2">
                                Session Duration
                            </span>
                            
                            <div className="flex items-center gap-1.5 md:gap-2">
                                {elapsedTime.split("").map((char, idx) => {
                                    if (char === ":") {
                                        return <FlipSeparator key={idx} />
                                    }
                                    return <FlipDigit key={idx} val={char} />
                                })}
                            </div>

                            {isCheckedIn && (
                                <span className="flex h-2.5 w-2.5 items-center justify-center mt-3">
                                    <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                                </span>
                            )}
                        </div>

                        {/* Toggle Button */}
                        <div className="flex justify-center z-10">
                            <AnimatePresence mode="wait">
                                {!isCheckedIn ? (
                                    <motion.div
                                        key="checkin-btn"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                    >
                                        <Button
                                            onClick={handleCheckIn}
                                            disabled={isPending || (!profile?.isAllowedInClass && !profile?.isAssignedWFH)}
                                            className="rounded-2xl px-10 py-5 bg-white hover:bg-zinc-200 text-black font-bold flex items-center gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                                        >
                                            <Play size={18} fill="currentColor" />
                                            Check In
                                        </Button>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="checkout-btn"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                    >
                                        <Button
                                            onClick={handleCheckOut}
                                            disabled={isPending}
                                            variant="outline"
                                            className="rounded-2xl px-10 py-5 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold flex items-center gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95"
                                        >
                                            <AlertCircle size={18} />
                                            Check Out
                                        </Button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Daily Check-In Progress Card */}
                    <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl shadow-lg p-6 hover:border-zinc-700/80 transition-all duration-300 flex flex-col justify-between">
                        <div>
                            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-4">
                                <Clock size={14} className="text-indigo-400" /> Daily Check-In Hours
                            </span>

                            <div className="space-y-4">
                                {/* Hours Display */}
                                <div className="flex items-baseline justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Today</span>
                                        <div className="flex items-baseline gap-1 mt-0.5">
                                            <span className="text-3xl font-black font-mono text-white tracking-tight">
                                                {formatHours(todayTotalMs)}
                                            </span>
                                            <span className="text-xs text-zinc-500 font-semibold uppercase">hrs</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Yesterday</span>
                                        <div className="flex items-baseline gap-1 mt-0.5">
                                            <span className="text-xl font-bold font-mono text-zinc-300">
                                                {formatHours(yesterdayTotalMs)}
                                            </span>
                                            <span className="text-[10px] text-zinc-500 font-semibold uppercase">hrs</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="relative w-full h-3 bg-zinc-900 border border-zinc-800/80 rounded-full overflow-hidden">
                                    <motion.div
                                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, (todayTotalMs / (8 * 60 * 60 * 1000)) * 100)}%` }}
                                        transition={{ duration: 0.5, ease: "easeOut" }}
                                    />
                                </div>

                                {/* Footer Metrics */}
                                <div className="flex justify-between items-center pt-2">
                                    <div className="text-[10px] text-zinc-400 font-medium flex flex-col gap-0.5">
                                        <div className="flex items-center gap-1">
                                            <span>Progress:</span>
                                            <span className="text-zinc-200 font-mono font-bold">
                                                {Math.min(100, Math.round((todayTotalMs / (8 * 60 * 60 * 1000)) * 100))}%
                                            </span>
                                        </div>
                                        <span className="text-[9px] text-zinc-500 font-mono">
                                            ({formatHours(todayTotalMs)} / 8.0 hrs)
                                        </span>
                                    </div>
                                    
                                    {todayTotalMs >= 8 * 60 * 60 * 1000 ? (
                                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                                            Goal Achieved
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">
                                            {formatRemainingHours(todayTotalMs)} remaining
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column (lg:col-span-1): Everyday Activity Log */}
                <div className="lg:col-span-1">
                    {/* Everyday Activity Log */}
                    <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl shadow-lg p-6 flex flex-col justify-between hover:border-zinc-700/80 transition-all duration-300 h-full min-h-[350px]">
                        <div className="h-full flex flex-col justify-between">
                            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-4">
                                <Clock size={14} className="text-indigo-400" /> Everyday Activity Log
                            </span>

                            <div className="flex-1 overflow-y-auto space-y-3 max-h-[360px] pr-1">
                                {allRecords.length === 0 ? (
                                    <div className="text-center py-10 text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                                        No check-in sessions recorded.
                                    </div>
                                ) : (
                                    allRecords.map((rec: any) => {
                                        const checkInTime = new Date(rec.checkIn)
                                        const checkOutTime = rec.checkOut ? new Date(rec.checkOut) : null
                                        
                                        let diffStr = "Ongoing"
                                        if (checkOutTime) {
                                            const diff = checkOutTime.getTime() - checkInTime.getTime()
                                            const h = Math.floor(diff / (1000 * 60 * 60))
                                            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                                            diffStr = `${h > 0 ? h + "h " : ""}${m}m`
                                        }

                                        return (
                                            <div 
                                                key={rec.id} 
                                                className="p-3 bg-black/40 border border-zinc-900 rounded-xl flex items-center justify-between hover:border-zinc-800 transition-all"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded-lg ${checkOutTime ? "bg-zinc-900 text-zinc-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                                                        <Clock size={14} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-xs font-semibold text-white">
                                                                {formatDate(rec.date)}
                                                            </p>
                                                            <span className="text-[8px] font-bold text-zinc-500 bg-zinc-900 border border-zinc-800 px-1 py-0.2 rounded">
                                                                {rec.type}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-zinc-500">
                                                            {formatTime(rec.checkIn)} - {checkOutTime ? formatTime(rec.checkOut) : "Active"}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${checkOutTime ? "bg-zinc-900 text-zinc-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                                                    {diffStr}
                                                </span>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
