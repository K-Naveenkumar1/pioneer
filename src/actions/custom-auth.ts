"use server"

import { client } from "@/lib/prisma"
import { getSessionCookie, setSessionCookie, deleteSessionCookie } from "@/lib/session"
import { hashPassword, verifyPassword } from "@/lib/hash"

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

            return { success: true, redirect: "/admin/dashboard" }
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

            return { success: true, redirect: "/student/dashboard" }
        }
    } catch (error: any) {
        console.error("Login error:", error)
        return { success: false, error: error?.message || "Something went wrong" }
    }
}

/**
 * Resets the password for a student logging in for the first time.
 */
export async function studentFirstResetAction(rollNo: string, tempPassword: string, newPassword: string) {
    try {
        const student = await client.student.findUnique({
            where: { rollNo: rollNo.trim() },
        })

        if (!student || !verifyPassword(tempPassword, student.password)) {
            return { success: false, error: "Authentication failed. Could not verify temporary password." }
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

        return { success: true, redirect: "/student/dashboard" }
    } catch (error: any) {
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
 */
export async function getAdminUser() {
    try {
        const session = await getSessionCookie("admin_session")
        if (!session || session.role !== "admin") return null
        
        const admin = await client.admin.findUnique({
            where: { id: session.id },
            select: { id: true, username: true }
        })
        return admin
    } catch (e) {
        return null
    }
}

/**
 * Gets currently logged in student user.
 */
export async function getStudentUser() {
    try {
        const session = await getSessionCookie("student_session")
        if (!session || session.role !== "student") return null

        const student = await client.student.findUnique({
            where: { id: session.id },
            select: { id: true, rollNo: true, name: true, isFirstLogin: true }
        })
        return student
    } catch (e) {
        return null
    }
}
