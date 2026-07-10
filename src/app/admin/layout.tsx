import React from "react"
import { redirect } from "next/navigation"
import { getAdminUser } from "@/actions/custom-auth"
import AdminSidebar from "./_components/admin-sidebar"

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
            {/* Collapsible Sidebar */}
            <AdminSidebar admin={admin} />

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
