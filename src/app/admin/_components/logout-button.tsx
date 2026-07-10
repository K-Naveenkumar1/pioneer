"use client"

import React, { useTransition } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { logoutAction } from "@/actions/custom-auth"
import { toast } from "sonner"

interface AdminLogoutButtonProps {
    isCollapsed?: boolean
}

export default function AdminLogoutButton({ isCollapsed = false }: AdminLogoutButtonProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const handleLogout = () => {
        startTransition(async () => {
            const res = await logoutAction("admin")
            if (res.success) {
                toast.success("Successfully logged out.")
                router.push("/login")
            } else {
                toast.error("Failed to log out.")
            }
        })
    }

    return (
        <button
            onClick={handleLogout}
            disabled={isPending}
            title={isCollapsed ? (isPending ? "Logging out..." : "Logout") : undefined}
            className={`flex items-center gap-3.5 px-4 py-3 rounded-xl hover:bg-red-500/10 hover:text-red-400 text-themeTextGrey transition-all text-sm font-medium ${
                isCollapsed ? "w-10 h-10 justify-center p-0 mx-auto" : "w-full"
            }`}
        >
            <LogOut size={18} />
            {!isCollapsed && (isPending ? "Logging out..." : "Logout")}
        </button>
    )
}
