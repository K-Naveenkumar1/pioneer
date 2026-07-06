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
    return (
        <div className="relative w-10 h-16 md:w-14 md:h-20 bg-[#1c1c1e] border border-zinc-805/85 rounded-xl flex items-center justify-center select-none shadow-[inset_0_1px_3px_rgba(255,255,255,0.05),0_4px_6px_-1px_rgba(0,0,0,0.5)]">
            <span className="text-3xl md:text-5xl font-black font-mono text-zinc-200">
                {val}
            </span>
            {/* Divider line across the center */}
            <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/60" />
        </div>
    )
}

const FlipSeparator = () => {
    return (
        <div className="relative w-6 h-16 md:w-8 md:h-20 bg-[#1c1c1e] border border-zinc-805/85 rounded-xl flex items-center justify-center select-none shadow-[inset_0_1px_3px_rgba(255,255,255,0.05),0_4px_6px_-1px_rgba(0,0,0,0.5)]">
            <span className="text-2xl md:text-4xl font-bold font-mono text-zinc-400">
                :
            </span>
            <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/60" />
        </div>
    )
}

export default function StudentCheckInPage() {
    const [isCheckedIn, setIsCheckedIn] = useState(false)
    const [activeRecord, setActiveRecord] = useState<any>(null)
    const [todayRecords, setTodayRecords] = useState<any[]>([])
    const [profile, setProfile] = useState<any>(null)
    
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
        if (isCheckedIn && activeRecord?.checkIn) {
            interval = setInterval(() => {
                const checkInTime = new Date(activeRecord.checkIn).getTime()
                const now = new Date().getTime()
                const diff = now - checkInTime
                
                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                const seconds = Math.floor((diff % (1000 * 60)) / 1000)
                
                const formatNum = (num: number) => String(num).padStart(2, '0')
                setElapsedTime(`${formatNum(hours)}:${formatNum(minutes)}:${formatNum(seconds)}`)
            }, 1000)
        } else {
            setElapsedTime("00:00:00")
        }

        return () => {
            if (interval) clearInterval(interval)
        }
    }, [isCheckedIn, activeRecord])

    const fetchCheckInData = async () => {
        const attendance = await getAttendanceStatus()
        setIsCheckedIn(attendance.isCheckedIn)
        setActiveRecord(attendance.activeRecord)
        setTodayRecords(attendance.todayRecords || [])

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
                {/* Timer Control Card */}
                <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl shadow-lg p-6 lg:col-span-2 flex flex-col justify-between overflow-hidden relative min-h-[300px] hover:border-zinc-700/80 transition-all duration-300">
                    <div className="flex justify-between items-start z-10">
                        <div>
                            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Clock size={14} /> Attendance Status
                            </span>
                            <h2 className="text-2xl font-bold text-white mt-1">
                                {isCheckedIn ? "Checked In" : "Checked Out"}
                            </h2>
                            
                            {/* Attendance type/permission details */}
                            <div className="flex flex-wrap gap-2 mt-3.5">
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
                    <div ref={clockRef} className="my-6 flex flex-col items-center justify-center relative z-10">
                        <span className="text-xs text-zinc-400 uppercase tracking-widest font-semibold mb-3">
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
                                        className="rounded-2xl px-10 py-7 bg-white hover:bg-zinc-200 text-black font-bold flex items-center gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
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
                                        className="rounded-2xl px-10 py-7 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold flex items-center gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95"
                                    >
                                        <AlertCircle size={18} />
                                        Check Out
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Today's Activity Log */}
                <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl shadow-lg p-6 flex flex-col justify-between h-full min-h-[300px] hover:border-zinc-700/80 transition-all duration-300">
                    <div className="h-full flex flex-col justify-between">
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-4">
                            <Clock size={14} className="text-indigo-400" /> Today's Activity Log
                        </span>

                        <div className="flex-1 overflow-y-auto space-y-3 max-h-[220px] pr-1">
                            {todayRecords.length === 0 ? (
                                <div className="text-center py-10 text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                                    No check-in sessions recorded today.
                                </div>
                            ) : (
                                todayRecords.map((rec: any, idx: number) => {
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
                                                    <p className="text-xs font-semibold text-white">Session #{idx + 1}</p>
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
    )
}
