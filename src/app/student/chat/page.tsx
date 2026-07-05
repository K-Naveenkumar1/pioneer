"use client"

import React, { useEffect, useRef, useState, useTransition } from "react"
import { Send, MessageSquare, Clock, User, ArrowDown } from "lucide-react"
import { toast } from "sonner"
import { getStudentChatMessagesAction, sendStudentChatMessageAction } from "@/actions/student-chat-actions"
import { getStudentUser } from "@/actions/custom-auth"
import { Button } from "@/components/ui/button"

interface Message {
  id: string
  message: string
  createdAt: Date | string
  studentId: string
  student: {
    name: string
    rollNo: string
  }
}

export default function StudentChatPage() {
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState("")
    const [currentStudent, setCurrentStudent] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [showScrollBtn, setShowScrollBtn] = useState(false)
    const [isPending, startTransition] = useTransition()

    const chatEndRef = useRef<HTMLDivElement>(null)
    const feedRef = useRef<HTMLDivElement>(null)

    // Load initial messages and student profile
    useEffect(() => {
        const init = async () => {
            const profileRes = await getStudentUser()
            if (profileRes) {
                setCurrentStudent(profileRes)
            }
            await fetchMessages(true)
            setLoading(false)
        }
        init()
    }, [])

    // Setup message polling interval
    useEffect(() => {
        const interval = setInterval(() => {
            fetchMessages(false)
        }, 4000)

        return () => clearInterval(interval)
    }, [messages.length])

    const fetchMessages = async (shouldScroll = false) => {
        const res = await getStudentChatMessagesAction()
        if (res.success && res.messages) {
            // Check if messages count increased
            const hasNewMessages = res.messages.length > messages.length
            setMessages(res.messages as any)
            
            if (shouldScroll || hasNewMessages) {
                setTimeout(() => {
                    scrollToBottom()
                }, 50)
            }
        }
    }

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    const handleScroll = () => {
        if (!feedRef.current) return
        const { scrollTop, scrollHeight, clientHeight } = feedRef.current
        const isScrolledUp = scrollHeight - scrollTop - clientHeight > 300
        setShowScrollBtn(isScrolledUp)
    }

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim() || sending) return

        setSending(true)
        const msgToSend = newMessage
        setNewMessage("")

        startTransition(async () => {
            const res = await sendStudentChatMessageAction(msgToSend)
            setSending(false)
            if (res.success && res.message) {
                setMessages((prev) => [...prev, res.message as any])
                setTimeout(() => {
                    scrollToBottom()
                }, 50)
            } else {
                toast.error(res.error || "Failed to send message")
                setNewMessage(msgToSend)
            }
        })
    }

    const formatMessageTime = (dateStr: Date | string) => {
        return new Date(dateStr).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit"
        })
    }

    const formatMessageDate = (dateStr: Date | string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        })
    }

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></span>
                <p className="text-zinc-500 text-sm">Connecting to Doubts Portal...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 flex flex-col h-[calc(100vh-12rem)] max-w-5xl mx-auto">
            {/* Header Description */}
            <div className="flex-shrink-0">
                <h1 className="text-4xl font-extrabold tracking-tight text-white pb-2 flex items-center gap-2">
                    <MessageSquare className="text-indigo-400" /> Doubts Discussion
                </h1>
                <p className="text-sm text-zinc-400">Collaborative workspace to ask doubts, share insights, and discuss code with all other students.</p>
            </div>

            {/* Chat Container Box */}
            <div className="flex-1 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl flex flex-col overflow-hidden relative shadow-2xl backdrop-blur-md">
                {/* Message Feed */}
                <div 
                    ref={feedRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
                >
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-20">
                            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-500">
                                <MessageSquare size={32} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-base">No discussions yet</h3>
                                <p className="text-zinc-500 text-xs mt-1 max-w-[280px]">Be the first to post a doubt or ask a question to start the conversation!</p>
                            </div>
                        </div>
                    ) : (
                        messages.map((msg, index) => {
                            const isMe = currentStudent && msg.studentId === currentStudent.id
                            const showDateDivider = index === 0 || 
                                formatMessageDate(messages[index - 1].createdAt) !== formatMessageDate(msg.createdAt)

                            return (
                                <div key={msg.id} className="space-y-4">
                                    {showDateDivider && (
                                        <div className="flex items-center justify-center my-4">
                                            <div className="h-[1px] bg-zinc-800/60 flex-1" />
                                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider px-3 bg-zinc-950/65 py-1 rounded-full border border-zinc-800/60">
                                                {formatMessageDate(msg.createdAt)}
                                            </span>
                                            <div className="h-[1px] bg-zinc-800/60 flex-1" />
                                        </div>
                                    )}

                                    <div className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
                                        <div className={`flex flex-col max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                                            {/* Sender Label */}
                                            {!isMe && (
                                                <span className="text-[10px] text-zinc-400 font-semibold mb-1 flex items-center gap-1">
                                                    <User size={10} className="text-zinc-500" />
                                                    {msg.student.name} <span className="text-zinc-600 font-mono">({msg.student.rollNo})</span>
                                                </span>
                                            )}

                                            {/* Chat Bubble */}
                                            <div className={`px-4 py-3 rounded-2xl break-words whitespace-pre-wrap text-sm leading-relaxed ${
                                                isMe 
                                                    ? "bg-white text-black font-medium rounded-tr-none shadow-md" 
                                                    : "bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-tl-none"
                                            }`}>
                                                {msg.message}
                                            </div>

                                            {/* Time Label */}
                                            <span className="text-[9px] text-zinc-600 mt-1 flex items-center gap-1 font-mono">
                                                <Clock size={8} /> {formatMessageTime(msg.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Floating Scroll Button */}
                {showScrollBtn && (
                    <button 
                        type="button"
                        onClick={scrollToBottom}
                        className="absolute bottom-24 right-6 p-2.5 rounded-full bg-zinc-900 border border-zinc-800 text-white shadow-lg hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-all animate-bounce"
                    >
                        <ArrowDown size={16} />
                    </button>
                )}

                {/* Chat Input Bar */}
                <form 
                    onSubmit={handleSendMessage} 
                    className="flex-shrink-0 p-4 border-t border-zinc-800/80 bg-zinc-950/80 flex items-center gap-3"
                >
                    <input
                        type="text"
                        placeholder="Ask a doubt or type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        disabled={sending}
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-all text-sm"
                    />
                    <Button 
                        type="submit"
                        disabled={sending || !newMessage.trim()}
                        className="bg-white hover:bg-zinc-200 text-black p-3.5 rounded-xl transition-all aspect-square flex items-center justify-center border-none"
                    >
                        <Send size={16} fill="currentColor" />
                    </Button>
                </form>
            </div>
        </div>
    )
}
