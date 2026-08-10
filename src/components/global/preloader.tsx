"use client"

import { montserrat as logoFont } from "@/lib/fonts"
import Image from "next/image"
import { useEffect, useState } from "react"

export default function Preloader() {
    const [step, setStep] = useState(0)

    useEffect(() => {
        // Trimmed timeline: total ~1200 ms
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

    if (step === 4) return null

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
                        className={`flex items-center gap-2.5 transition-all duration-500 ease-out transform ${
                            step >= 2 ? "translate-y-0 opacity-100" : "translate-y-[100%] opacity-0"
                        }`}
                    >
                        <Image
                            src="/nk-logo.png"
                            alt="Logo"
                            width={45}
                            height={35}
                            className="object-contain shrink-0"
                            priority
                        />
                        <span className={`${logoFont.className} font-bold text-[2rem] tracking-tight text-white leading-none`}>
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
