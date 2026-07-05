"use client"

import React, { useState, useEffect, useRef } from "react"
import { 
    Code, 
    Play, 
    RefreshCw, 
    Terminal, 
    ChevronDown, 
    Lock,
    ShieldAlert,
    AlertTriangle,
    Eye
} from "lucide-react"
import { toast } from "sonner"

import GlassCard from "@/components/global/glass-card"
import { Button } from "@/components/ui/button"
import { runCodeAction } from "@/actions/student-actions"

// Map languages to Judge0 CE IDs
const LANGUAGES = [
    { 
        id: "javascript", 
        name: "JavaScript", 
        ext: "js", 
        judge0Id: 102, // Node.js 22.08.0
        default: `// Javascript Practice\nconsole.log("Hello, Pioneer!");\n\nfunction sum(a, b) {\n    return a + b;\n}\nconsole.log("Sum of 5 + 10 =", sum(5, 10));` 
    },
    { 
        id: "python", 
        name: "Python", 
        ext: "py", 
        judge0Id: 100, // Python 3.12.5
        default: `# Python Practice\ndef greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("Pioneer"))\n\n# Let's run a loop\nfor i in range(3):\n    print(f"Loop index: {i}")` 
    },
    { 
        id: "cpp", 
        name: "C++", 
        ext: "cpp", 
        judge0Id: 105, // C++ GCC 14.1.0
        default: `// C++ Practice\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, Pioneer!" << endl;\n    int num = 42;\n    cout << "Answer to life is " << num << endl;\n    return 0;\n}` 
    },
    { 
        id: "java", 
        name: "Java", 
        ext: "java", 
        judge0Id: 91, // Java JDK 17.0.6
        default: `// Java Practice\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Pioneer!");\n        int fact = 1;\n        for (int i = 1; i <= 5; i++) {\n            fact *= i;\n        }\n        System.out.println("Factorial of 5 is " + fact);\n    }\n}` 
    }
]

export default function StudentPracticePage() {
    const [selectedLang, setSelectedLang] = useState(LANGUAGES[0])
    const [code, setCode] = useState(selectedLang.default)
    const [stdout, setStdout] = useState("")
    const [stderr, setStderr] = useState("")
    const [isRunning, setIsRunning] = useState(false)
    const [stdin, setStdin] = useState("")
    
    // Lockdown States
    const [started, setStarted] = useState(false)
    const [completed, setCompleted] = useState(false)
    const [warnings, setWarnings] = useState(0)
    const [fullscreenActive, setFullscreenActive] = useState(false)
    const warningRef = useRef(0)

    // Editor styling helper
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [lineCount, setLineCount] = useState(1)

    useEffect(() => {
        const lines = code.split("\n").length
        setLineCount(lines > 0 ? lines : 1)
    }, [code])

    // 1. Lockdown Mode Listeners
    useEffect(() => {
        if (!started || completed) return

        // Context Menu Block
        const blockContextMenu = (e: MouseEvent) => e.preventDefault()
        document.addEventListener("contextmenu", blockContextMenu)

        // Keydown Protection (Ctrl+C, Ctrl+V, F12, Ctrl+U, Ctrl+Shift+I)
        const blockKeys = (e: KeyboardEvent) => {
            const isCtrl = e.ctrlKey || e.metaKey
            if (
                (isCtrl && e.key === "c") || 
                (isCtrl && e.key === "v") || 
                (isCtrl && e.key === "u") || 
                e.key === "F12" ||
                (isCtrl && e.shiftKey && e.key === "I") ||
                (isCtrl && e.shiftKey && e.key === "i") ||
                e.key === "Alt" ||
                e.key === "Meta"
            ) {
                e.preventDefault()
                triggerWarning("Unauthorized key shortcut blocked.")
            }
        }
        document.addEventListener("keydown", blockKeys)

        // Tab switches & Window Blur Protection
        const handleVisibilityChange = () => {
            if (document.hidden) {
                triggerWarning("Window switched / Tab changed detected.")
            }
        }
        const handleWindowBlur = () => {
            triggerWarning("Practice window lost focus.")
        }
        document.addEventListener("visibilitychange", handleVisibilityChange)
        window.addEventListener("blur", handleWindowBlur)

        // Fullscreen Change Detector
        const handleFullscreenChange = () => {
            const isFull = !!document.fullscreenElement
            setFullscreenActive(isFull)
            if (!isFull && started && !completed) {
                triggerWarning("Exited full screen mode.")
            }
        }
        document.addEventListener("fullscreenchange", handleFullscreenChange)

        return () => {
            document.removeEventListener("contextmenu", blockContextMenu)
            document.removeEventListener("keydown", blockKeys)
            document.removeEventListener("visibilitychange", handleVisibilityChange)
            window.removeEventListener("blur", handleWindowBlur)
            document.removeEventListener("fullscreenchange", handleFullscreenChange)
        }
    }, [started, completed])

    const triggerWarning = (reason: string) => {
        if (completed) return

        const updatedCount = warningRef.current + 1
        warningRef.current = updatedCount
        setWarnings(updatedCount)

        toast.warning(`LOCKDOWN ALERT: ${reason} (Warning ${updatedCount}/3)`)

        if (updatedCount >= 3) {
            toast.error("Practice session terminated automatically due to repeated lockdown violations.")
            setCompleted(true)
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {})
            }
        }
    }

    const enterFullscreen = async () => {
        try {
            const elem = document.documentElement
            if (elem.requestFullscreen) {
                await elem.requestFullscreen()
            }
            setFullscreenActive(true)
            setStarted(true)
        } catch (e) {
            toast.error("Failed to request full-screen. Please check your browser settings.")
        }
    }

    const handleLanguageChange = (langId: string) => {
        const lang = LANGUAGES.find(l => l.id === langId)
        if (lang) {
            setSelectedLang(lang)
            setCode(lang.default)
            setStdout("")
            setStderr("")
        }
    }

    const handleReset = () => {
        if (window.confirm("Reset editor to default template? Your current code will be lost.")) {
            setCode(selectedLang.default)
            setStdout("")
            setStderr("")
        }
    }

    const handleRunCode = async () => {
        setIsRunning(true)
        setStdout("")
        setStderr("")

        try {
            // Hit Judge0 CE Server Action
            const res = await runCodeAction(selectedLang.judge0Id, code, stdin)
            setIsRunning(false)

            if (res.success && res.result) {
                const runResult = res.result
                if (runResult.compile_output) {
                    setStderr(runResult.compile_output)
                    toast.error("Compilation error detected.")
                } else if (runResult.stderr) {
                    setStderr(runResult.stderr)
                    toast.error("Runtime error detected.")
                } else {
                    setStdout(runResult.stdout || "Code executed successfully with no stdout output.")
                    toast.success("Execution completed.")
                }
            } else {
                toast.error(res.error || "Code execution server returned an error.")
            }
        } catch (error) {
            setIsRunning(false)
            setStderr("Error connecting to compiler API server. Please check your network connection.")
            toast.error("Network error during compile.")
        }
    }

    // Keyboard tab indent support in textarea
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Tab") {
            e.preventDefault()
            const start = e.currentTarget.selectionStart
            const end = e.currentTarget.selectionEnd
            
            const newValue = code.substring(0, start) + "    " + code.substring(end)
            setCode(newValue)
            
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4
                }
            }, 0)
        }
    }

    // Lobby / Entrance View
    if (!started) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center p-4">
                <GlassCard className="w-full max-w-xl p-8 border border-themeGrey space-y-6 text-center">
                    <div className="flex justify-center">
                        <div className="p-4 bg-zinc-900 border border-themeGrey rounded-2xl text-amber-400">
                            <Lock size={40} className="animate-pulse" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight text-white">Enter Practice Lockdown Mode</h2>
                        <p className="text-xs text-themeTextGrey">Secure learning environment guidelines</p>
                    </div>

                    <div className="text-left bg-zinc-950/60 p-5 rounded-2xl border border-themeGrey/60 space-y-3.5 text-xs text-themeTextGrey leading-relaxed">
                        <p className="font-bold text-white flex items-center gap-1.5 mb-1 text-sm">
                            <ShieldAlert size={16} className="text-amber-400" />
                            Lockdown Rules & Instructions:
                        </p>
                        <ul className="list-disc pl-4 space-y-2">
                            <li>To guarantee compliance, the practice workspace executes in **Full Screen Mode**.</li>
                            <li>Do not minimize, change tabs, resize, or exit the browser focus. Doing so registers a violation warning.</li>
                            <li>Right-clicks, clipboard copying/pasting, and standard debugger keys (F12) are blocked.</li>
                            <li>If you register **3 warnings**, your practice session will be terminated and locked.</li>
                        </ul>
                    </div>

                    <Button
                        onClick={enterFullscreen}
                        className="w-full py-6 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-sm flex items-center justify-center gap-2 group"
                    >
                        <Eye size={16} /> Enter Fullscreen & Start Practice
                    </Button>
                </GlassCard>
            </div>
        )
    }

    // Violation Terminated View
    if (completed) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center p-4">
                <GlassCard className="w-full max-w-xl p-8 border border-red-500/20 text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-full text-red-500">
                            <ShieldAlert size={48} className="animate-bounce" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-3xl font-extrabold text-white tracking-tight">Practice Blocked</h2>
                        <p className="text-xs text-red-400">Lockdown Violation limit exceeded (3/3)</p>
                    </div>

                    <p className="text-sm text-themeTextGrey leading-relaxed max-w-md mx-auto">
                        Your session has been terminated automatically due to repeated window switches or exiting fullscreen mode. Please contact your instructor.
                    </p>

                    <Button
                        onClick={() => {
                            warningRef.current = 0
                            setWarnings(0)
                            setCompleted(false)
                            setStarted(false)
                        }}
                        variant="outline"
                        className="px-6 py-5 border border-themeGrey hover:bg-themeGrey text-white rounded-xl"
                    >
                        Restart Practice Session
                    </Button>
                </GlassCard>
            </div>
        )
    }

    // Active Editor Workspace View
    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center shrink-0 gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Code size={24} /> Practice Compiler
                    </h1>
                    <p className="text-xs text-themeTextGrey">Write and execute scripts securely in lockdown mode.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Warnings Badge */}
                    <span className={`text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 border ${
                        warnings > 0 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                    }`}>
                        <AlertTriangle size={14} /> Warnings: {warnings} / 3
                    </span>

                    {/* Reset Editor */}
                    <button
                        onClick={handleReset}
                        className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-themeTextGrey hover:text-white hover:border-zinc-700 transition-all"
                        title="Reset Code Template"
                    >
                        <RefreshCw size={14} />
                    </button>

                    {/* Language Selector */}
                    <div className="relative">
                        <select
                            value={selectedLang.id}
                            onChange={(e) => handleLanguageChange(e.target.value)}
                            className="appearance-none bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold px-4 pr-10 py-2.5 rounded-xl focus:outline-none cursor-pointer focus:ring-1 focus:ring-white/20"
                        >
                            {LANGUAGES.map(l => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-themeTextGrey pointer-events-none" />
                    </div>

                    {/* Run Button */}
                    <Button
                        onClick={handleRunCode}
                        disabled={isRunning}
                        className="bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl flex items-center gap-1.5 px-5 py-4 text-xs"
                    >
                        {isRunning ? (
                            <>
                                <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-black"></span>
                                Executing...
                            </>
                        ) : (
                            <>
                                <Play size={12} fill="currentColor" /> Run Code
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Split Editor and Terminal Workspace */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[500px]">
                {/* Code Editor Window */}
                <GlassCard className="border border-themeGrey flex flex-col overflow-hidden h-full">
                    {/* Window Header */}
                    <div className="bg-black/60 px-4 py-2.5 border-b border-themeGrey/60 flex items-center justify-between shrink-0">
                        <span className="text-xs font-semibold text-themeTextGrey uppercase tracking-wider flex items-center gap-1.5">
                            <Code size={14} /> main.{selectedLang.ext}
                        </span>
                        <div className="flex gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-zinc-800" />
                            <span className="w-2 h-2 rounded-full bg-zinc-800" />
                            <span className="w-2 h-2 rounded-full bg-zinc-800" />
                        </div>
                    </div>

                    {/* Editor Textarea with line numbers */}
                    <div className="flex-1 flex bg-black/20 font-mono text-sm leading-relaxed overflow-hidden p-4 h-full">
                        {/* Line Numbers column */}
                        <div className="w-10 text-right pr-4 text-zinc-600 select-none border-r border-themeGrey/20 shrink-0">
                            {Array.from({ length: lineCount }).map((_, i) => (
                                <div key={i} className="h-6">{i + 1}</div>
                            ))}
                        </div>
                        {/* Code input */}
                        <textarea
                            ref={textareaRef}
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1 bg-transparent border-none outline-none resize-none pl-4 text-white font-mono placeholder-zinc-700 h-full overflow-y-auto"
                            spellCheck={false}
                        />
                    </div>
                </GlassCard>

                {/* Output Console / Stdin Input */}
                <div className="flex flex-col gap-6 h-full">
                    {/* Stdin Terminal Input */}
                    <GlassCard className="border border-themeGrey flex flex-col h-1/3 min-h-[150px]">
                        <div className="bg-black/40 px-4 py-2 border-b border-themeGrey/60 shrink-0 flex items-center">
                            <span className="text-xs font-semibold text-themeTextGrey uppercase tracking-wider">
                                Standard Input (stdin)
                            </span>
                        </div>
                        <textarea
                            value={stdin}
                            onChange={(e) => setStdin(e.target.value)}
                            placeholder="Provide standard inputs for console scanning / code readings here..."
                            className="flex-1 bg-black/10 p-4 font-mono text-xs border-none outline-none resize-none text-white placeholder-zinc-850"
                        />
                    </GlassCard>

                    {/* Stdout/Stderr Terminal Output */}
                    <GlassCard className="border border-themeGrey flex flex-col flex-1 bg-zinc-950/80 overflow-hidden">
                        {/* Terminal Header */}
                        <div className="bg-black/60 px-4 py-3 border-b border-themeGrey/60 flex items-center justify-between shrink-0">
                            <span className="text-xs font-semibold text-themeTextGrey uppercase tracking-wider flex items-center gap-1.5">
                                <Terminal size={14} /> Output Console
                            </span>
                        </div>

                        {/* Terminal screen */}
                        <div className="flex-1 p-5 font-mono text-xs overflow-y-auto leading-relaxed select-text">
                            {isRunning ? (
                                <div className="text-themeTextGrey animate-pulse">Running compilation script...</div>
                            ) : stderr ? (
                                <pre className="text-rose-450 whitespace-pre-wrap">{stderr}</pre>
                            ) : stdout ? (
                                <pre className="text-emerald-450 whitespace-pre-wrap">{stdout}</pre>
                            ) : (
                                <div className="text-zinc-700 italic">No output. Click "Run Code" above to execute.</div>
                            )}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    )
}
