"use client"

import React, { useState, useTransition, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import gsap from "gsap"
import { toast } from "sonner"
import { 
    GraduationCap, 
    Shield, 
    Lock, 
    User, 
    ArrowRight, 
    Eye, 
    EyeOff,
    CheckCircle2
} from "lucide-react"

import GlassCard from "@/components/global/glass-card"
import BackdropGradient from "@/components/global/backdrop-gradient"
import { Button } from "@/components/ui/button"
import { loginAction, studentFirstResetAction } from "@/actions/custom-auth"

export default function LoginPage() {
    const router = useRouter()
    const role = "student"
    const [identity, setIdentity] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [showPasswordStep, setShowPasswordStep] = useState(false)

    // First Time Password Reset states
    const [isFirstLogin, setIsFirstLogin] = useState(false)
    const [rollNo, setRollNo] = useState("")
    const [tempPassword, setTempPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showNewPassword, setShowNewPassword] = useState(false)

    // GSAP Refs
    const titleRef = useRef<HTMLHeadingElement>(null)
    const cardRef = useRef<HTMLDivElement>(null)
    const bgRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Stagger title letters
        if (titleRef.current) {
            gsap.fromTo(
                titleRef.current.children,
                { opacity: 0, y: -20 },
                { opacity: 1, y: 0, duration: 0.8, stagger: 0.05, ease: "back.out(1.7)" }
            )
        }
        
        // Soft card scale in
        if (cardRef.current) {
            gsap.fromTo(
                cardRef.current,
                { scale: 0.95, opacity: 0 },
                { scale: 1, opacity: 1, duration: 1, ease: "power3.out" }
            )
        }

        // Float background gradients
        if (bgRef.current) {
            gsap.to(bgRef.current, {
                x: "random(-20, 20)",
                y: "random(-20, 20)",
                duration: 6,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            })
        }
    }, [])

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        if (!showPasswordStep) {
            if (!identity.trim()) {
                toast.error("Please enter your roll number")
                return
            }
            setShowPasswordStep(true)
            return
        }

        if (!identity.trim() || !password) {
            toast.error("Please fill in all fields")
            return
        }

        startTransition(async () => {
            const res = await loginAction(role, identity, password)
            if (res.success) {
                if (res.firstLogin) {
                    setRollNo(res.rollNo || identity)
                    setTempPassword(password)
                    setIsFirstLogin(true)
                    toast.info("First-time login detected. Please create a new password.")
                } else {
                    toast.success("Successfully logged in!")
                    router.push(res.redirect || "/")
                }
            } else {
                toast.error(res.error || "Invalid credentials")
            }
        })
    }

    const handlePasswordReset = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newPassword || !confirmPassword) {
            toast.error("Please fill in all fields")
            return
        }
        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters long")
            return
        }
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match")
            return
        }

        startTransition(async () => {
            const res = await studentFirstResetAction(rollNo, tempPassword, newPassword)
            if (res.success) {
                toast.success("Password set successfully! Logged in.")
                router.push(res.redirect || "/student/dashboard")
            } else {
                toast.error(res.error || "Failed to set password")
            }
        })
    }

    return (
        <div className="relative min-h-screen bg-black flex flex-col items-center justify-center p-4 overflow-hidden select-none">
            {/* Background Glow */}
            <div ref={bgRef} className="absolute inset-0 pointer-events-none flex items-center justify-center -z-10">
                <BackdropGradient className="w-[500px] h-[500px] opacity-25" container="absolute">
                    <></>
                </BackdropGradient>
            </div>

            {/* Header Brand */}
            <div className="z-10 mb-8 text-center">
                <h1 ref={titleRef} className="text-4xl md:text-5xl font-bold text-themeTextWhite flex items-center justify-center gap-2 tracking-tight">
                    {"Billionaire.".split("").map((char, index) => (
                        <span key={index} className="inline-block">{char}</span>
                    ))}
                </h1>
                <p className="text-sm text-themeTextGrey mt-2">
                    Secure Examination & Learning Platform
                </p>
            </div>

            <div ref={cardRef} className="z-10 w-full max-w-md">
                <GlassCard className="p-8 border border-themeGrey shadow-2xl relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        {!isFirstLogin ? (
                            <motion.div
                                key="login-form"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <h2 className="text-2xl font-bold text-white mb-2">
                                    Student Portal
                                </h2>
                                <p className="text-xs text-themeTextGrey mb-6">
                                    Enter your roll number and password to log in.
                                </p>

                                <form onSubmit={handleLogin} className="space-y-5 overflow-hidden">
                                    <AnimatePresence mode="wait" initial={false}>
                                        {!showPasswordStep ? (
                                            <motion.div
                                                key="identity-step"
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                transition={{ duration: 0.2 }}
                                                className="space-y-5"
                                            >
                                                <div>
                                                    <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">
                                                        Roll Number
                                                    </label>
                                                    <div className="relative">
                                                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-themeTextGrey">
                                                            <User size={18} />
                                                        </span>
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder="e.g., 2022CS101"
                                                            value={identity}
                                                            onChange={(e) => setIdentity(e.target.value)}
                                                            className="w-full pl-10 pr-4 py-3 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-themeTextGrey focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm"
                                                        />
                                                    </div>
                                                </div>

                                                <Button
                                                    type="submit"
                                                    className="w-full py-6 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold flex items-center justify-center gap-2 group transition-all text-sm mt-8"
                                                >
                                                    Continue
                                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                                </Button>
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="password-step"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                transition={{ duration: 0.2 }}
                                                className="space-y-5"
                                            >
                                                <div>
                                                    <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">
                                                        Roll Number
                                                    </label>
                                                    <div className="flex items-center justify-between bg-black/40 border border-themeGrey rounded-xl px-4 py-3 text-sm">
                                                        <div className="flex items-center gap-2.5 text-white">
                                                            <User size={18} className="text-themeTextGrey" />
                                                            <span className="font-medium">{identity}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPasswordStep(false)}
                                                            className="text-xs text-themeTextGrey hover:text-white transition-all font-semibold"
                                                        >
                                                            Edit
                                                        </button>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">
                                                        Password
                                                    </label>
                                                    <div className="relative">
                                                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-themeTextGrey">
                                                            <Lock size={18} />
                                                        </span>
                                                        <input
                                                            type={showPassword ? "text" : "password"}
                                                            required
                                                            autoFocus
                                                            placeholder="••••••••"
                                                            value={password}
                                                            onChange={(e) => setPassword(e.target.value)}
                                                            className="w-full pl-10 pr-12 py-3 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-themeTextGrey focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-themeTextGrey hover:text-white transition-all"
                                                        >
                                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <Button
                                                    type="submit"
                                                    disabled={isPending}
                                                    className="w-full py-6 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold flex items-center justify-center gap-2 group transition-all text-sm mt-8"
                                                >
                                                    {isPending ? "Authenticating..." : "Sign In"}
                                                    {!isPending && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
                                                </Button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="reset-form"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="flex justify-center mb-6">
                                    <div className="p-3 bg-zinc-800/80 rounded-full text-white">
                                        <CheckCircle2 size={32} className="animate-pulse" />
                                    </div>
                                </div>

                                <h2 className="text-2xl font-bold text-white text-center mb-2">
                                    Set Your Password
                                </h2>
                                <p className="text-xs text-themeTextGrey text-center mb-6">
                                    Welcome, student! Since this is your first login, please choose a secure password for your account.
                                </p>

                                <form onSubmit={handlePasswordReset} className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-themeTextGrey">
                                                <Lock size={18} />
                                            </span>
                                            <input
                                                type={showNewPassword ? "text" : "password"}
                                                required
                                                placeholder="Minimum 6 characters"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full pl-10 pr-12 py-3 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-themeTextGrey focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-themeTextGrey hover:text-white transition-all"
                                            >
                                                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">
                                            Confirm New Password
                                        </label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-themeTextGrey">
                                                <Lock size={18} />
                                            </span>
                                            <input
                                                type="password"
                                                required
                                                placeholder="Re-enter password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-themeTextGrey focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-8">
                                        <Button
                                            type="button"
                                            onClick={() => setIsFirstLogin(false)}
                                            variant="outline"
                                            className="flex-1 py-6 rounded-xl border border-themeGrey hover:bg-themeGrey text-white"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isPending}
                                            className="flex-1 py-6 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold flex items-center justify-center gap-2"
                                        >
                                            {isPending ? "Saving..." : "Save & Login"}
                                        </Button>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <CardOverlayGlow />
                </GlassCard>
            </div>
        </div>
    )
}

function CardOverlayGlow() {
    return (
        <div className="absolute inset-0 pointer-events-none rounded-2xl border border-white/5 bg-gradient-to-tr from-white/0 via-white/[0.02] to-white/5 opacity-50" />
    )
}
