"use server"

import { client } from "@/lib/prisma"
import { getStudentUser } from "@/actions/custom-auth"

export async function getStudentChatMessagesAction() {
    try {
        const student = await getStudentUser()
        if (!student) {
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
                studentId: student.id
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
