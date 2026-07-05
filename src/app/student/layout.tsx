import React from "react"
import { redirect } from "next/navigation"
import { getStudentUser } from "@/actions/custom-auth"
import StudentLayoutClient from "./layout-client"
import { headers } from "next/headers"
import { client } from "@/lib/prisma"

interface Props {
    children: React.ReactNode
}

export default async function StudentLayout({ children }: Props) {
    const student = await getStudentUser()
    if (!student) {
        redirect("/login")
    }

    const headersList = await headers()
    const currentUrl = headersList.get("x-url") || ""

    let isCheckInPage = false
    if (currentUrl) {
        try {
            const urlObj = new URL(currentUrl)
            isCheckInPage = urlObj.pathname === "/student/checkin"
        } catch (e) {
            isCheckInPage = currentUrl.includes("/student/checkin")
        }
    }

    if (!isCheckInPage) {
        const activeCheckIn = await client.attendance.findFirst({
            where: {
                studentId: student.id,
                checkOut: null
            }
        })

        if (!activeCheckIn) {
            redirect("/student/checkin")
        }
    }

    return (
        <StudentLayoutClient student={student}>
            {children}
        </StudentLayoutClient>
    )
}
