import React from "react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getAdminUser } from "@/actions/custom-auth"
import { 
    LayoutDashboard, 
    Users, 
    CheckSquare, 
    BookOpen, 
    Calendar, 
    Shield
} from "lucide-react"
import AdminLogoutButton from "./_components/logout-button"

interface Props {
    children: React.ReactNode
}

export default async function AdminLayout({ children }: Props) {
    const admin = await getAdminUser()
    if (!admin) {
        redirect("/login")
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-black border-r border-themeGrey/60 flex flex-col justify-between p-6 shrink-0 md:sticky md:top-0 md:h-screen z-40">
                <div className="flex flex-col gap-8">
                    {/* Brand logo */}
                    <div className="flex items-center gap-3">
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-white">
                            <div className="size-3.5 rounded-full bg-black" />
                        </div>
                        <div>
                            <h2 className="font-extrabold text-lg tracking-tight">Navedx.</h2>
                            <p className="text-[10px] text-themeTextGrey">Administrator Portal</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex flex-col gap-2">
                        <Link 
                            href="/admin/dashboard" 
                            className="flex items-center gap-3.5 px-4 py-3 rounded-xl hover:bg-themeGrey/50 transition-all text-sm font-medium text-themeTextGrey hover:text-white"
                        >
                            <>
                                <LayoutDashboard size={18} />
                                Overview
                            </>
                        </Link>
                        <Link 
                            href="/admin/students" 
                            className="flex items-center gap-3.5 px-4 py-3 rounded-xl hover:bg-themeGrey/50 transition-all text-sm font-medium text-themeTextGrey hover:text-white"
                        >
                            <>
                                <Users size={18} />
                                Students
                            </>
                        </Link>
                        <Link 
                            href="/admin/tasks" 
                            className="flex items-center gap-3.5 px-4 py-3 rounded-xl hover:bg-themeGrey/50 transition-all text-sm font-medium text-themeTextGrey hover:text-white"
                        >
                            <>
                                <CheckSquare size={18} />
                                Tasks & Submissions
                            </>
                        </Link>
                        <Link 
                            href="/admin/exams" 
                            className="flex items-center gap-3.5 px-4 py-3 rounded-xl hover:bg-themeGrey/50 transition-all text-sm font-medium text-themeTextGrey hover:text-white"
                        >
                            <>
                                <BookOpen size={18} />
                                Exams (MCQ)
                            </>
                        </Link>
                        <Link 
                            href="/admin/attendance" 
                            className="flex items-center gap-3.5 px-4 py-3 rounded-xl hover:bg-themeGrey/50 transition-all text-sm font-medium text-themeTextGrey hover:text-white"
                        >
                            <>
                                <Calendar size={18} />
                                Attendance Logs
                            </>
                        </Link>
                    </nav>
                </div>

                {/* Profile Footer */}
                <div className="pt-6 border-t border-themeGrey flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-themeGrey flex items-center justify-center font-bold text-sm text-themeTextWhite">
                            AD
                        </div>
                        <div className="overflow-hidden">
                            <p className="font-semibold text-sm truncate">Administrator</p>
                            <p className="text-[11px] text-themeTextGrey truncate">@{admin.username}</p>
                        </div>
                    </div>
                    
                    <AdminLogoutButton />
                </div>
            </aside>

            {/* Inset Main Pane (sidebar-08 style) */}
            <div className="flex-1 flex flex-col m-2 md:m-3.5 rounded-2xl border border-themeGrey/80 bg-zinc-950/40 shadow-2xl relative overflow-hidden">
                <header className="flex h-14 shrink-0 items-center justify-between border-b border-themeGrey/40 px-6 bg-black/10">
                    <div className="flex items-center gap-2 text-xs font-semibold text-themeTextGrey">
                        <span>Portal</span>
                        <span className="text-zinc-600">/</span>
                        <span className="text-white">Admin Console</span>
                    </div>
                </header>
                <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
                    {children}
                </main>
            </div>
        </div>
    )
}
