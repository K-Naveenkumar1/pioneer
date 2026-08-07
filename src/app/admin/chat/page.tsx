"use client"

import React, { useState, useEffect, useRef } from "react"
import { MessageSquare, Send, RefreshCw, User, Shield, Trash2 } from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "sonner"

import GlassCard from "@/components/global/glass-card"
import { Button } from "@/components/ui/button"
import { getStudentChatMessagesAction, adminSendChatMessageAction, deleteStudentChatMessageAction } from "@/actions/student-chat-actions"

export default function AdminDoubtsChatPage() {
    const [messages, setMessages] = useState<any[]>([])
    const [newMessage, setNewMessage] = useState("")
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)

    const chatEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        loadMessages()
        // Poll for new student messages every 4 seconds
        const interval = setInterval(loadMessages, 4000)
        return () => clearInterval(interval)
    }, [])

    const loadMessages = async () => {
        const res = await getStudentChatMessagesAction()
        if (res.success && res.messages) {
            setMessages(res.messages)
            if (loading) {
                setLoading(false)
                setTimeout(scrollToBottom, 50)
            }
        } else {
            if (loading) setLoading(false)
        }
    }

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim() || sending) return

        setSending(true)
        const msgToSend = newMessage.trim()
        setNewMessage("") // Clear input immediately for better UX

        const res = await adminSendChatMessageAction(msgToSend)
        setSending(false)

        if (res.success && res.message) {
            setMessages(prev => [...prev, res.message])
            setTimeout(scrollToBottom, 50)
        } else {
            toast.error(res.error || "Failed to send message.")
            setNewMessage(msgToSend) // Restore message if failed
        }
    }

    const handleDeleteMessage = async (messageId: string) => {
        if (!window.confirm("Are you sure you want to delete this message?")) return

        const res = await deleteStudentChatMessageAction(messageId)
        if (res.success) {
            toast.success("Message deleted successfully!")
            setMessages(prev => prev.filter(msg => msg.id !== messageId))
        } else {
            toast.error(res.error || "Failed to delete message")
        }
    }

    const formatTimestamp = (date: string | Date) => {
        return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></span>
            </div>
        )
    }

    return (
        <div className="space-y-6 flex flex-col h-[calc(100vh-120px)]">
            {/* Header */}
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                        <MessageSquare className="text-white" /> Doubts Chat Console
                    </h1>
                    <p className="text-sm text-themeTextGrey">Answer students' questions and doubts in real-time.</p>
                </div>
                <button
                    onClick={loadMessages}
                    className="p-2.5 bg-zinc-900 border border-themeGrey rounded-xl text-themeTextGrey hover:text-white hover:border-zinc-700 transition-all"
                >
                    <RefreshCw size={16} />
                </button>
            </div>

            {/* Chat Pane */}
            <div className="flex-1 flex flex-col border border-themeGrey rounded-2xl bg-zinc-950/20 overflow-hidden relative p-4 gap-4 h-full">
                {/* Chat Bubble List */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 select-text">
                    {messages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-center text-zinc-500 italic text-sm">
                            No doubts or messages logged yet. Students can submit questions from their portal.
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isStaff = msg.isAdmin
                            return (
                                <div
                                    key={msg.id}
                                    className={`flex items-start gap-3 max-w-[80%] group ${
                                        isStaff ? "ml-auto flex-row-reverse" : "mr-auto"
                                    }`}
                                >
                                    {/* Avatar placeholder */}
                                    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                                        isStaff 
                                            ? "bg-white text-black border border-white"
                                            : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                                    }`}>
                                        {isStaff ? <Shield size={14} /> : <User size={14} />}
                                    </div>

                                    {/* Bubble */}
                                    <div className="space-y-1 min-w-0">
                                        <div className={`flex items-center gap-2 text-[10px] text-zinc-500 ${
                                            isStaff ? "justify-end" : ""
                                        }`}>
                                            <span className="font-semibold text-zinc-400">
                                                {isStaff ? `Instructor (@${msg.adminName})` : (msg.student?.name || "Deleted Student")}
                                            </span>
                                            {!isStaff && msg.student && (
                                                <span className="font-mono text-zinc-600">
                                                    ({msg.student.rollNo})
                                                </span>
                                            )}
                                        </div>

                                        <motion.div 
                                            initial={{ opacity: 0, y: 12, scale: 0.96 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{ duration: 0.2, ease: "easeOut" }}
                                            className={`p-4 rounded-2xl text-xs leading-relaxed border break-all ${
                                                isStaff
                                                    ? "bg-white text-black border-white rounded-tr-none"
                                                    : "bg-[#0f0f0f]/80 text-zinc-200 border-themeGrey/60 rounded-tl-none"
                                            }`}
                                        >
                                            <p className="whitespace-pre-wrap">{msg.message}</p>
                                            <div className={`text-[9px] mt-2 text-right ${
                                                isStaff ? "text-black/60" : "text-zinc-500"
                                            }`}>
                                                {formatTimestamp(msg.createdAt)}
                                            </div>
                                        </motion.div>
                                    </div>

                                    {/* Delete Button (visible on group hover) */}
                                    <button 
                                        onClick={() => handleDeleteMessage(msg.id)}
                                        className="self-center p-1.5 rounded-lg text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0 cursor-pointer"
                                        title="Delete Message"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            )
                        })
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendMessage} className="shrink-0 flex items-center gap-3 border-t border-themeGrey/40 pt-4 mt-2">
                    <input
                        type="text"
                        placeholder="Type instructor reply here..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1 px-4 py-3 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-zinc-750 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all text-xs"
                    />
                    <Button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="p-3.5 bg-white hover:bg-zinc-200 text-black rounded-xl font-bold transition-all shrink-0"
                    >
                        <Send size={14} />
                    </Button>
                </form>
            </div>
        </div>
    )
}
