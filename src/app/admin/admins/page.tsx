"use client"

import React, { useEffect, useState } from "react"
import {
    adminGetAdminsAction,
    adminCreateClassAdminAction,
    adminEditAdminAction,
    adminDeleteAdminAction,
} from "@/actions/admin-management-actions"
import {
    ShieldCheck,
    Plus,
    User,
    Edit2,
    Trash2,
    Lock,
    School,
    AlertCircle,
    CheckCircle2,
    Loader2,
} from "lucide-react"

type AdminItem = {
    id: string
    username: string
    role: string
    classId: string | null
    createdAt: Date | string
    class?: {
        id: string
        name: string
    } | null
}

type ClassItem = {
    id: string
    name: string
}

export default function ManageAdminsPage() {
    const [loading, setLoading] = useState(true)
    const [admins, setAdmins] = useState<AdminItem[]>([])
    const [classes, setClasses] = useState<ClassItem[]>([])
    const [error, setError] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)

    // Modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [editingAdmin, setEditingAdmin] = useState<AdminItem | null>(null)
    const [deletingAdmin, setDeletingAdmin] = useState<AdminItem | null>(null)
    const [submitting, setSubmitting] = useState(false)

    // Form inputs
    const [formUsername, setFormUsername] = useState("")
    const [formPassword, setFormPassword] = useState("")
    const [formClassId, setFormClassId] = useState("")

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        setError(null)
        const res = await adminGetAdminsAction()
        if (!res.success) {
            setError(res.error || "Failed to load admins")
        } else {
            setAdmins(res.admins || [])
            setClasses(res.classes || [])
        }
        setLoading(false)
    }

    const openCreateModal = () => {
        setFormUsername("")
        setFormPassword("")
        setFormClassId("")
        setError(null)
        setSuccessMsg(null)
        setIsCreateOpen(true)
    }

    const openEditModal = (admin: AdminItem) => {
        setEditingAdmin(admin)
        setFormUsername(admin.username)
        setFormPassword("")
        setFormClassId(admin.classId || "")
        setError(null)
        setSuccessMsg(null)
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formUsername.trim() || !formPassword.trim()) {
            setError("Username and Password are required.")
            return
        }

        setSubmitting(true)
        setError(null)
        setSuccessMsg(null)

        const res = await adminCreateClassAdminAction({
            username: formUsername.trim(),
            password: formPassword.trim(),
            classId: formClassId.trim() || undefined,
        })

        if (!res.success) {
            setError(res.error || "Failed to create admin")
        } else {
            setSuccessMsg(res.message || "Class Admin created successfully!")
            setIsCreateOpen(false)
            await loadData()
        }
        setSubmitting(false)
    }

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingAdmin) return

        if (!formUsername.trim()) {
            setError("Username cannot be empty.")
            return
        }

        setSubmitting(true)
        setError(null)
        setSuccessMsg(null)

        const res = await adminEditAdminAction(editingAdmin.id, {
            username: formUsername.trim(),
            password: formPassword.trim() ? formPassword.trim() : undefined,
            classId: formClassId.trim() || undefined,
        })

        if (!res.success) {
            setError(res.error || "Failed to update admin")
        } else {
            setSuccessMsg(res.message || "Admin updated successfully!")
            setEditingAdmin(null)
            await loadData()
        }
        setSubmitting(false)
    }

    const handleDelete = async () => {
        if (!deletingAdmin) return

        setSubmitting(true)
        setError(null)
        setSuccessMsg(null)

        const res = await adminDeleteAdminAction(deletingAdmin.id)

        if (!res.success) {
            setError(res.error || "Failed to delete admin")
        } else {
            setSuccessMsg(res.message || "Admin deleted successfully!")
            setDeletingAdmin(null)
            await loadData()
        }
        setSubmitting(false)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Top Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2.5">
                        <ShieldCheck className="text-amber-400 w-7 h-7 shrink-0" />
                        Class Administrators
                    </h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        Create, edit, and assign admins to specific classes.
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-all shadow-lg self-start md:self-auto"
                >
                    <Plus size={18} />
                    Create Class Admin
                </button>
            </div>

            {/* Notification Banner */}
            {successMsg && (
                <div className="flex items-center gap-2.5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
                    <CheckCircle2 size={18} className="shrink-0" />
                    <span>{successMsg}</span>
                </div>
            )}
            {error && (
                <div className="flex items-center gap-2.5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
                    <AlertCircle size={18} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Admins Grid / Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {admins.map((adm) => {
                    const isSuper = adm.role === "SUPER_ADMIN"
                    return (
                        <div
                            key={adm.id}
                            className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-zinc-700 transition-all"
                        >
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span
                                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                            isSuper
                                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                                : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                                        }`}
                                    >
                                        {isSuper ? "Super Admin" : "Class Admin"}
                                    </span>
                                    <span className="text-[11px] text-zinc-500">
                                        {new Date(adm.createdAt).toLocaleDateString()}
                                    </span>
                                </div>

                                <div>
                                    <h3 className="font-bold text-lg text-white flex items-center gap-2">
                                        <User size={18} className="text-zinc-400" />
                                        @{adm.username}
                                    </h3>
                                    <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1">
                                        <School size={14} className="text-zinc-500 shrink-0" />
                                        <span>
                                            {isSuper
                                                ? "All Classes (Supervision Access)"
                                                : adm.class?.name
                                                ? `Class: ${adm.class.name}`
                                                : "Unassigned Class"}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Card Actions */}
                            <div className="flex items-center gap-2 pt-3 border-t border-zinc-800">
                                <button
                                    onClick={() => openEditModal(adm)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-all"
                                >
                                    <Edit2 size={14} />
                                    Edit
                                </button>
                                {!isSuper && (
                                    <button
                                        onClick={() => setDeletingAdmin(adm)}
                                        className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-all"
                                        title="Delete Admin"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Create Admin Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <User size={20} className="text-amber-400" />
                                Create New Class Admin
                            </h2>
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="text-zinc-400 hover:text-white text-sm font-semibold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                                    Username *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formUsername}
                                    onChange={(e) => setFormUsername(e.target.value)}
                                    placeholder="e.g. admin_class10"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                                    Password *
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={formPassword}
                                    onChange={(e) => setFormPassword(e.target.value)}
                                    placeholder="Enter login password"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                                    Assign to Class *
                                </label>
                                <select
                                    required
                                    value={formClassId}
                                    onChange={(e) => setFormClassId(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                                >
                                    <option value="">-- Select Assigned Class * --</option>
                                    {classes.map((cls) => (
                                        <option key={cls.id} value={cls.id}>
                                            {cls.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-300 text-xs font-medium hover:bg-zinc-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-zinc-200 disabled:opacity-50"
                                >
                                    {submitting && <Loader2 size={14} className="animate-spin" />}
                                    Create Admin
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Admin Modal */}
            {editingAdmin && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Edit2 size={18} className="text-amber-400" />
                                Edit Admin @{editingAdmin.username}
                            </h2>
                            <button
                                onClick={() => setEditingAdmin(null)}
                                className="text-zinc-400 hover:text-white text-sm font-semibold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleEdit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formUsername}
                                    onChange={(e) => setFormUsername(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center justify-between">
                                    <span>New Password</span>
                                    <span className="text-zinc-500 text-[11px]">(Leave blank to keep current)</span>
                                </label>
                                <input
                                    type="password"
                                    value={formPassword}
                                    onChange={(e) => setFormPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                                />
                            </div>

                            {editingAdmin.role !== "SUPER_ADMIN" && (
                                <div>
                                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                                        Assigned Class *
                                    </label>
                                    <select
                                        required
                                        value={formClassId}
                                        onChange={(e) => setFormClassId(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="">-- Select Assigned Class * --</option>
                                        {classes.map((cls) => (
                                            <option key={cls.id} value={cls.id}>
                                                {cls.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingAdmin(null)}
                                    className="px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-300 text-xs font-medium hover:bg-zinc-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-zinc-200 disabled:opacity-50"
                                >
                                    {submitting && <Loader2 size={14} className="animate-spin" />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Admin Modal */}
            {deletingAdmin && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm space-y-5 shadow-2xl">
                        <div className="text-center space-y-2">
                            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-white">Delete Admin?</h3>
                            <p className="text-xs text-zinc-400">
                                Are you sure you want to delete <strong className="text-white">@{deletingAdmin.username}</strong>? This action cannot be undone.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setDeletingAdmin(null)}
                                className="flex-1 py-2.5 rounded-xl border border-zinc-800 text-zinc-300 text-xs font-medium hover:bg-zinc-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={submitting}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50"
                            >
                                {submitting && <Loader2 size={14} className="animate-spin" />}
                                Confirm Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
