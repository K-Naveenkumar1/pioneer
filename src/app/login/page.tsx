"use client"

import { Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"
import React, { useState, useTransition } from "react"
import { toast } from "sonner"

import { checkRollNoAction, loginAction, studentFirstResetAction } from "@/actions/custom-auth"
import BackdropGradient from "@/components/global/backdrop-gradient"
import { Button } from "@/components/ui/button"

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
                    toast.error("Roll number not found. Please try again.")
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
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 select-none relative overflow-hidden text-radial--circle">
            {/* Ambient background glow using website's radial--blur */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-[50%] radial--blur opacity-25 pointer-events-none -z-10" />

            {/* Header Brand */}
            <div className="mb-8 text-center z-10 flex flex-col items-center leading-none">
                <h1 className="text-[28px] font-bold text-white tracking-tight select-none leading-none">
                    Billionaire.
                </h1>
                <p className="text-sm text-zinc-500 font-medium select-none -mt-0.5">created by Naveen</p>
            </div>

            {/* Card Container */}
            <BackdropGradient
                className="w-[350px] h-[350px] opacity-50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10"
                container="z-10 w-full max-w-[400px] flex flex-col relative"
            >
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
                                            required
                                            placeholder="Roll Number"
                                            value={identity}
                                            onChange={(e) => setIdentity(e.target.value)}
                                            className="w-full bg-transparent px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none text-base"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-between px-4 py-3 bg-zinc-950/40">
                                            <span className="text-white text-base font-medium">{identity}</span>
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
            </BackdropGradient>

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
