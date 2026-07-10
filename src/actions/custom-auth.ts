"use server"

import { client } from "@/lib/prisma"
import { getSessionCookie, setSessionCookie, deleteSessionCookie } from "@/lib/session"
import { hashPassword, verifyPassword } from "@/lib/hash"
import { redirect, isRedirectError } from "next/navigation"

/**
 * Handles unified student and admin logins.
 */
export async function loginAction(role: "student" | "admin", identity: string, password: string) {
    try {
        if (role === "admin") {
            // Seed a default admin if none exist in the database
            const adminCount = await client.admin.count()
            if (adminCount === 0) {
                await client.admin.create({
                    data: {
                        username: "admin",
                        password: hashPassword("admin123"),
                    },
                })
            }

            const admin = await client.admin.findUnique({
                where: { username: identity.trim() },
            })

            if (!admin || !verifyPassword(password, admin.password)) {
                return { success: false, error: "Invalid admin credentials" }
            }

            await setSessionCookie("admin_session", {
                id: admin.id,
                username: admin.username,
                role: "admin",
            })

            redirect("/admin/dashboard")
        } else {
            // Student Login
            const student = await client.student.findUnique({
                where: { rollNo: identity.trim() },
            })

            if (!student || !verifyPassword(password, student.password)) {
                return { success: false, error: "Invalid roll number or password" }
            }

            if (student.isFirstLogin) {
                return { success: true, firstLogin: true, rollNo: student.rollNo }
            }

            await setSessionCookie("student_session", {
                id: student.id,
                rollNo: student.rollNo,
                name: student.name,
                role: "student",
            })

            redirect("/student/dashboard")
        }
    } catch (error: any) {
        if (isRedirectError(error)) {
            throw error
        }
        console.error("Login error:", error)
        return { success: false, error: error?.message || "Something went wrong" }
    }
}

/**
 * Resets the password for a student logging in for the first time.
 */
export async function studentFirstResetAction(rollNo: string, tempPassword: string | null, newPassword: string) {
    try {
        const student = await client.student.findUnique({
            where: { rollNo: rollNo.trim() },
        })

        if (!student) {
            return { success: false, error: "Student not found" }
        }

        // If not first login, verify tempPassword
        if (!student.isFirstLogin) {
            const passToVerify = tempPassword || ""
            if (!verifyPassword(passToVerify, student.password)) {
                return { success: false, error: "Authentication failed. Could not verify temporary password." }
            }
        }

        const updatedStudent = await client.student.update({
            where: { rollNo: rollNo.trim() },
            data: {
                password: hashPassword(newPassword),
                isFirstLogin: false,
            },
        })

        await setSessionCookie("student_session", {
            id: updatedStudent.id,
            rollNo: updatedStudent.rollNo,
            name: updatedStudent.name,
            role: "student",
        })

        redirect("/student/dashboard")
    } catch (error: any) {
        if (isRedirectError(error)) {
            throw error
        }
        console.error("Password reset error:", error)
        return { success: false, error: error?.message || "Failed to update password" }
    }
}

/**
 * Clears session cookies for logout.
 */
export async function logoutAction(role: "student" | "admin") {
    if (role === "admin") {
        await deleteSessionCookie("admin_session")
    } else {
        await deleteSessionCookie("student_session")
    }
    return { success: true }
}

/**
 * Gets currently logged in admin user.
 * Returns session data directly from the encrypted cookie — no extra DB round-trip.
 */
export async function getAdminUser() {
    try {
        const session = await getSessionCookie("admin_session")
        if (!session || session.role !== "admin" || !session.id) return null
        // Trust the encrypted session cookie — avoid a redundant DB call on every page.
        return { id: session.id as string, username: session.username as string }
    } catch (e) {
        return null
    }
}

/**
 * Gets currently logged in student user.
 * Returns session data directly from the encrypted cookie — no extra DB round-trip.
 */
export async function getStudentUser() {
    try {
        const session = await getSessionCookie("student_session")
        if (!session || session.role !== "student" || !session.id) return null
        // Trust the encrypted session cookie — avoid a redundant DB call on every page.
        return {
            id: session.id as string,
            rollNo: session.rollNo as string,
            name: session.name as string,
            isFirstLogin: false
        }
    } catch (e) {
        return null
    }
}

/**
 * Checks if a student roll number exists in the database.
 */
export async function checkRollNoAction(rollNo: string) {
    try {
        const student = await client.student.findUnique({
            where: { rollNo: rollNo.trim() },
            select: { id: true, isFirstLogin: true }
        })
        return { exists: !!student, isFirstLogin: student?.isFirstLogin || false }
    } catch (error) {
        console.error("Check roll number error:", error)
        return { exists: false, error: "Database error occurred" }
    }
}
