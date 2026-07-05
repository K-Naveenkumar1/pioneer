"use client"

import React, { useTransition } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { logoutAction } from "@/actions/custom-auth"
import { toast } from "sonner"

export default function StudentLogoutButton() {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const handleLogout = () => {
        startTransition(async () => {
            const res = await logoutAction("student")
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
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl hover:bg-red-500/10 hover:text-red-400 text-themeTextGrey transition-all text-sm font-medium"
        >
            <LogOut size={18} />
            {isPending ? "Logging out..." : "Logout"}
        </button>
    )
}
