"use client"

import { useEffect, useState } from "react"

export default function MobileBlocker() {
    const [isMobile, setIsMobile] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1024)
        }
        handleResize()
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    if (!mounted || !isMobile) {
        return null
    }

    return (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black p-6 select-none overflow-hidden text-radial--circle">
            {/* Ambient background glow using website's radial--blur */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-[50%] radial--blur opacity-30 pointer-events-none" />

            {/* Container Card */}
            <div className="relative max-w-md w-full bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-8 text-center flex flex-col items-center gap-6 shadow-[0_0_50px_-12px_rgba(113,103,104,0.25)] transition-all duration-300 hover:border-zinc-700/80">
                
                {/* Glowing Icon Container */}
                <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-700/50 text-white shadow-inner">
                    {/* Inline Monitor SVG with custom gray/white styling */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 animate-pulse text-zinc-300">
                        <rect width="20" height="14" x="2" y="3" rx="2"/>
                        <line x1="8" x2="16" y1="21" y2="21"/>
                        <line x1="12" x2="12" y1="17" y2="21"/>
                    </svg>
                    
                    <div className="absolute -bottom-1 -right-1 flex items-center justify-center w-6 h-6 rounded-full bg-black border border-zinc-800">
                        {/* Inline ShieldAlert SVG */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-amber-500">
                            <path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6z"/>
                            <line x1="12" x2="12" y1="8" y2="12"/>
                            <line x1="12" x2="12.01" y1="16" y2="16"/>
                        </svg>
                    </div>
                </div>

                {/* Text Content */}
                <div className="space-y-3">
                    {/* Main title styled with the website's custom text-gradiant */}
                    <h1 className="text-xl font-bold tracking-tight uppercase sm:text-2xl text-gradiant inline-flex items-center">
                        Desktop Required
                    </h1>
                    <p className="text-sm leading-relaxed text-zinc-400">
                        The <span className="text-zinc-200 font-semibold">Naveo</span> platform features interactive dashboards, advanced educational metrics, and luxury content designed exclusively for large screens.
                    </p>
                </div>

                {/* Visual line */}
                <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent my-1" />

                {/* Instructions */}
                <div className="space-y-4 w-full">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300">
                        <span className="flex h-2 w-2 rounded-full bg-zinc-400 animate-ping" />
                        Please open on desktop or laptop
                    </div>
                    
                    <p className="text-xs text-zinc-500">
                        Mobile and portrait tablet viewports are not supported at this time.
                    </p>
                </div>
            </div>
        </div>
    )
}
