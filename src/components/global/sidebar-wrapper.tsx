"use client"

import React from "react"
import { usePathname } from "next/navigation"

export default function SidebarWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    
    const isLockdownExam = 
        (pathname?.includes("/student/exams/") && pathname !== "/student/exams") ||
        (pathname?.includes("/student/coding-exam/") && pathname !== "/student/coding-exam")
    
    if (isLockdownExam) {
        return null
    }
    
    return <>{children}</>
}
