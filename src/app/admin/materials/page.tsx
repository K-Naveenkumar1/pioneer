"use client"

import React, { useState, useEffect, useTransition } from "react"
import { 
    FileText, 
    UploadCloud, 
    Plus, 
    Lock, 
    Unlock, 
    Trash2, 
    RefreshCw, 
    FileDown, 
    BookOpen, 
    Image as ImageIcon,
    ChevronLeft,
    CheckCircle,
    Eye
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import GlassCard from "@/components/global/glass-card"
import { 
    adminGetMaterialsAction, 
    adminCreateMaterialAction, 
    adminDeleteMaterialAction, 
    adminToggleLockMaterialAction,
    adminAddPageAction,
    adminDeletePageAction,
    adminToggleLockPageAction,
    adminGeneratePagesFromAttachmentAction
} from "@/actions/material-actions"

export default function AdminMaterialsPage() {
    const [materials, setMaterials] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isPendingAction, startTransitionAction] = useTransition()

    // Create Material States
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newTitle, setNewTitle] = useState("")
    const [newDescription, setNewDescription] = useState("")
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploadingFile, setUploadingFile] = useState(false)

    // Workspace / Page Management States
    const [activeMaterial, setActiveMaterial] = useState<any | null>(null)
    const [pageNumber, setPageNumber] = useState(1)
    const [pageTitle, setPageTitle] = useState("")
    const [pageContent, setPageContent] = useState("")
    const [pageImage, setPageImage] = useState<File | null>(null)
    const [pageLocked, setPageLocked] = useState(false)
    const [uploadingPageImage, setUploadingPageImage] = useState(false)
    const [isGeneratingPages, setIsGeneratingPages] = useState(false)

    useEffect(() => {
        loadMaterials()
    }, [])

    const loadMaterials = async () => {
        setLoading(true)
        const res = await adminGetMaterialsAction()
        if (res.success && res.materials) {
            setMaterials(res.materials)
            // Sync active material workspace if currently open
            if (activeMaterial) {
                const updated = res.materials.find((m: any) => m.id === activeMaterial.id)
                setActiveMaterial(updated || null)
            }
        } else {
            toast.error(res.error || "Failed to load course materials")
        }
        setLoading(false)
    }

    const handleCreateMaterial = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTitle.trim()) {
            toast.error("Please enter a title")
            return
        }

        setUploadingFile(true)
        try {
            let fileUrl: string | null = null
            let fileName: string | null = null

            if (selectedFile) {
                const formData = new FormData()
                formData.append("file", selectedFile)
                const uploadRes = await fetch("/api/upload", {
                    method: "POST",
                    body: formData
                }).then(r => r.json())
                
                if (uploadRes.success) {
                    fileUrl = uploadRes.fileUrl || null
                    fileName = uploadRes.fileName || null
                } else {
                    toast.error(uploadRes.error || "Failed to upload file")
                    setUploadingFile(false)
                    return
                }
            }

            const res = await adminCreateMaterialAction(
                newTitle,
                newDescription || null,
                fileUrl,
                fileName
            )

            if (res.success) {
                toast.success("Course material created successfully")
                setNewTitle("")
                setNewDescription("")
                setSelectedFile(null)
                setIsCreateOpen(false)
                loadMaterials()
            } else {
                toast.error(res.error || "Failed to create course material")
            }
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "An unexpected error occurred during creation")
        } finally {
            setUploadingFile(false)
        }
    }

    const handleDeleteMaterial = async (id: string) => {
        if (!confirm("Are you sure you want to delete this course material? All pages will also be permanently deleted.")) return

        startTransitionAction(async () => {
            const res = await adminDeleteMaterialAction(id)
            if (res.success) {
                toast.success(res.message)
                if (activeMaterial?.id === id) {
                    setActiveMaterial(null)
                }
                loadMaterials()
            } else {
                toast.error(res.error || "Failed to delete course material")
            }
        })
    }

    const handleGeneratePagesFromAttachment = async () => {
        if (!activeMaterial) return
        if (!confirm("Are you sure you want to auto-generate pages from the uploaded Word Document? This will replace any existing manually added pages for this material.")) return

        setIsGeneratingPages(true)
        const res = await adminGeneratePagesFromAttachmentAction(activeMaterial.id)
        setIsGeneratingPages(false)

        if (res.success) {
            toast.success(res.message || "Pages generated successfully!")
            loadMaterials()
        } else {
            toast.error(res.error || "Failed to generate pages")
        }
    }

    const handleToggleLockMaterial = async (id: string, currentLocked: boolean) => {
        const targetLock = !currentLocked
        const res = await adminToggleLockMaterialAction(id, targetLock)
        if (res.success) {
            toast.success(res.message)
            loadMaterials()
        } else {
            toast.error(res.error || "Failed to change lock status")
        }
    }

    const handleAddPage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!activeMaterial) return

        setUploadingPageImage(true)
        try {
            let imageUrl: string | null = null

            if (pageImage) {
                const formData = new FormData()
                formData.append("file", pageImage)
                const uploadRes = await fetch("/api/upload", {
                    method: "POST",
                    body: formData
                }).then(r => r.json())
                
                if (uploadRes.success) {
                    imageUrl = uploadRes.fileUrl || null
                } else {
                    toast.error(uploadRes.error || "Failed to upload page image")
                    setUploadingPageImage(false)
                    return
                }
            }

            const res = await adminAddPageAction(
                activeMaterial.id,
                pageNumber,
                pageTitle || null,
                pageContent || null,
                imageUrl,
                pageLocked
            )

            if (res.success) {
                toast.success("Page added successfully")
                setPageTitle("")
                setPageContent("")
                setPageImage(null)
                setPageLocked(false)
                // Auto increment page number
                setPageNumber(prev => prev + 1)
                loadMaterials()
            } else {
                toast.error(res.error || "Failed to add page")
            }
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "An unexpected error occurred while adding page")
        } finally {
            setUploadingPageImage(false)
        }
    }

    const handleDeletePage = async (pageId: string) => {
        if (!confirm("Are you sure you want to delete this page?")) return
        const res = await adminDeletePageAction(pageId)
        if (res.success) {
            toast.success(res.message)
            loadMaterials()
        } else {
            toast.error(res.error || "Failed to delete page")
        }
    }

    const handleToggleLockPage = async (pageId: string, currentLocked: boolean) => {
        const targetLock = !currentLocked
        const res = await adminToggleLockPageAction(pageId, targetLock)
        if (res.success) {
            toast.success(res.message)
            loadMaterials()
        } else {
            toast.error(res.error || "Failed to change page lock status")
        }
    }

    const openWorkspace = (material: any) => {
        setActiveMaterial(material)
        // Set next page number naturally
        const maxPage = material.pages?.reduce((max: number, p: any) => Math.max(max, p.pageNumber), 0) || 0
        setPageNumber(maxPage + 1)
    }

    return (
        <div className="space-y-8 select-text">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                        <BookOpen size={28} /> Course Materials Manager
                    </h1>
                    <p className="text-sm text-themeTextGrey">Upload resources, create interactive slides, and configure lock settings for students.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => setIsCreateOpen(prev => !prev)}
                        className="bg-white hover:bg-zinc-200 text-black font-semibold flex items-center gap-1.5 py-2.5 px-4 rounded-xl text-xs"
                    >
                        <Plus size={14} /> New Material
                    </Button>
                    <button
                        onClick={loadMaterials}
                        className="p-2.5 bg-zinc-900 border border-themeGrey rounded-xl text-themeTextGrey hover:text-white hover:border-zinc-700 transition-all"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Create Material Card */}
            {isCreateOpen && (
                <GlassCard className="p-6 border border-zinc-800 bg-zinc-950/60 max-w-2xl">
                    <h3 className="text-lg font-bold text-white mb-4">Create New Course Material</h3>
                    <form onSubmit={handleCreateMaterial} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">Material Title</label>
                            <input
                                type="text"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="e.g., Intro to Javascript Basics"
                                className="w-full px-4 py-3 bg-black/40 border border-themeGrey rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">Description</label>
                            <textarea
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                placeholder="Describe the topics covered in this material..."
                                rows={3}
                                className="w-full px-4 py-3 bg-black/40 border border-themeGrey rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">Attachments (Optional)</label>
                            <div className="border border-dashed border-themeGrey/80 hover:border-zinc-500 rounded-xl p-6 text-center cursor-pointer transition-all relative">
                                <input
                                    type="file"
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <UploadCloud size={28} className="mx-auto text-themeTextGrey mb-2" />
                                {selectedFile ? (
                                    <div>
                                        <p className="text-xs text-white font-medium truncate">{selectedFile.name}</p>
                                        <p className="text-[10px] text-zinc-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-xs text-themeTextGrey">Click to upload file (PDF, PPT, DOCX, ZIP, etc.)</p>
                                        <p className="text-[10px] text-zinc-600">Students can download this attachment directly</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateOpen(false)}
                                className="border-zinc-800 text-zinc-400 hover:text-white"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={uploadingFile}
                                className="bg-white hover:bg-zinc-200 text-black font-semibold"
                            >
                                {uploadingFile ? "Uploading..." : "Create Material"}
                            </Button>
                        </div>
                    </form>
                </GlassCard>
            )}

            {/* Split Screen Panel for Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Materials Directory (col span 5 or 12) */}
                <div className={`${activeMaterial ? "lg:col-span-5" : "lg:col-span-12"} space-y-4`}>
                    <h3 className="text-lg font-bold text-white">Materials Directory</h3>
                    {loading ? (
                        <div className="min-h-[20vh] flex items-center justify-center">
                            <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></span>
                        </div>
                    ) : materials.length === 0 ? (
                        <GlassCard className="p-8 text-center text-themeTextGrey text-sm border border-themeGrey">
                            No course materials created yet. Click "New Material" to get started.
                        </GlassCard>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {materials.map((material) => {
                                const isCurrentActive = activeMaterial?.id === material.id
                                return (
                                    <GlassCard
                                        key={material.id}
                                        className={`p-5 border transition-all flex flex-col justify-between ${
                                            isCurrentActive 
                                                ? "border-white bg-zinc-900/30" 
                                                : "border-themeGrey/60 hover:border-zinc-700 bg-zinc-950/20"
                                        }`}
                                    >
                                        <div>
                                            <div className="flex justify-between items-start gap-2">
                                                <div>
                                                    <h4 className="font-bold text-base text-white">{material.title}</h4>
                                                    <p className="text-xs text-themeTextGrey mt-1 line-clamp-2">{material.description || "No description provided."}</p>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <button
                                                        onClick={() => handleToggleLockLock(material.id, material.isLocked)}
                                                        className={`p-2 rounded-lg border transition-all ${
                                                            material.isLocked
                                                                ? "border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                                                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                                        }`}
                                                        title={material.isLocked ? "Unlock entire material" : "Lock entire material"}
                                                    >
                                                        {material.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteMaterial(material.id)}
                                                        disabled={isPendingAction}
                                                        className="p-2 rounded-lg border border-themeGrey/60 bg-zinc-950 hover:bg-red-500/10 hover:text-red-400 text-themeTextGrey transition-all"
                                                        title="Delete material"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {material.fileUrl && (
                                                <div className="flex items-center gap-2 mt-4 bg-black/40 border border-themeGrey/40 p-2.5 rounded-xl text-xs w-fit max-w-full">
                                                    <FileText size={14} className="text-zinc-400 shrink-0" />
                                                    <span className="text-zinc-300 font-mono truncate max-w-[200px]" title={material.fileName}>
                                                        {material.fileName}
                                                    </span>
                                                    <a
                                                        href={material.fileUrl}
                                                        download={material.fileName}
                                                        className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 ml-2"
                                                    >
                                                        <FileDown size={12} /> Download
                                                    </a>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between border-t border-themeGrey/40 pt-4 mt-5">
                                            <span className="text-[10px] text-zinc-500 font-medium">
                                                Pages: <strong className="text-zinc-300 font-bold">{material.pages?.length || 0}</strong>
                                            </span>
                                            <Button
                                                onClick={() => openWorkspace(material)}
                                                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                                                    isCurrentActive
                                                        ? "bg-zinc-800 text-white border border-zinc-700 cursor-default"
                                                        : "bg-white text-black hover:bg-zinc-200"
                                                }`}
                                            >
                                                Manage Pages & Locks
                                            </Button>
                                        </div>
                                    </GlassCard>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Pages Workspace (col span 7) */}
                {activeMaterial && (
                    <div className="lg:col-span-7 space-y-6">
                        <div className="flex items-center justify-between border-b border-themeGrey/40 pb-4">
                            <div>
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Workspace</span>
                                <h3 className="text-lg font-bold text-white truncate max-w-md">
                                    {activeMaterial.title}
                                </h3>
                            </div>
                            <button
                                onClick={() => setActiveMaterial(null)}
                                className="flex items-center gap-1 text-xs text-themeTextGrey hover:text-white"
                            >
                                <ChevronLeft size={16} /> Close
                            </button>
                        </div>

                        {/* Lock warning */}
                        {activeMaterial.isLocked && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                                <Lock size={16} />
                                <span><strong>Entire Material is Locked</strong>: Students cannot view pages or download attachments, regardless of individual page locks.</span>
                            </div>
                        )}

                        {/* Add Page Form */}
                        <GlassCard className="p-5 border border-zinc-800 bg-zinc-950/40">
                            <h4 className="font-bold text-sm text-white mb-4">Add Interactive Page / Slide</h4>
                            <form onSubmit={handleAddPage} className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-1">
                                        <label className="block text-[10px] font-semibold text-themeTextGrey uppercase mb-1.5">Page No</label>
                                        <input
                                            type="number"
                                            value={pageNumber}
                                            onChange={(e) => setPageNumber(parseInt(e.target.value) || 1)}
                                            min={1}
                                            className="w-full px-3 py-2 bg-black/40 border border-themeGrey rounded-lg text-white text-sm"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-semibold text-themeTextGrey uppercase mb-1.5">Page Title (Optional)</label>
                                        <input
                                            type="text"
                                            value={pageTitle}
                                            onChange={(e) => setPageTitle(e.target.value)}
                                            placeholder="Slide heading..."
                                            className="w-full px-3 py-2 bg-black/40 border border-themeGrey rounded-lg text-white text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-semibold text-themeTextGrey uppercase mb-1.5">Text Content (Optional)</label>
                                    <textarea
                                        value={pageContent}
                                        onChange={(e) => setPageContent(e.target.value)}
                                        placeholder="Add notes, code snippets, or slide content here..."
                                        rows={4}
                                        className="w-full px-3 py-2 bg-black/40 border border-themeGrey rounded-lg text-white text-sm resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                    <div>
                                        <label className="block text-[10px] font-semibold text-themeTextGrey uppercase mb-1.5">Slide Image (Optional)</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setPageImage(e.target.files?.[0] || null)}
                                            className="w-full text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 file:cursor-pointer"
                                        />
                                    </div>

                                    <div className="flex items-center h-full pt-4 md:pt-0">
                                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-themeTextWhite hover:text-white">
                                            <input
                                                type="checkbox"
                                                checked={pageLocked}
                                                onChange={(e) => setPageLocked(e.target.checked)}
                                                className="rounded border-zinc-700 bg-zinc-900 text-rose-500 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                                            />
                                            <span className={pageLocked ? "text-rose-400 font-bold" : "text-zinc-400"}>Lock Page by Default</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button
                                        type="submit"
                                        disabled={uploadingPageImage}
                                        className="bg-white hover:bg-zinc-200 text-black text-xs font-semibold py-2 px-4 rounded-xl flex items-center gap-1.5"
                                    >
                                        <Plus size={12} /> {uploadingPageImage ? "Saving..." : "Add Page"}
                                    </Button>
                                </div>
                            </form>
                        </GlassCard>

                        {/* Page list */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center select-none">
                                <h4 className="font-bold text-sm text-white">Pages Outline</h4>
                                {activeMaterial.fileUrl && activeMaterial.fileUrl.endsWith(".docx") && (
                                    <button
                                        type="button"
                                        onClick={handleGeneratePagesFromAttachment}
                                        disabled={isGeneratingPages}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px] py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50"
                                    >
                                        <RefreshCw size={10} className={isGeneratingPages ? "animate-spin" : ""} />
                                        {isGeneratingPages ? "Generating..." : "Auto-Generate from Docx"}
                                    </button>
                                )}
                            </div>
                            {!activeMaterial.pages || activeMaterial.pages.length === 0 ? (
                                <div className="p-6 text-center text-zinc-500 text-xs italic bg-zinc-950/20 border border-themeGrey/40 rounded-xl">
                                    No pages added yet. Click "Auto-Generate" or use the form above to add pages.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {activeMaterial.pages.map((page: any) => (
                                        <div 
                                            key={page.id}
                                            className="bg-zinc-950/40 border border-themeGrey/40 rounded-xl p-4 flex flex-col md:flex-row justify-between gap-4"
                                        >
                                            <div className="flex gap-3 items-start overflow-hidden">
                                                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                                    {page.pageNumber}
                                                </div>
                                                <div className="space-y-1.5 overflow-hidden">
                                                    {page.title && (
                                                        <h5 className="font-bold text-xs text-white truncate">{page.title}</h5>
                                                    )}
                                                    {page.content && (
                                                        <p className="text-[10px] text-zinc-400 line-clamp-2 font-mono bg-black/20 p-2 rounded border border-themeGrey/20">
                                                            {page.content.replace(/<[^>]*>/g, '')}
                                                        </p>
                                                    )}
                                                    {page.imageUrl && (
                                                        <div className="flex items-center gap-1 text-[9px] text-zinc-500 font-medium">
                                                            <ImageIcon size={10} /> Image Attached
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                                <label className="flex items-center gap-1.5 cursor-pointer select-none text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-lg">
                                                    <input
                                                        type="checkbox"
                                                        checked={page.isLocked}
                                                        onChange={() => handleToggleLockPage(page.id, page.isLocked)}
                                                        className="rounded-full border-zinc-700 bg-zinc-900 text-rose-500 focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer"
                                                    />
                                                    <span className={page.isLocked ? "text-rose-400 font-bold" : "text-zinc-500"}>
                                                        {page.isLocked ? "Locked" : "Unlocked"}
                                                    </span>
                                                </label>
                                                <button
                                                    onClick={() => handleDeletePage(page.id)}
                                                    className="p-1.5 rounded-lg border border-themeGrey/60 bg-zinc-950 hover:bg-red-500/10 hover:text-red-400 text-zinc-500 hover:border-red-500/20 transition-all"
                                                    title="Delete Page"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )

    // Helper wrapper because name shadowing or conflict
    function handleToggleLockLock(id: string, currentLock: boolean) {
        handleToggleLockMaterial(id, currentLock)
    }
}
