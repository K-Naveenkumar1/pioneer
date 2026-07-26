"use client"

import React, { useState, useEffect } from "react"
import { 
    BookOpen, 
    FileText, 
    FileDown, 
    Lock, 
    ChevronLeft, 
    ChevronRight, 
    X,
    Eye,
    RefreshCw,
    Image as ImageIcon
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import GlassCard from "@/components/global/glass-card"
import { studentGetMaterialsAction } from "@/actions/material-actions"

export default function StudentMaterialsPage() {
    const [materials, setMaterials] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Viewer states
    const [selectedMaterial, setSelectedMaterial] = useState<any | null>(null)
    const [currentPageIndex, setCurrentPageIndex] = useState(0)

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

    const openViewer = (material: any) => {
        if (material.isLocked) {
            toast.error("This course material is locked by the administrator.")
            return
        }
        if (!material.pages || material.pages.length === 0) {
            toast.info("This material does not have any slides/pages to view yet.")
            return
        }
        setSelectedMaterial(material)
        setCurrentPageIndex(0)
    }

    const closeViewer = () => {
        setSelectedMaterial(null)
        setCurrentPageIndex(0)
    }

    const nextPage = () => {
        if (selectedMaterial && currentPageIndex < selectedMaterial.pages.length - 1) {
            setCurrentPageIndex(prev => prev + 1)
        }
    }

    const prevPage = () => {
        if (currentPageIndex > 0) {
            setCurrentPageIndex(prev => prev - 1)
        }
    }

    const activePage = selectedMaterial?.pages?.[currentPageIndex]

    return (
        <div className="space-y-8 select-text">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                        <BookOpen size={28} /> Course Materials
                    </h1>
                    <p className="text-sm text-themeTextGrey">Access learning resources, view lecture slides, and download materials uploaded by the instructor.</p>
                </div>
                <button
                    onClick={loadMaterials}
                    className="p-2.5 bg-zinc-900 border border-themeGrey rounded-xl text-themeTextGrey hover:text-white hover:border-zinc-700 transition-all self-end md:self-auto"
                >
                    <RefreshCw size={16} />
                </button>
            </div>

            {/* Materials Grid */}
            {loading ? (
                <div className="min-h-[30vh] flex items-center justify-center">
                    <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></span>
                </div>
            ) : materials.length === 0 ? (
                <GlassCard className="p-8 text-center text-themeTextGrey text-sm border border-themeGrey">
                    No course materials uploaded yet. Check back later!
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {materials.map((material) => (
                        <GlassCard
                            key={material.id}
                            className={`p-5 border flex flex-col justify-between transition-all relative overflow-hidden ${
                                material.isLocked 
                                    ? "border-red-500/10 bg-red-950/5/10" 
                                    : "border-themeGrey/60 hover:border-zinc-700 bg-zinc-950/20"
                            }`}
                        >
                            {/* Lock Overlay Badge for whole material */}
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

                            <div className="space-y-4 mt-6">
                                {/* Attachment download (disabled if locked) */}
                                {material.fileUrl && (
                                    <div className="flex items-center justify-between bg-black/40 border border-themeGrey/40 p-2.5 rounded-xl text-xs">
                                        <div className="flex items-center gap-2 overflow-hidden mr-2">
                                            <FileText size={14} className="text-zinc-400 shrink-0" />
                                            <span className="text-zinc-300 font-mono truncate" title={material.fileName}>
                                                {material.fileName}
                                            </span>
                                        </div>
                                        {material.isLocked ? (
                                            <span className="text-zinc-500 cursor-not-allowed flex items-center gap-1 font-semibold shrink-0">
                                                <Lock size={10} /> Locked
                                            </span>
                                        ) : (
                                            <a
                                                href={material.fileUrl}
                                                download={material.fileName}
                                                className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 shrink-0 ml-1"
                                            >
                                                <FileDown size={12} /> Download
                                            </a>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center justify-between border-t border-themeGrey/40 pt-4">
                                    <span className="text-[10px] text-zinc-500 font-semibold select-none">
                                        Pages: <strong className="text-zinc-300">{material.pages?.length || 0}</strong>
                                    </span>

                                    {material.isLocked ? (
                                        <Button
                                            disabled
                                            className="py-1.5 px-3 rounded-lg text-xs bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/40 flex items-center gap-1"
                                        >
                                            <Lock size={12} /> Locked
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => openViewer(material)}
                                            className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-white hover:bg-zinc-200 text-black flex items-center gap-1"
                                        >
                                            <Eye size={12} /> View Slides
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}

            {/* Interactive Document / Page Viewer Modal */}
            {selectedMaterial && activePage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
                    <div className="w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-[85vh] shadow-2xl relative">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-zinc-800 p-4 bg-zinc-900/40">
                            <div>
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Student Slide Viewer</span>
                                <h3 className="text-sm font-bold text-white truncate max-w-md md:max-w-xl">
                                    {selectedMaterial.title}
                                </h3>
                            </div>
                            <button
                                onClick={closeViewer}
                                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Viewer Stage */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col items-center justify-center relative bg-black/20">
                            
                            {/* Locked Overlay */}
                            {activePage.isLocked && (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md p-4">
                                    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 text-center max-w-sm shadow-xl flex flex-col items-center space-y-4">
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full w-12 h-12 flex items-center justify-center">
                                            <Lock size={20} className="animate-pulse" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-base">Page Content Locked</h4>
                                            <p className="text-xs text-zinc-500 mt-1">This page has been locked by the administrator. Please complete required activities or contact support to unlock.</p>
                                        </div>
                                        <span className="text-[10px] font-bold text-red-400/80 bg-red-500/5 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                            Page {activePage.pageNumber} is Locked
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Main Content Container (blurred if page is locked) */}
                            <div 
                                className={`w-full max-w-3xl space-y-6 transition-all duration-300 ${
                                    activePage.isLocked 
                                        ? "blur-xl select-none pointer-events-none filter brightness-50 opacity-20" 
                                        : ""
                                }`}
                            >
                                {/* Slide Heading */}
                                {activePage.title && (
                                    <h4 className="text-xl md:text-2xl font-bold text-white text-center border-b border-zinc-800 pb-3">
                                        {activePage.title}
                                    </h4>
                                )}

                                {/* Slide Image */}
                                {activePage.imageUrl && (
                                    <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/20 max-h-[40vh] flex items-center justify-center">
                                        <img
                                            src={activePage.imageUrl}
                                            alt={activePage.title || "Slide Image"}
                                            className="object-contain max-h-[40vh] w-full"
                                        />
                                    </div>
                                )}

                                {/* Slide Notes / Content */}
                                {activePage.content ? (
                                    <div className="bg-zinc-950/80 border border-zinc-900/60 p-5 rounded-xl text-sm leading-relaxed text-zinc-300 font-normal whitespace-pre-wrap">
                                        {activePage.content}
                                    </div>
                                ) : (
                                    !activePage.imageUrl && (
                                        <p className="text-zinc-500 text-center text-xs italic">No additional notes on this slide.</p>
                                    )
                                )}
                            </div>

                        </div>

                        {/* Modal Footer Controls */}
                        <div className="border-t border-zinc-800 p-4 bg-zinc-900/40 flex items-center justify-between select-none">
                            <Button
                                onClick={prevPage}
                                disabled={currentPageIndex === 0}
                                className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={14} /> Previous
                            </Button>

                            <span className="text-xs text-zinc-400 font-medium">
                                Slide <strong className="text-white font-bold">{currentPageIndex + 1}</strong> of <strong className="text-white font-bold">{selectedMaterial.pages.length}</strong>
                            </span>

                            <Button
                                onClick={nextPage}
                                disabled={currentPageIndex === selectedMaterial.pages.length - 1}
                                className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900 disabled:cursor-not-allowed"
                            >
                                Next <ChevronRight size={14} />
                            </Button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    )
}
