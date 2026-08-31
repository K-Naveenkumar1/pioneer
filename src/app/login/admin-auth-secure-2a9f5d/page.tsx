"use client"

import { motion } from "framer-motion"
import gsap from "gsap"
import {
    ArrowRight,
    Eye,
    EyeOff,
    Lock,
    Shield,
    User
} from "lucide-react"
import { useRouter } from "next/navigation"
import React, { useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { getAdminUser, loginAction } from "@/actions/custom-auth"
import GlassCard from "@/components/global/glass-card"
import { Button } from "@/components/ui/button"
import { Spotlight } from "@/components/ui/spotlight"
import { Montserrat } from "next/font/google"
import Image from "next/image"

const logoFont = Montserrat({ subsets: ["latin"], weight: ["700"] })

export default function AdminLoginPage() {
    const router = useRouter()
    const [identity, setIdentity] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        router.prefetch("/admin/dashboard")
        const checkSession = async () => {
            const user = await getAdminUser()
            if (user) {
                router.replace("/admin/dashboard")
            }
        }
        checkSession()
    }, [router])

    // GSAP Refs
    const titleRef = useRef<HTMLHeadingElement>(null)
    const cardRef = useRef<HTMLDivElement>(null)
    const bgRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (titleRef.current) {
            gsap.fromTo(
                titleRef.current.children,
                { opacity: 0, y: -20 },
                { opacity: 1, y: 0, duration: 0.8, stagger: 0.05, ease: "back.out(1.7)" }
            )
        }
        
        if (cardRef.current) {
            gsap.fromTo(
                cardRef.current,
                { scale: 0.95, opacity: 0 },
                { scale: 1, opacity: 1, duration: 1, ease: "power3.out" }
            )
        }

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
        if (!identity.trim() || !password) {
            toast.error("Please fill in all fields")
            return
        }

        startTransition(async () => {
            const res = await loginAction("admin", identity, password)
            if (res.success) {
                toast.success("Successfully logged in as Admin!")
                router.replace(res.redirect || "/admin/dashboard")
                router.refresh()
            } else {
                toast.error(res.error || "Invalid admin credentials")
            }
        })
    }

    return (
        <div className="relative min-h-screen bg-black flex flex-col items-center justify-center p-4 overflow-hidden select-none">
            <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

            {/* Header Brand */}
            <div className="z-10 mb-8 text-center flex flex-col items-center justify-center leading-none">
                <div className="flex items-center gap-2.5">
                    <Image src="/nk-logo.png" alt="Logo" width={34} height={26} className="object-contain" />
                    <div className="animate-slide-name flex items-center">
                        <span className={`${logoFont.className} font-bold text-[1.6rem] text-white tracking-tight leading-none`}>
                            Naveo.
                        </span>
                    </div>
                </div>
                <p className="text-xs text-themeTextGrey mt-2.5 animate-slide-name">
                    Secure Exam Portal - Administrative Entrance
                </p>
            </div>

            <div ref={cardRef} className="z-10 w-full max-w-md">
                <GlassCard className="p-8 border border-themeGrey shadow-2xl relative overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="flex items-center gap-2 text-red-500 mb-4 bg-red-500/10 border border-red-500/20 px-3.5 py-2 rounded-xl text-xs font-semibold">
                            <Shield size={16} /> Restricted Admin Portal
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-2">
                            Admin Login
                        </h2>
                        <p className="text-xs text-themeTextGrey mb-6">
                            Enter credentials to access root administration.
                        </p>

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">
                                    Username
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-themeTextGrey">
                                        <User size={18} />
                                    </span>
                                    <input
                                        type="text"
                                        name="username"
                                        autoComplete="username"
                                        required
                                        placeholder="e.g., admin"
                                        value={identity}
                                        onChange={(e) => setIdentity(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-themeTextGrey focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm"
                                    />
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
                                        name="password"
                                        autoComplete="current-password"
                                        required
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
                                {isPending ? "Verifying Keys..." : "Access Dashboard"}
                                {!isPending && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
                            </Button>
                        </form>
                    </motion.div>
                    <div className="absolute inset-0 pointer-events-none rounded-2xl border border-white/5 bg-gradient-to-tr from-white/0 via-white/[0.02] to-white/5 opacity-50" />
                </GlassCard>
            </div>
        </div>
    )
}
