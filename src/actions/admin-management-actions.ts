"use server"

import { client } from "@/lib/prisma"
import { getAdminUser } from "./custom-auth"
import { hashPassword } from "@/lib/hash"

/**
 * Fetches all admins and available classes for Super Admin management interface.
 */
export async function adminGetAdminsAction() {
    try {
        const admin = await getAdminUser()
        if (!admin || admin.adminRole !== "SUPER_ADMIN") {
            return { success: false, error: "Unauthorized. Super Admin access required." }
        }

        const [admins, classes] = await Promise.all([
            client.admin.findMany({
                select: {
                    id: true,
                    username: true,
                    role: true,
                    classId: true,
                    createdAt: true,
                    class: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            }),
            client.class.findMany({
                select: {
                    id: true,
                    name: true,
                },
                orderBy: { name: "asc" },
            }),
        ])

        return {
            success: true,
            admins,
            classes,
        }
    } catch (e: any) {
        console.error("adminGetAdminsAction error:", e)
        return { success: false, error: e.message || "Failed to fetch admins" }
    }
}

/**
 * Creates a new Class Admin.
 */
export async function adminCreateClassAdminAction(data: {
    username: string
    password: string
    classId?: string
}) {
    try {
        const currentAdmin = await getAdminUser()
        if (!currentAdmin || currentAdmin.adminRole !== "SUPER_ADMIN") {
            return { success: false, error: "Unauthorized. Super Admin access required." }
        }

        const cleanUsername = data.username.trim()
        const cleanPassword = data.password.trim()
        const cleanClassId = data.classId?.trim()

        if (!cleanUsername || !cleanPassword) {
            return { success: false, error: "Username and password are required" }
        }

        if (!cleanClassId) {
            return { success: false, error: "Please select an assigned class for the Class Admin." }
        }

        const existingAdmin = await client.admin.findUnique({
            where: { username: cleanUsername },
        })

        if (existingAdmin) {
            return { success: false, error: `Admin username '${cleanUsername}' is already taken.` }
        }

        const newAdmin = await client.admin.create({
            data: {
                username: cleanUsername,
                password: hashPassword(cleanPassword),
                role: "CLASS_ADMIN",
                classId: cleanClassId,
            },
            include: {
                class: {
                    select: { name: true },
                },
            },
        })

        return {
            success: true,
            message: `Class Admin '@${newAdmin.username}' created successfully for ${newAdmin.class?.name || "assigned class"}!`,
            admin: newAdmin,
        }
    } catch (e: any) {
        console.error("adminCreateClassAdminAction error:", e)
        return { success: false, error: e.message || "Failed to create admin" }
    }
}

/**
 * Edits an existing Class Admin's username, password, or assigned class.
 */
export async function adminEditAdminAction(
    adminId: string,
    data: {
        username: string
        password?: string
        classId?: string
    }
) {
    try {
        const currentAdmin = await getAdminUser()
        if (!currentAdmin || currentAdmin.adminRole !== "SUPER_ADMIN") {
            return { success: false, error: "Unauthorized. Super Admin access required." }
        }

        const cleanUsername = data.username.trim()
        const cleanClassId = data.classId?.trim()

        if (!cleanUsername) {
            return { success: false, error: "Username cannot be empty" }
        }

        const targetAdmin = await client.admin.findUnique({
            where: { id: adminId },
        })

        if (!targetAdmin) {
            return { success: false, error: "Admin not found" }
        }

        if (targetAdmin.role !== "SUPER_ADMIN" && !cleanClassId) {
            return { success: false, error: "Class Admin must be assigned to a specific class." }
        }

        // Check if username is being changed to one that already exists
        if (cleanUsername !== targetAdmin.username) {
            const existing = await client.admin.findUnique({
                where: { username: cleanUsername },
            })
            if (existing) {
                return { success: false, error: `Username '${cleanUsername}' is already in use.` }
            }
        }

        const updateData: any = {
            username: cleanUsername,
            classId: data.classId && data.classId.trim() !== "" ? data.classId.trim() : null,
        }

        if (data.password && data.password.trim() !== "") {
            updateData.password = hashPassword(data.password.trim())
        }

        const updated = await client.admin.update({
            where: { id: adminId },
            data: updateData,
            include: {
                class: {
                    select: { name: true },
                },
            },
        })

        return {
            success: true,
            message: `Admin '@${updated.username}' updated successfully!`,
            admin: updated,
        }
    } catch (e: any) {
        console.error("adminEditAdminAction error:", e)
        return { success: false, error: e.message || "Failed to update admin" }
    }
}

/**
 * Deletes an admin account.
 */
export async function adminDeleteAdminAction(adminId: string) {
    try {
        const currentAdmin = await getAdminUser()
        if (!currentAdmin || currentAdmin.adminRole !== "SUPER_ADMIN") {
            return { success: false, error: "Unauthorized. Super Admin access required." }
        }

        if (adminId === currentAdmin.id) {
            return { success: false, error: "You cannot delete your own Super Admin account." }
        }

        const targetAdmin = await client.admin.findUnique({
            where: { id: adminId },
        })

        if (!targetAdmin) {
            return { success: false, error: "Admin account not found" }
        }

        if (targetAdmin.role === "SUPER_ADMIN") {
            const superAdminCount = await client.admin.count({
                where: { role: "SUPER_ADMIN" },
            })
            if (superAdminCount <= 1) {
                return { success: false, error: "Cannot delete the last Super Admin account." }
            }
        }

        await client.admin.delete({
            where: { id: adminId },
        })

        return { success: true, message: `Admin '@${targetAdmin.username}' deleted successfully.` }
    } catch (e: any) {
        console.error("adminDeleteAdminAction error:", e)
        return { success: false, error: e.message || "Failed to delete admin" }
    }
}

/**
 * Edits a student's profile (name, rollNo, password, department, classId).
 */
export async function adminEditStudentAction(
    studentId: string,
    data: {
        name: string
        rollNo: string
        password?: string
        department?: string
        classId?: string
    }
) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const cleanRoll = data.rollNo.trim().toUpperCase()
        const cleanName = data.name.trim()

        if (!cleanRoll || !cleanName) {
            return { success: false, error: "Name and Roll Number are required" }
        }

        const targetStudent = await client.student.findUnique({
            where: { id: studentId },
        })

        if (!targetStudent) {
            return { success: false, error: "Student not found" }
        }

        // Class Admin restriction check
        if (admin.adminRole === "CLASS_ADMIN" && admin.classId && targetStudent.classId !== admin.classId) {
            return { success: false, error: "Unauthorized. You can only edit students in your assigned class." }
        }

        // Check rollNo uniqueness if changed
        if (cleanRoll !== targetStudent.rollNo) {
            const existingRoll = await client.student.findUnique({
                where: { rollNo: cleanRoll },
            })
            if (existingRoll) {
                return { success: false, error: `Roll number '${cleanRoll}' is already assigned to another student.` }
            }
        }

        const updateData: any = {
            name: cleanName,
            rollNo: cleanRoll,
            department: data.department ? data.department.trim() : null,
            classId: data.classId && data.classId.trim() !== "" ? data.classId.trim() : null,
        }

        if (data.password && data.password.trim() !== "") {
            updateData.password = hashPassword(data.password.trim())
        }

        const updatedStudent = await client.student.update({
            where: { id: studentId },
            data: updateData,
        })

        return {
            success: true,
            message: `Student '${updatedStudent.name}' (${updatedStudent.rollNo}) updated successfully!`,
            student: updatedStudent,
        }
    } catch (e: any) {
        console.error("adminEditStudentAction error:", e)
        return { success: false, error: e.message || "Failed to update student profile" }
    }
}
