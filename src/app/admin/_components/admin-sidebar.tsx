"use client"

import {
    BookOpen,
    Calendar,
    CheckSquare,
    ChevronLeft,
    ChevronRight,
    FileText,
    Keyboard,
    LayoutDashboard,
    MessageSquare,
    ShieldCheck,
    Trophy,
    Users
} from "lucide-react"
import { montserrat as logoFont } from "@/lib/fonts"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import AdminLogoutButton from "./logout-button"

interface AdminSidebarProps {
    admin: {
        username: string
        adminRole?: string
        classId?: string | null
        className?: string | null
    }
}

export default function AdminSidebar({ admin }: AdminSidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const pathname = usePathname()

    const navItems = [
        { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
        ...(admin.adminRole === "SUPER_ADMIN"
            ? [{ href: "/admin/admins", label: "Manage Admins", icon: ShieldCheck }]
            : []),
        { href: "/admin/students", label: "Students", icon: Users },
        { href: "/admin/tasks", label: "Tasks & Submissions", icon: CheckSquare },
        { href: "/admin/exams", label: "Exams (MCQ)", icon: BookOpen },
        { href: "/admin/materials", label: "Course Materials", icon: FileText },
        { href: "/admin/attendance", label: "Attendance Logs", icon: Calendar },
        { href: "/admin/leaderboard", label: "Leaderboard", icon: Trophy },
        { href: "/admin/chat", label: "Doubts Chat", icon: MessageSquare },
        { href: "/admin/typing-game", label: "Conduct Typing", icon: Keyboard }
    ]

    // Persist collapsed state
    useEffect(() => {
        const saved = localStorage.getItem("admin_sidebar_collapsed")
        if (saved === "true") {
            setIsCollapsed(true)
        }
    }, [])

    const toggleCollapse = () => {
        setIsCollapsed(prev => {
            const next = !prev
            localStorage.setItem("admin_sidebar_collapsed", next ? "true" : "false")
            return next
        })
    }

    return (
        <aside 
            className={`bg-black flex flex-col justify-between p-6 shrink-0 md:sticky md:top-0 md:h-screen z-40 transition-all duration-300 ${
                isCollapsed ? "w-full md:w-24 items-center px-4" : "w-full md:w-64"
            }`}
        >
            <div className="flex flex-col gap-8 w-full">
                {/* Brand logo & Collapse Button */}
                <div className={`flex items-center justify-between ${isCollapsed ? "flex-col gap-4" : ""}`}>
                    <div className="flex flex-col items-start">
                        <div className="flex items-center gap-2.5">
                            <Image src="/nk-logo.png" alt="Logo" width={34} height={26} className="object-contain shrink-0" />
                            {!isCollapsed && (
                                <div className="animate-slide-name flex items-center">
                                    <h2 className={`${logoFont.className} font-bold text-[1.6rem] tracking-tight leading-none text-white`}>Naveo.</h2>
                                </div>
                            )}
                        </div>
                        {!isCollapsed && (
                            <p className="text-[10px] text-themeTextGrey mt-1 ml-[44px] animate-slide-name">
                                {admin.adminRole === "SUPER_ADMIN" ? "Super Admin Portal" : `Admin (${admin.className || "Class"})`}
                            </p>
                        )}
                    </div>
                    
                    {/* Toggle Button */}
                    <button 
                        onClick={toggleCollapse}
                        className="p-1.5 rounded-lg border border-themeGrey/60 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all self-center"
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex flex-col gap-2 w-full">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
                        return (
                            <Link 
                                key={item.href}
                                href={item.href}
                                title={isCollapsed ? item.label : undefined}
                                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                                    isActive 
                                        ? "bg-white text-black font-bold" 
                                        : "hover:bg-themeGrey/50 text-themeTextGrey hover:text-white"
                                } ${isCollapsed ? "justify-center p-3" : ""}`}
                            >
                                <Icon size={18} className="shrink-0" />
                                {!isCollapsed && <span>{item.label}</span>}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            {/* Profile Footer */}
            <div className={`pt-6 border-t border-themeGrey flex flex-col gap-4 w-full ${isCollapsed ? "items-center" : ""}`}>
                <div className="flex items-center gap-3 w-full justify-start">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-themeGrey flex items-center justify-center font-bold text-sm text-amber-400 shrink-0">
                        {admin.adminRole === "SUPER_ADMIN" ? "SA" : "CA"}
                    </div>
                    {!isCollapsed && (
                        <div className="overflow-hidden">
                            <p className="font-semibold text-sm truncate">
                                {admin.adminRole === "SUPER_ADMIN" ? "Super Admin" : "Class Admin"}
                            </p>
                            <p className="text-[11px] text-amber-400 font-medium truncate">
                                @{admin.username} {admin.className ? `• ${admin.className}` : ""}
                            </p>
                        </div>
                    )}
                </div>
                
                <AdminLogoutButton isCollapsed={isCollapsed} />
            </div>
        </aside>
    )
}
