import React from "react"
import { redirect } from "next/navigation"
import { getStudentUser } from "@/actions/custom-auth"
import StudentLayoutClient from "./layout-client"

interface Props {
    children: React.ReactNode
}

export default async function StudentLayout({ children }: Props) {
    const student = await getStudentUser()
    if (!student) {
        redirect("/login")
    }

    return (
        <StudentLayoutClient student={student}>
            {children}
        </StudentLayoutClient>
    )
}
