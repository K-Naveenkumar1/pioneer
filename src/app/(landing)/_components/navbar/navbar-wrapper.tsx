"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface NavbarWrapperProps {
  children: React.ReactNode
}

export default function NavbarWrapper({ children }: NavbarWrapperProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full py-3 flex justify-center transition-all duration-300 ease-in-out">
      <div
        className={cn(
          "bg-[#18181B] border border-[#27272A]/50 px-4 sm:px-6 flex justify-between items-center rounded-full h-16 shadow-lg transition-all duration-300 ease-in-out",
          scrolled
            ? "w-[90%] md:w-[80%] lg:w-[72%] max-w-5xl shadow-black/40 border-[#27272A]"
            : "w-[96%] md:w-[90%] lg:w-[85%] max-w-6xl"
        )}
      >
        {children}
      </div>
    </header>
  )
}
