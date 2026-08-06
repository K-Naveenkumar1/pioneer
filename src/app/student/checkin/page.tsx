"use client"

import { AnimatePresence, motion } from "framer-motion"
import gsap from "gsap"
import {
    AlertCircle,
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

const SlidingDigit = ({ val }: { val: string }) => {
    return (
        <div className="relative h-16 md:h-24 lg:h-28 w-[28px] md:w-[48px] lg:w-[56px] overflow-hidden flex items-center justify-center font-sans">
            <AnimatePresence mode="popLayout">
                <motion.span
                    key={val}
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={{
                        type: "spring",
                        stiffness: 150,
                        damping: 15,
                        mass: 0.8
                    }}
                    className="absolute text-5xl md:text-7xl lg:text-8xl font-black text-white select-none tracking-tighter"
                >
                    {val}
                </motion.span>
            </AnimatePresence>
        </div>
    )
}

const SlidingSeparator = () => {
    return (
        <div className="flex items-center justify-center h-16 md:h-24 lg:h-28 px-1 select-none">
            <span className="text-4xl md:text-6xl lg:text-7xl font-black text-zinc-600 leading-none">
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
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h1 className="text-5xl font-extrabold tracking-tight text-white pb-4">
                    Attendance Check-In
                </h1>
                <p className="text-sm text-zinc-400">Clock in to register class presence and unlock workspace tasks and notes.</p>
            </div>

            {/* Attendance Workspace Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left Column (lg:col-span-2): Stack of Timer Control and Daily Progress */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    {/* Timer Control Card */}
                    <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl shadow-lg p-5 flex flex-col gap-4 overflow-hidden relative hover:border-zinc-700/80 transition-all duration-300 h-fit">
                        <div className="flex justify-between items-start z-10 w-full">
                            <div>
                                <h2 className="text-3xl font-bold text-white tracking-tight mt-1">
                                    {isCheckedIn ? "Checked In" : "Checked Out"}
                                </h2>
                                <span className="text-xs font-semibold text-zinc-400 mt-1 block">
                                    Attendance status
                                </span>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs text-white font-medium">
                                    {new Date().toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric' })}
                                </div>
                                <div className="flex flex-col items-end text-right">
                                    {profile?.isAllowedInClass && (
                                        <span className="text-[10px] font-bold text-emerald-400">
                                            In-Class Session Active
                                        </span>
                                    )}
                                    {profile?.isAssignedWFH && (
                                        <div className="flex flex-col items-end gap-0.5">
                                            <span className="text-[10px] font-bold text-sky-400">
                                                Work From Home Session
                                            </span>
                                            {profile.wfhDeadline && (
                                                <span className="text-[9px] text-sky-300/80 font-mono">
                                                    Task Deadline: {new Date(profile.wfhDeadline).toLocaleString("en-US", { dateStyle: 'short', timeStyle: 'short' })}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {!profile?.isAllowedInClass && !profile?.isAssignedWFH && (
                                        <span className="text-[10px] font-bold text-rose-400">
                                            Check-in Blocked (No active permissions)
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Elapsed Clock View */}
                        <div ref={clockRef} className="my-4 flex flex-col items-center justify-center relative z-10 w-full">
                            <span className="text-xs text-zinc-500 tracking-widest font-semibold mb-3">
                                Session Duration
                            </span>
                            
                            <div className="flex items-center gap-1 md:gap-1.5 bg-black border border-zinc-900 px-6 py-4 md:px-8 md:py-6 rounded-3xl shadow-2xl relative overflow-hidden">
                                {elapsedTime.split("").map((char, idx) => {
                                    if (char === ":") {
                                        return <SlidingSeparator key={idx} />
                                    }
                                    return <SlidingDigit key={idx} val={char} />
                                })}
                            </div>

                            {isCheckedIn && (
                                <span className="flex h-2.5 w-2.5 items-center justify-center mt-4">
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
                            <h2 className="text-3xl font-bold text-white tracking-tight mt-1">
                                Study hours
                            </h2>
                            <span className="text-xs font-semibold text-zinc-400 mb-4 block mt-1">
                                Daily check-in hours
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
                    <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl shadow-lg p-6 hover:border-zinc-700/80 transition-all duration-300 h-full min-h-[350px] ">
                        <div className="h-full flex flex-col">
                            <h2 className="text-3xl font-bold text-white tracking-tight mt-1 block">
                                Activity log
                            </h2>
                            <span className="text-xs font-semibold text-zinc-400 mb-4 block mt-1">
                                Everyday activity log
                            </span>

                            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
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
