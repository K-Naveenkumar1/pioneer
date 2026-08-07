"use server"

import { client } from "@/lib/prisma"
import { getStudentUser, getAdminUser } from "@/actions/custom-auth"

export async function getStudentChatMessagesAction() {
    try {
        // Authorize either student or admin
        const student = await getStudentUser()
        const admin = await getAdminUser()
        if (!student && !admin) {
            return { success: false, error: "Unauthorized" }
        }

        const messages = await client.studentMessage.findMany({
            take: 100,
            orderBy: {
                createdAt: "asc"
            },
            include: {
                student: true
            }
        })

        return { success: true, messages }
    } catch (error: any) {
        console.error("Fetch student chat messages error:", error)
        return { success: false, error: error?.message || "Failed to fetch messages" }
    }
}

export async function sendStudentChatMessageAction(message: string) {
    try {
        const student = await getStudentUser()
        if (!student) {
            return { success: false, error: "Unauthorized" }
        }

        if (!message.trim()) {
            return { success: false, error: "Message cannot be empty" }
        }

        const newMessage = await client.studentMessage.create({
            data: {
                message: message.trim(),
                studentId: student.id,
                isAdmin: false
            },
            include: {
                student: true
            }
        })

        return { success: true, message: newMessage }
    } catch (error: any) {
        console.error("Send student chat message error:", error)
        return { success: false, error: error?.message || "Failed to send message" }
    }
}

export async function adminSendChatMessageAction(message: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) {
            return { success: false, error: "Unauthorized" }
        }

        if (!message.trim()) {
            return { success: false, error: "Message cannot be empty" }
        }

        const newMessage = await client.studentMessage.create({
            data: {
                message: message.trim(),
                studentId: null,
                isAdmin: true,
                adminName: admin.username
            }
        })

        return { success: true, message: newMessage }
    } catch (error: any) {
        console.error("Admin send chat message error:", error)
        return { success: false, error: error?.message || "Failed to send message" }
    }
}

export async function deleteStudentChatMessageAction(messageId: string) {
    try {
        const admin = await getAdminUser()
        const student = await getStudentUser()
        if (!admin && !student) {
            return { success: false, error: "Unauthorized" }
        }

        const message = await client.studentMessage.findUnique({
            where: { id: messageId }
        })

        if (!message) {
            return { success: false, error: "Message not found" }
        }

        // If the logged in user is a student, ensure they own this message
        if (student) {
            if (message.studentId !== student.id || message.isAdmin) {
                return { success: false, error: "Unauthorized to delete this message" }
            }
        }

        await client.studentMessage.delete({
            where: { id: messageId }
        })

        return { success: true, message: "Message deleted successfully!" }
    } catch (error: any) {
        console.error("Delete student chat message error:", error)
        return { success: false, error: error?.message || "Failed to delete message" }
    }
}
