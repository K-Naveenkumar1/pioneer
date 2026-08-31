import React from "react"
import { redirect } from "next/navigation"
import { getStudentUser, logoutAction } from "@/actions/custom-auth"
import { deleteSessionCookie } from "@/lib/session"
import StudentLayoutClient from "./layout-client"

interface Props {
    children: React.ReactNode
}

export default async function StudentLayout({ children }: Props) {
    const student = await getStudentUser()
    if (!student) {
        await deleteSessionCookie("student_session")
        redirect("/login")
    }

    return (
        <StudentLayoutClient student={student}>
            {children}
        </StudentLayoutClient>
    )
}
