"use client"

import React from "react"
import { usePathname } from "next/navigation"

export default function SidebarWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    
    // Check if in lockdown exam (e.g. /student/exams/some-id)
    const isLockdownExam = pathname?.includes("/student/exams/") && pathname !== "/student/exams"
    // Check if in code practice
    const isCodePractice = pathname === "/student/practice"
    
    if (isLockdownExam || isCodePractice) {
        return null
    }
    
    return <>{children}</>
}
