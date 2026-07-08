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
                student: {
                    select: {
                        name: true,
                        rollNo: true
                    }
                }
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
                student: {
                    select: {
                        name: true,
                        rollNo: true
                    }
                }
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
