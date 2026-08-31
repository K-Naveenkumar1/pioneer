"use client"

import { Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"
import React, { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

import { checkRollNoAction, loginAction, studentFirstResetAction } from "@/actions/custom-auth"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Montserrat } from "next/font/google"
import { Spotlight } from "@/components/ui/spotlight"

const logoFont = Montserrat({ subsets: ["latin"], weight: ["700"] })

export default function LoginForm() {
    const router = useRouter()
    const role = "student"
    const [identity, setIdentity] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [showPasswordStep, setShowPasswordStep] = useState(false)

    // Prefetch student dashboard for instant transitions
    useEffect(() => {
        router.prefetch("/student/dashboard")
    }, [router])

    // First Time Password Reset states
    const [isFirstLogin, setIsFirstLogin] = useState(false)
    const [rollNo, setRollNo] = useState("")
    const [tempPassword, setTempPassword] = useState<string | null>("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showNewPassword, setShowNewPassword] = useState(false)

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        if (!showPasswordStep) {
            if (!identity.trim()) {
                toast.error("Please enter your roll number")
                return
            }
            startTransition(async () => {
                const res = await checkRollNoAction(identity)
                if (res.exists) {
                    if (res.isFirstLogin) {
                        setRollNo(identity)
                        setTempPassword(null)
                        setIsFirstLogin(true)
                        toast.info("First-time login detected. Please create a password for your account.")
                    } else {
                        setShowPasswordStep(true)
                    }
                } else {
                    toast.error(res.error || "Roll number not found. Please try again.")
                }
            })
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
                    router.replace(res.redirect || "/student/dashboard")
                    router.refresh()
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
                router.replace(res.redirect || "/student/dashboard")
                router.refresh()
            } else {
                toast.error(res.error || "Failed to set password")
            }
        })
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
            <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
            {/* Header Brand */}
            <div className="mb-8 text-center z-10 flex items-center justify-center leading-none gap-2.5">
                <Image src="/nk-logo.png" alt="Naveo Logo" width={38} height={28} className="object-contain" />
                <div className="animate-slide-name flex items-center">
                    <span className={`${logoFont.className} font-bold text-[1.7rem] tracking-tight leading-none text-white`}>
                        Naveo.
                    </span>
                </div>
            </div>

            {/* Card Container */}
            <div className="z-10 w-full max-w-[450px] flex flex-col relative">
                <div className="w-full bg-[#09090b] border border-zinc-900 rounded-[24px] p-8 shadow-2xl min-h-[380px] flex flex-col justify-center relative">
                    {!isFirstLogin ? (
                        <div className="w-full">
                            <div className="flex flex-col items-center mb-4">
                                <h2 className="text-[22px] font-bold text-white text-center mb-1 tracking-tight">
                                    {showPasswordStep ? "Enter Password" : "Sign in with Roll Number"}
                                </h2>
                                <p className="text-[14px] text-zinc-500 text-center mb-4">
                                    {showPasswordStep 
                                        ? "Enter your account security password" 
                                        : "Enter your roll number to access exams"
                                    }
                                </p>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="w-full border border-zinc-800 rounded-2xl bg-[#09090b] overflow-hidden transition-all duration-300 mb-5">
                                    {/* Top Row: Roll Number Input or Display */}
                                    {!showPasswordStep ? (
                                        <input
                                            type="text"
                                            name="rollNo"
                                            autoComplete="username"
                                            required
                                            placeholder="Roll Number"
                                            value={identity}
                                            onChange={(e) => setIdentity(e.target.value)}
                                            className="w-full bg-transparent px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none text-base"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-between px-4 py-3 bg-zinc-950/40">
                                            <input
                                                type="text"
                                                name="rollNo"
                                                autoComplete="username"
                                                value={identity}
                                                readOnly
                                                className="bg-transparent text-white text-base font-medium focus:outline-none w-2/3 border-none p-0 cursor-default"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowPasswordStep(false)
                                                    setPassword("")
                                                }}
                                                className="px-3.5 py-1 text-xs font-semibold text-white bg-zinc-800/80 hover:bg-zinc-700/80 rounded-full border border-zinc-700/50 transition-all"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    )}

                                    {/* Divider and Password Field */}
                                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showPasswordStep ? "max-h-20 opacity-100 border-t border-zinc-800/80" : "max-h-0 opacity-0"}`}>
                                        <div className="relative w-full">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                name="password"
                                                autoComplete="current-password"
                                                required={showPasswordStep}
                                                autoFocus={showPasswordStep}
                                                placeholder="Password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full bg-transparent pl-4 pr-12 py-3.5 text-white placeholder-zinc-600 focus:outline-none text-base"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-white transition-all"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full py-6 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold transition-all text-base mt-6 border-none"
                                >
                                    {isPending 
                                        ? (showPasswordStep ? "Signing In..." : "Continuing...") 
                                        : (showPasswordStep ? "Sign In" : "Continue")
                                    }
                                </Button>
                            </form>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center w-full">
                            <h2 className="text-[22px] font-bold text-white text-center mb-1 tracking-tight">
                                Set Your Password
                            </h2>
                            <p className="text-[14px] text-zinc-500 text-center mb-8">
                                Create a secure password for your account
                            </p>

                            <form onSubmit={handlePasswordReset} className="w-full space-y-4">
                                <div className="space-y-4">
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            required
                                            placeholder="New Password (min 6 chars)"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full bg-[#09090b] border border-zinc-800 rounded-xl pl-4 pr-12 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-all text-base"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-white transition-all"
                                        >
                                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>

                                    <div>
                                        <input
                                            type="password"
                                            required
                                            placeholder="Confirm New Password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-all text-base"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <Button
                                        type="button"
                                        onClick={() => setIsFirstLogin(false)}
                                        variant="outline"
                                        className="flex-1 py-6 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-white text-sm"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isPending}
                                        className="flex-1 py-6 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-sm"
                                    >
                                        {isPending ? "Saving..." : "Save & Login"}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Agreement */}
            <div className="mt-8 text-center max-w-[320px] z-10">
                <p className="text-[12px] text-zinc-500 leading-relaxed font-normal">
                    By clicking continue, you agree to our{" "}
                    <a href="#" className="text-zinc-400 hover:text-zinc-300 hover:underline">Terms of Service</a>{" "}
                    and{" "}
                    <a href="#" className="text-zinc-400 hover:text-zinc-300 hover:underline">Privacy Policy</a>.
                </p>
            </div>
        </div>
    )
}
