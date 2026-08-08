"use client"

import { montserrat as logoFont } from "@/lib/fonts"
import Image from "next/image"
import { useEffect, useState } from "react"

// Only show the preloader once per browser session (not on every navigation)
const SHOWN_KEY = "preloader_shown"

export default function Preloader() {
    const [step, setStep] = useState(0)
    const [skip, setSkip] = useState(true) // default to skip; mount check will update

    useEffect(() => {
        // If already shown this session, stay invisible immediately
        if (sessionStorage.getItem(SHOWN_KEY)) {
            setSkip(true)
            return
        }

        // Mark as shown for the rest of this browser session
        sessionStorage.setItem(SHOWN_KEY, "1")
        setSkip(false)

        // Trimmed timeline: total ~1 200 ms (was 2 400 ms)
        const t1 = setTimeout(() => setStep(1), 80)   // line expands
        const t2 = setTimeout(() => setStep(2), 480)  // text slides up
        const t3 = setTimeout(() => setStep(3), 900)  // fade out starts
        const t4 = setTimeout(() => setStep(4), 1200) // unmount

        return () => {
            clearTimeout(t1)
            clearTimeout(t2)
            clearTimeout(t3)
            clearTimeout(t4)
        }
    }, [])

    // Skip entirely if already shown (no DOM at all — zero cost)
    if (skip || step === 4) return null

    return (
        <div
            className={`fixed inset-0 bg-black z-[99999] flex flex-col items-center justify-center select-none transition-all duration-500 ease-in-out ${
                step === 3 ? "opacity-0 pointer-events-none scale-105" : "opacity-100"
            }`}
        >
            <div className="relative flex flex-col items-stretch justify-center">
                {/* Logo and Text Wrapper */}
                <div className="overflow-hidden h-[45px] flex items-center justify-center mb-1 gap-1.5">
                    <div
                        className={`flex items-center gap-1.5 transition-all duration-500 ease-out transform ${
                            step >= 2 ? "translate-y-0 opacity-100" : "translate-y-[100%] opacity-0"
                        }`}
                    >
                        <Image
                            src="/nk-logo.png"
                            alt="Logo"
                            width={45}
                            height={35}
                            className="object-contain shrink-0 -rotate-45"
                            priority
                        />
                        <span className={`${logoFont.className} font-bold text-[2rem] tracking-tight text-white leading-none -ml-1`}>
                            Naveo.
                        </span>
                    </div>
                </div>

                {/* Morphing Line */}
                <div
                    className={`h-[3px] bg-white transition-all duration-500 ease-out w-full origin-center ${
                        step === 0 ? "scale-x-0" : "scale-x-125"
                    } ${step >= 2 ? "bg-white/40" : ""}`}
                />
            </div>
        </div>
    )
}
