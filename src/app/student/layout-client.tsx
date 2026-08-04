"use client"

import SidebarWrapper from "@/components/global/sidebar-wrapper"
import { StudentSidebar } from "@/components/student-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"
import React from "react"

interface Props {
    student: {
        id: string
        rollNo: string
        name: string
    }
    children: React.ReactNode
}

export default function StudentLayoutClient({ student, children }: Props) {
    const pathname = usePathname()

    // Checks if the route is an active exam attempt session page
    const isExamActive = pathname.startsWith("/student/exams/") && pathname !== "/student/exams"
    const isCodingExamActive = pathname.startsWith("/student/coding-exam/") && pathname !== "/student/coding-exam"

    if (isExamActive || isCodingExamActive) {
        return (
            <div className="min-h-screen bg-black text-white w-full overflow-hidden">
                {children}
            </div>
        )
    }

    // Determine current breadcrumb label based on route
    const getBreadcrumbPage = () => {
        if (pathname.includes("/student/dashboard")) return "Dashboard"
        if (pathname.includes("/student/checkin")) return "Check-In"
        if (pathname.includes("/student/leaderboard")) return "Leaderboard"
        if (pathname.includes("/student/notes")) return "Digital Notes"
        if (pathname.includes("/student/tasks")) return "Tasks"
        if (pathname.includes("/student/exams")) return "Exams"
        if (pathname.includes("/student/coding-exam")) return "Coding Exam"
        if (pathname.includes("/student/typing-game")) return "Typing Game"
        return "Workspace"
    }

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "18.5rem",
                } as React.CSSProperties
            }
        >
            <SidebarWrapper>
                <StudentSidebar student={student} />
            </SidebarWrapper>
            <StudentLayoutInner student={student}>{children}</StudentLayoutInner>
        </SidebarProvider>
    )
}

function StudentLayoutInner({ student, children }: { student: any; children: React.ReactNode }) {
    const { state } = useSidebar()
    const pathname = usePathname()

    const getPageName = () => {
        if (pathname.includes("/student/dashboard")) return "Dashboard"
        if (pathname.includes("/student/checkin")) return "Check-In"
        if (pathname.includes("/student/leaderboard")) return "Leaderboard"
        if (pathname.includes("/student/chat")) return "Doubts Chat"
        if (pathname.includes("/student/notes")) return "Digital Notes"
        if (pathname.includes("/student/materials")) return "Course Materials"
        if (pathname.includes("/student/tasks")) return "Tasks"
        if (pathname.includes("/student/exams")) return "Exams"
        if (pathname.includes("/student/coding-exam")) return "Coding Exam"
        if (pathname.includes("/student/typing-game")) return "Typing Game"
        if (pathname.includes("/student/practice")) return "Practice Arena"
        return "Workspace"
    }

    const pageName = getPageName()

    return (
        <SidebarInset className="bg-black text-white text-radial--circle">
            <main className="flex-1 p-4 md:p-6 overflow-y-auto w-full">
                {/* Header bar showing toggle and page name */}
                <div className="flex items-center gap-3.5 mb-6 text-zinc-400">
                    <SidebarTrigger className="hover:text-white transition-colors" />
                    <span className="text-zinc-850 select-none">|</span>
                    <span className="text-sm font-semibold text-zinc-200 select-none">{pageName}</span>
                </div>
                {children}
            </main>
        </SidebarInset>
    )
}
