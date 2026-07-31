"use client"

import React, { useState, useEffect } from "react"
import { 
    FileDown, 
    Lock, 
    X,
    Eye,
    RefreshCw
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import GlassCard from "@/components/global/glass-card"
import { studentGetMaterialsAction } from "@/actions/material-actions"

interface Material {
    id: string
    title: string
    description: string | null
    fileUrl: string | null
    fileName: string | null
    isLocked: boolean
    pages?: Array<{
        id: string
        pageNumber: number
        title: string | null
        content: string | null
        imageUrl: string | null
        isLocked: boolean
    }>
}

export default function StudentMaterialsPage() {
    const [materials, setMaterials] = useState<Material[]>([])
    const [loading, setLoading] = useState(true)

    // Viewer state
    const [selectedPdf, setSelectedPdf] = useState<Material | null>(null)

    useEffect(() => {
        loadMaterials()
    }, [])

    const loadMaterials = async () => {
        setLoading(true)
        const res = await studentGetMaterialsAction()
        if (res.success) {
            setMaterials(res.materials || [])
        } else {
            toast.error(res.error || "Failed to load course materials")
        }
        setLoading(false)
    }

    const checkIsOfficeDoc = (fileUrl: string) => {
        const lowerUrl = fileUrl.toLowerCase()
        return (
            lowerUrl.endsWith(".docx") || 
            lowerUrl.endsWith(".doc") || 
            lowerUrl.endsWith(".xlsx") || 
            lowerUrl.endsWith(".xls") || 
            lowerUrl.endsWith(".pptx") || 
            lowerUrl.endsWith(".ppt")
        )
    }

    const getIframeSrc = (fileUrl: string) => {
        if (checkIsOfficeDoc(fileUrl)) {
            const origin = typeof window !== "undefined" ? window.location.origin : ""
            const absoluteUrl = fileUrl.startsWith("http") ? fileUrl : `${origin}${fileUrl}`
            return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`
        }
        return fileUrl
    }

    const isLocalHost = () => {
        if (typeof window === "undefined") return false
        const hostname = window.location.hostname
        return (
            hostname === "localhost" ||
            hostname === "127.0.0.1" ||
            hostname.startsWith("192.168.") ||
            hostname.startsWith("10.") ||
            hostname.endsWith(".local")
        )
    }

    return (
        <div className="space-y-8 select-text">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-5xl font-extrabold tracking-tight text-white pb-4">
                        Course Materials
                    </h1>
                    <p className="text-sm text-themeTextGrey">Access learning resources, view course pages, and download materials uploaded by the instructor.</p>
                </div>
                <button
                    onClick={loadMaterials}
                    className="p-2.5 bg-zinc-900 border border-themeGrey rounded-xl text-themeTextGrey hover:text-white hover:border-zinc-700 transition-all self-end md:self-auto"
                >
                    <RefreshCw size={16} />
                </button>
            </div>

            {/* Split Screen Layout when PDF is selected */}
            {loading ? (
                <div className="min-h-[30vh] flex items-center justify-center">
                    <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></span>
                </div>
            ) : materials.length === 0 ? (
                <GlassCard className="p-8 text-center text-themeTextGrey text-sm border border-themeGrey">
                    No course materials uploaded yet. Check back later!
                </GlassCard>
            ) : (
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    
                    {/* Left Side: Materials List */}
                    <div className={`w-full ${selectedPdf ? "lg:w-2/5 space-y-4" : "w-full"}`}>
                        <div className={selectedPdf ? "space-y-4" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
                            {materials.map((material) => (
                                <GlassCard
                                    key={material.id}
                                    className={`p-5 border flex flex-col justify-between transition-all relative overflow-hidden ${
                                        material.isLocked 
                                            ? "border-red-500/10 bg-red-950/5/10" 
                                            : "border-themeGrey/60 hover:border-zinc-700 bg-zinc-950/20"
                                    }`}
                                >
                                    {/* Lock Overlay Badge */}
                                    {material.isLocked && (
                                        <div className="absolute top-3 right-3 bg-red-500/10 border border-red-500/20 text-red-400 font-semibold px-2 py-1 rounded text-[9px] flex items-center gap-1 select-none">
                                            <Lock size={10} /> Locked
                                        </div>
                                    )}

                                    <div>
                                        <h4 className="font-bold text-base text-white pr-12 truncate">{material.title}</h4>
                                        <p className="text-xs text-themeTextGrey mt-2 line-clamp-3">
                                            {material.description || "No description provided."}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 mt-6 pt-4 border-t border-themeGrey/40">
                                        {material.isLocked ? (
                                            <Button
                                                disabled
                                                className="w-full py-1.5 px-3 rounded-lg text-xs bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/40 flex items-center justify-center gap-1"
                                            >
                                                <Lock size={12} /> Locked
                                            </Button>
                                        ) : (
                                            <>
                                                {material.fileUrl && (
                                                    <Button
                                                        onClick={() => setSelectedPdf(material)}
                                                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                                            selectedPdf?.id === material.id
                                                                ? "bg-zinc-200 text-black hover:bg-zinc-300 border-none"
                                                                : "bg-white text-black hover:bg-zinc-200 border-none"
                                                        }`}
                                                    >
                                                        <Eye size={12} /> View
                                                    </Button>
                                                )}
                                                {material.fileUrl && (
                                                    <Button
                                                        asChild
                                                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 border border-themeGrey text-zinc-300 hover:text-white hover:border-zinc-700 transition-all flex items-center justify-center gap-1.5"
                                                    >
                                                        <a
                                                            href={material.fileUrl}
                                                            download={material.fileName || "download"}
                                                        >
                                                            <FileDown size={12} /> Download
                                                        </a>
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </GlassCard>
                            ))}
                        </div>
                    </div>

                    {/* Right Side: PDF Viewer */}
                    {selectedPdf && selectedPdf.fileUrl && (
                        <div className="w-full lg:w-3/5 lg:sticky lg:top-6 h-[80vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                            {/* PDF Viewer Header */}
                            <div className="flex items-center justify-between border-b border-zinc-850 p-4 bg-zinc-900/40">
                                <div className="overflow-hidden mr-4">
                                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Document Viewer</span>
                                    <h3 className="text-sm font-bold text-white truncate" title={selectedPdf.title}>
                                        {selectedPdf.title}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setSelectedPdf(null)}
                                    className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all shrink-0"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* PDF Viewer Frame */}
                            <div className="flex-1 bg-black/20 p-2 flex flex-col">
                                {checkIsOfficeDoc(selectedPdf.fileUrl) && isLocalHost() ? (
                                    <div className="flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto h-full gap-4">
                                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                                                <line x1="12" x2="12" y1="9" y2="13"/>
                                                <line x1="12" x2="12.01" y1="17" y2="17"/>
                                            </svg>
                                        </div>
                                        <h4 className="text-base font-bold text-white">Localhost Preview Restricted</h4>
                                        <p className="text-xs text-zinc-400 leading-relaxed">
                                            Microsoft Office Viewer cannot preview files from a local address (<code className="bg-zinc-900 px-1 py-0.5 rounded text-zinc-300">localhost</code>).
                                        </p>
                                        <p className="text-xs text-zinc-500 leading-relaxed">
                                            Please download this file to view it on your device, or deploy the application to a public server.
                                        </p>
                                        <Button
                                            asChild
                                            className="mt-2 py-2 px-4 rounded-xl text-xs font-semibold bg-white text-black hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 border-none cursor-pointer"
                                        >
                                            <a
                                                href={selectedPdf.fileUrl}
                                                download={selectedPdf.fileName || "download"}
                                            >
                                                <FileDown size={14} /> Download File
                                            </a>
                                        </Button>
                                    </div>
                                ) : (
                                    <iframe 
                                        src={getIframeSrc(selectedPdf.fileUrl)} 
                                        className="w-full h-full border-none rounded-xl bg-zinc-900"
                                        title={selectedPdf.title}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
