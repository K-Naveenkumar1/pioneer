"use client"

import { Montserrat } from "next/font/google"
import Image from "next/image"
import { useEffect, useState } from "react"

const logoFont = Montserrat({ subsets: ["latin"], weight: ["700"] })

export default function Preloader() {
    const [step, setStep] = useState(0)

    useEffect(() => {
        // Step 1: Grow the line horizontally
        const t1 = setTimeout(() => setStep(1), 100)
        // Step 2: Morph line to text (slide text up)
        const t2 = setTimeout(() => setStep(2), 800)
        // Step 3: Start fade out
        const t3 = setTimeout(() => setStep(3), 1800)
        // Step 4: Fully hidden
        const t4 = setTimeout(() => setStep(4), 2400)

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
            className={`fixed inset-0 bg-black z-[99999] flex flex-col items-center justify-center select-none transition-all duration-700 ease-in-out ${
                step === 3 ? "opacity-0 pointer-events-none scale-105" : "opacity-100"
            }`}
        >
            <div className="relative flex flex-col items-stretch justify-center">
                {/* Logo and Text Wrapper (clipping mask) */}
                <div className="overflow-hidden h-[45px] flex items-center justify-center mb-1 gap-1.5">
                    <div
                        className={`flex items-center gap-1.5 transition-all duration-700 ease-out transform ${
                            step >= 2 ? "translate-y-0 opacity-100" : "translate-y-[100%] opacity-0"
                        }`}
                    >
                        <Image src="/nk-logo.png" alt="Logo" width={45} height={35} className="object-contain shrink-0 -rotate-45" />
                        <span className={`${logoFont.className} font-bold text-[2rem] tracking-tight text-white leading-none -ml-1`}>
                            Naveo.
                        </span>
                    </div>
                </div>

                {/* Morphing Line */}
                <div
                    className={`h-[3px] bg-white transition-all duration-700 ease-out w-full origin-center ${
                        step === 0 ? "scale-x-0" : "scale-x-125"
                    } ${
                        step >= 2 ? "bg-white/40" : ""
                    }`}
                />
            </div>
        </div>
    )
}
