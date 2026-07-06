"use client"

import React from "react"
import { usePathname } from "next/navigation"
import { StudentSidebar } from "@/components/student-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import SidebarWrapper from "@/components/global/sidebar-wrapper"

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
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    // Checks if the route is an active exam attempt session page
    const isExamActive = mounted && pathname.startsWith("/student/exams/") && pathname !== "/student/exams"

    if (isExamActive) {
        return (
            <div className="min-h-screen bg-black text-white w-full overflow-hidden">
                {children}
            </div>
        )
    }

    // Determine current breadcrumb label based on route
    const getBreadcrumbPage = () => {
        if (!mounted) return "Workspace"
        if (pathname.includes("/student/dashboard")) return "Dashboard"
        if (pathname.includes("/student/checkin")) return "Check-In"
        if (pathname.includes("/student/leaderboard")) return "Leaderboard"
        if (pathname.includes("/student/notes")) return "Digital Notes"
        if (pathname.includes("/student/tasks")) return "Tasks"
        if (pathname.includes("/student/exams")) return "Exams"
        if (pathname.includes("/student/practice")) return "Code Practice"
        return "Workspace"
    }

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "19rem",
                } as React.CSSProperties
            }
        >
            <SidebarWrapper>
                <StudentSidebar student={student} />
            </SidebarWrapper>
            <SidebarInset className="bg-black text-white text-radial--circle">
                <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b border-zinc-800/40">
                    <SidebarTrigger className="-ml-1 text-zinc-400 hover:text-white" />
                    <Separator orientation="vertical" className="mr-2 h-4 bg-zinc-800" />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="/student/dashboard" className="text-zinc-400 hover:text-white">
                                    Portal
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block text-zinc-600" />
                            <BreadcrumbItem>
                                <BreadcrumbPage className="text-white font-medium">{getBreadcrumbPage()}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </header>
                <main className="flex-1 p-6 md:p-8 overflow-y-auto w-full">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}
