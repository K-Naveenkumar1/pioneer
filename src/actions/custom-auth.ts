"use server"

import { client } from "@/lib/prisma"
import { getSessionCookie, setSessionCookie, deleteSessionCookie, isNextDynamicServerError } from "@/lib/session"
import { hashPassword, verifyPassword } from "@/lib/hash"

/**
 * Handles unified student and admin logins.
 */
export async function loginAction(role: "student" | "admin", identity: string, password: string) {
    try {
        if (role === "admin") {
            // Seed a default Super Admin if none exist in the database
            const adminCount = await client.admin.count()
            if (adminCount === 0) {
                await client.admin.create({
                    data: {
                        username: "admin",
                        password: hashPassword("admin123"),
                        role: "SUPER_ADMIN",
                    },
                })
            } else {
                // Ensure existing primary 'admin' user is SUPER_ADMIN
                const defaultAdmin = await client.admin.findUnique({ where: { username: "admin" } })
                if (defaultAdmin && defaultAdmin.role !== "SUPER_ADMIN") {
                    await client.admin.update({
                        where: { id: defaultAdmin.id },
                        data: { role: "SUPER_ADMIN" }
                    })
                }
            }

            const admin = await client.admin.findUnique({
                where: { username: identity.trim() },
                include: { class: { select: { name: true } } }
            })

            if (!admin || !verifyPassword(password, admin.password)) {
                return { success: false, error: "Invalid admin credentials" }
            }

            await setSessionCookie("admin_session", {
                id: admin.id,
                username: admin.username,
                role: "admin",
                adminRole: admin.role,
                classId: admin.classId,
                className: admin.class?.name || null,
            })

            return { success: true, redirect: "/admin/dashboard" }
        } else {
            // Student Login
            const student = await client.student.findUnique({
                where: { rollNo: identity.trim().toUpperCase() },
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
export async function studentFirstResetAction(rollNo: string, tempPassword: string | null, newPassword: string) {
    try {
        const student = await client.student.findUnique({
            where: { rollNo: rollNo.trim().toUpperCase() },
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
            where: { rollNo: rollNo.trim().toUpperCase() },
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
        if (!session) {
            return null
        }
        if (session.role !== "admin") {
            return null
        }
        if (!session.id) {
            return null
        }

        // Fetch fresh admin info from DB to guarantee role & class mapping consistency
        const admin = await client.admin.findUnique({
            where: { id: session.id },
            select: {
                id: true,
                username: true,
                role: true,
                classId: true,
                class: { select: { name: true } },
            },
        })

        if (!admin) return null

        return {
            id: admin.id,
            username: admin.username,
            adminRole: admin.role, // "SUPER_ADMIN" or "CLASS_ADMIN"
            classId: admin.classId,
            className: admin.class?.name || null,
        }
    } catch (e: any) {
        if (isNextDynamicServerError(e)) {
            throw e
        }
        console.error(`[custom-auth:getAdminUser] Unexpected exception: ${e.message}`)
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
        if (!session) {
            console.log("[custom-auth:getStudentUser] No student_session cookie found or decryption failed")
            return null
        }
        if (session.role !== "student") {
            console.warn(`[custom-auth:getStudentUser] Session role mismatch. Expected student, got: ${session.role}`)
            return null
        }
        if (!session.id) {
            console.warn("[custom-auth:getStudentUser] Session missing student ID")
            return null
        }
        // Trust the encrypted session cookie — avoid a redundant DB call on every page.
        return {
            id: session.id as string,
            rollNo: session.rollNo as string,
            name: session.name as string,
            isFirstLogin: false
        }
    } catch (e: any) {
        if (isNextDynamicServerError(e)) {
            throw e
        }
        console.error(`[custom-auth:getStudentUser] Unexpected exception: ${e.message}`)
        return null
    }
}

/**
 * Checks if a student roll number exists in the database.
 */
export async function checkRollNoAction(rollNo: string) {
    let attempts = 0
    const maxAttempts = 3
    while (attempts < maxAttempts) {
        try {
            attempts++
            const student = await client.student.findUnique({
                where: { rollNo: rollNo.trim() },
                select: { id: true, isFirstLogin: true }
            })
            return { exists: !!student, isFirstLogin: student?.isFirstLogin || false }
        } catch (error: any) {
            console.error(`Check roll number error (attempt ${attempts}/${maxAttempts}):`, error?.message || error)
            if (attempts < maxAttempts && (error?.message?.includes("Can't reach database server") || error?.name === "PrismaClientInitializationError")) {
                await new Promise(res => setTimeout(res, 800))
                continue
            }
            return { exists: false, error: "Unable to connect to database. Please check connection and try again." }
        }
    }
    return { exists: false, error: "Database connection timed out. Please try again." }
}
