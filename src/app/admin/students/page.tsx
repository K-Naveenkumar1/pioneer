"use client"

import React, { useState, useEffect, useTransition } from "react"
import { 
    Users, 
    UserPlus, 
    Plus, 
    Check, 
    AlertCircle, 
    ShieldCheck, 
    LockKeyhole,
    UploadCloud,
    Trash2
} from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"

import GlassCard from "@/components/global/glass-card"
import { Button } from "@/components/ui/button"
import { 
    adminCreateStudentAction, 
    adminGetStudentsList,
    adminToggleInClassPermission,
    adminAssignWFHAction,
    adminCreateClassAction, 
    adminGetClassesAction, 
    adminUpdateStudentAction, 
    adminBatchCreateStudentsAction,
    adminDeleteStudentsAction
} from "@/actions/admin-actions"

export default function AdminStudentsPage() {
    const [students, setStudents] = useState<any[]>([])
    const [classes, setClasses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isPending, startTransition] = useTransition()
    const [importing, setImporting] = useState(false)

    // Form inputs
    const [rollNo, setRollNo] = useState("")
    const [name, setName] = useState("")
    const [selectedClassId, setSelectedClassId] = useState("")
    const [newClassName, setNewClassName] = useState("")

    // Editing states
    const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
    const [editRollNo, setEditRollNo] = useState("")
    const [editName, setEditName] = useState("")
    const [editDepartment, setEditDepartment] = useState("")
    const [editClassId, setEditClassId] = useState("")
    const [editPassword, setEditPassword] = useState("")

    // Selection state for multi-delete
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])

    // Search query state
    const [searchQuery, setSearchQuery] = useState("")
    // Class filter state
    const [classFilter, setClassFilter] = useState("all")

    const filteredStudents = React.useMemo(() => {
        let list = students

        if (classFilter !== "all") {
            list = list.filter(student => {
                if (classFilter === "none") {
                    return !student.classId
                }
                return student.classId === classFilter
            })
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim()
            list = list.filter(student => 
                (student.name || "").toLowerCase().includes(q) || 
                (student.rollNo || "").toLowerCase().includes(q) ||
                (student.department || "").toLowerCase().includes(q) ||
                (student.class?.name || "").toLowerCase().includes(q)
            )
        }

        // Sort class-wise first, then by rollNo
        return [...list].sort((a, b) => {
            const classA = a.class?.name || ""
            const classB = b.class?.name || ""

            if (classA !== classB) {
                if (!classA) return 1
                if (!classB) return -1
                return classA.localeCompare(classB)
            }
            return (a.rollNo || "").localeCompare(b.rollNo || "")
        })
    }, [students, searchQuery, classFilter])

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        await Promise.all([loadStudents(), loadClasses()])
        setLoading(false)
    }

    const loadStudents = async () => {
        const res = await adminGetStudentsList()
        if (res.success) {
            setStudents(res.students || [])
        } else {
            toast.error(res.error || "Failed to load student profiles")
        }
    }

    const loadClasses = async () => {
        const res = await adminGetClassesAction()
        if (res.success) {
            setClasses(res.classes || [])
        } else {
            toast.error(res.error || "Failed to load classes")
        }
    }

    const handleStartEdit = (student: any) => {
        setEditingStudentId(student.id)
        setEditRollNo(student.rollNo)
        setEditName(student.name)
        setEditDepartment(student.department || "")
        setEditClassId(student.classId || "")
        setEditPassword("")
    }

    const handleSaveEdit = (studentId: string) => {
        if (!editRollNo.trim() || !editName.trim()) {
            toast.error("Roll number and Name are required.")
            return
        }

        startTransition(async () => {
            const res = await adminUpdateStudentAction(
                studentId, 
                editRollNo, 
                editName, 
                editDepartment, 
                editClassId,
                editPassword.trim() !== "" ? editPassword : undefined
            )
            if (res.success) {
                toast.success(res.message || "Student details updated.")
                setEditingStudentId(null)
                loadStudents()
            } else {
                toast.error(res.error || "Failed to update student details.")
            }
        })
    }

    const handleDeleteSelected = async () => {
        if (selectedStudentIds.length === 0) return
        
        if (
            !window.confirm(
                `Are you sure you want to permanently delete the ${selectedStudentIds.length} selected student(s)? This will cascade delete all their attendance records, exam attempts, task submissions, notes, and chat messages.`
            )
        ) {
            return
        }

        startTransition(async () => {
            const res = await adminDeleteStudentsAction(selectedStudentIds)
            if (res.success) {
                toast.success(res.message)
                setSelectedStudentIds([])
                await loadStudents()
            } else {
                toast.error(res.error || "Failed to delete student profiles")
            }
        })
    }

    const handleDeleteSingleStudent = (studentId: string, studentName: string) => {
        if (!window.confirm(`Are you sure you want to delete ${studentName}? This action will permanently remove all their attendance, exams, task submissions, and data.`)) {
            return
        }

        startTransition(async () => {
            const res = await adminDeleteStudentsAction([studentId])
            if (res.success) {
                toast.success(res.message)
                await loadStudents()
            } else {
                toast.error(res.error || "Failed to delete student")
            }
        })
    }

    const handleCreateStudent = (e: React.FormEvent) => {
        e.preventDefault()
        if (!rollNo.trim() || !name.trim()) {
            toast.error("Please fill in roll number and name.")
            return
        }

        startTransition(async () => {
            const res = await adminCreateStudentAction(rollNo, name, undefined, selectedClassId)
            if (res.success) {
                toast.success(res.message || "Student created successfully.")
                // Reset form
                setRollNo("")
                setName("")
                setSelectedClassId("")
                loadStudents()
            } else {
                toast.error(res.error || "Failed to create student")
            }
        })
    }

    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        const file = e.target.files[0]
        setImporting(true)

        const reader = new FileReader()
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result
                const wb = XLSX.read(bstr, { type: 'binary' })
                const wsname = wb.SheetNames[0]
                const ws = wb.Sheets[wsname]
                const data = XLSX.utils.sheet_to_json<any>(ws)

                if (data.length === 0) {
                    toast.error("The selected Excel file is empty.")
                    setImporting(false)
                    return
                }

                // Map excel columns case-insensitively and with partial matching fallbacks
                const mapped = data.map((row: any) => {
                    const keys = Object.keys(row)
                    
                    const findKey = (patterns: string[], fallbacks: string[]) => {
                        const exact = keys.find(k => patterns.includes(k.trim().toLowerCase()))
                        if (exact) return exact
                        return keys.find(k => {
                            const clean = k.trim().toLowerCase()
                            return fallbacks.some(f => clean.includes(f))
                        })
                    }

                    const nameKey = findKey(["name", "fullname", "full name", "student name", "studentname"], ["name"])
                    const rollKey = findKey(["rollno", "roll no", "rollnumber", "roll number", "roll", "symbolno", "symbol no"], ["roll", "symbol"])
                    const classKey = findKey(["class", "batch", "classname", "class name", "batchname", "batch name"], ["class", "batch"])

                    return {
                        name: nameKey ? String(row[nameKey]).trim() : "",
                        rollNo: rollKey ? String(row[rollKey]).trim().toUpperCase() : "",
                        className: classKey ? String(row[classKey]).trim() : ""
                    }
                }).filter(s => s.name && s.rollNo)

                if (mapped.length === 0) {
                    toast.error("No valid student rows found. Make sure columns 'Name' and 'RollNo' exist.")
                    setImporting(false)
                    return
                }

                startTransition(async () => {
                    const res = await adminBatchCreateStudentsAction(mapped)
                    if (res.success) {
                        toast.success(res.message || "Students imported successfully.")
                        loadStudents()
                    } else {
                        toast.error(res.error || "Failed to import students.")
                    }
                })
            } catch (err: any) {
                toast.error("Failed to parse Excel file: " + err.message)
            } finally {
                setImporting(false)
                e.target.value = "" // reset input
            }
        }
        reader.readAsBinaryString(file)
    }

    const handleCreateClass = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newClassName.trim()) {
            toast.error("Class name cannot be empty.")
            return
        }

        startTransition(async () => {
            const res = await adminCreateClassAction(newClassName)
            if (res.success) {
                toast.success(res.message || "Class created successfully.")
                setNewClassName("")
                loadClasses()
            } else {
                toast.error(res.error || "Failed to create class")
            }
        })
    }

    const handleToggleInClass = async (studentId: string, allowed: boolean) => {
        const res = await adminToggleInClassPermission(studentId, allowed)
        if (res.success) {
            toast.success(res.message || "In-class access updated.")
            const fresh = await adminGetStudentsList()
            if (fresh.success) setStudents(fresh.students || [])
        } else {
            toast.error(res.error || "Failed to update permission")
        }
    }

    const handleToggleWFH = async (studentId: string, assigned: boolean) => {
        const defaultDeadline = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
        const res = await adminAssignWFHAction(studentId, assigned, assigned ? defaultDeadline : undefined)
        if (res.success) {
            toast.success(res.message || "Work From Home status updated.")
            const fresh = await adminGetStudentsList()
            if (fresh.success) setStudents(fresh.students || [])
        } else {
            toast.error(res.error || "Failed to update status")
        }
    }

    const handleSaveWFHDeadline = async (studentId: string, deadlineStr: string) => {
        if (!deadlineStr) return
        const res = await adminAssignWFHAction(studentId, true, deadlineStr)
        if (res.success) {
            toast.success("Work From Home deadline updated successfully.")
            const fresh = await adminGetStudentsList()
            if (fresh.success) setStudents(fresh.students || [])
        } else {
            toast.error(res.error || "Failed to update deadline")
        }
    }

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></span>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                    <Users size={26} /> Students Manager
                </h1>
                <p className="text-sm text-themeTextGrey">Manage student accounts, credentials, and check-in session access.</p>
            </div>

            {/* Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form column */}
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <UserPlus size={18} /> Register Student
                    </h3>
                    <GlassCard className="p-6 border border-themeGrey">
                        <form onSubmit={handleCreateStudent} className="space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">
                                    Roll Number
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., 2022CS101"
                                    value={rollNo}
                                    onChange={(e) => setRollNo(e.target.value.toUpperCase())}
                                    className="w-full px-4 py-3 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-themeTextGrey focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-themeTextGrey focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">
                                    Assign Class/Batch
                                </label>
                                <select
                                    value={selectedClassId}
                                    onChange={(e) => setSelectedClassId(e.target.value)}
                                    className="w-full px-4 py-3 bg-black/40 border border-themeGrey rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm cursor-pointer"
                                >
                                    <option value="" className="bg-zinc-950 text-zinc-400">Select Class (Optional)</option>
                                    {classes.map((cls: any) => (
                                        <option key={cls.id} value={cls.id} className="bg-zinc-950 text-white">
                                            {cls.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <p className="text-[10px] text-themeTextGrey leading-normal">
                                * The student's default login password will be automatically set to their **Roll Number**. They will be prompted to reset it on their first login.
                            </p>

                            <Button
                                type="submit"
                                disabled={isPending}
                                className="w-full py-5 bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl"
                            >
                                {isPending ? "Creating..." : "Create Student Profile"}
                            </Button>
                        </form>
                    </GlassCard>

                    {/* Import from Excel Section */}
                    <div className="space-y-6 pt-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <UploadCloud size={18} /> Import Students (Excel)
                        </h3>
                        <GlassCard className="p-6 border border-themeGrey space-y-4">
                            <div className="border border-dashed border-themeGrey rounded-2xl bg-black/30 p-6 text-center hover:bg-black/50 transition-all relative cursor-pointer">
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={handleExcelUpload}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    disabled={importing || isPending}
                                />
                                <div className="space-y-2">
                                    <UploadCloud size={28} className="mx-auto text-themeTextGrey" />
                                    <div className="text-xs text-themeTextWhite font-semibold">
                                        {importing ? "Processing Excel File..." : "Select Excel File (.xlsx)"}
                                    </div>
                                    <div className="text-[10px] text-themeTextGrey font-mono">
                                        Required columns: Name, RollNo, Class
                                    </div>
                                </div>
                            </div>
                            <p className="text-[10px] text-themeTextGrey leading-relaxed">
                                Automatically registers all students. If a class in the sheet doesn't exist, it will be automatically created. Default passwords are set to the students' roll numbers.
                            </p>
                        </GlassCard>
                    </div>

                    {/* Manage Classes Section */}
                    <div className="space-y-6 pt-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Plus size={18} /> Add Class/Batch
                        </h3>
                        <GlassCard className="p-6 border border-themeGrey">
                            <form onSubmit={handleCreateClass} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-themeTextGrey uppercase mb-2">
                                        Class Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g., Batch A, Class 10"
                                        value={newClassName}
                                        onChange={(e) => setNewClassName(e.target.value)}
                                        className="w-full px-4 py-3 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-themeTextGrey focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full py-4 bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl"
                                >
                                    Create Class
                                </Button>
                            </form>
                        </GlassCard>
                    </div>
                </div>

                {/* Table column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-themeGrey/40 pb-4">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <input 
                                type="checkbox"
                                checked={filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.includes(s.id))}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setSelectedStudentIds(prev => {
                                            const ids = new Set([...prev, ...filteredStudents.map(s => s.id)])
                                            return Array.from(ids)
                                        })
                                    } else {
                                        setSelectedStudentIds(prev => prev.filter(id => !filteredStudents.some(s => s.id === id)))
                                    }
                                }}
                                className="rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                            />
                            <h3 className="text-lg font-bold text-white shrink-0">
                                Registered Profiles ({searchQuery ? `${filteredStudents.length} of ${students.length}` : students.length})
                            </h3>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
                            <select
                                value={classFilter}
                                onChange={(e) => setClassFilter(e.target.value)}
                                className="px-3 py-2 bg-black/40 border border-themeGrey rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-xs cursor-pointer h-9"
                            >
                                <option value="all" className="bg-zinc-950 text-white">All Classes</option>
                                <option value="none" className="bg-zinc-950 text-white">No Class</option>
                                {classes.map((cls: any) => (
                                    <option key={cls.id} value={cls.id} className="bg-zinc-950 text-white">
                                        {cls.name}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="text"
                                placeholder="Search by name, roll no, class..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="px-4 py-2 bg-black/40 border border-themeGrey rounded-xl text-white placeholder-themeTextGrey focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-xs w-full sm:w-60 h-9"
                            />
                            {selectedStudentIds.length > 0 && (
                                <Button
                                    onClick={handleDeleteSelected}
                                    disabled={isPending}
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs px-4 py-2 flex items-center gap-1.5 h-9 shrink-0 transition-all"
                                >
                                    Delete Selected ({selectedStudentIds.length})
                                </Button>
                            )}
                        </div>
                    </div>

                    {filteredStudents.length === 0 ? (
                        <GlassCard className="p-8 text-center text-themeTextGrey text-sm border border-themeGrey">
                            {searchQuery ? "No matching students found." : "No student profiles registered yet. Register a profile on the left."}
                        </GlassCard>
                    ) : (
                        <div className="space-y-4 max-h-[900px] overflow-y-auto pr-1">
                            {filteredStudents.map((student: any) => (
                                <GlassCard 
                                    key={student.id} 
                                    className="p-5 border border-themeGrey/40 flex flex-col gap-4 hover:border-zinc-700 transition-all"
                                >
                                    {editingStudentId === student.id ? (
                                        <div className="space-y-3 w-full">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] text-zinc-400 uppercase font-semibold mb-1">Name</label>
                                                    <input 
                                                        type="text" 
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        className="w-full px-3 py-2 bg-black border border-themeGrey rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-white/20"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-zinc-400 uppercase font-semibold mb-1">Roll Number</label>
                                                    <input 
                                                        type="text" 
                                                        value={editRollNo}
                                                        onChange={(e) => setEditRollNo(e.target.value.toUpperCase())}
                                                        className="w-full px-3 py-2 bg-black border border-themeGrey rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-white/20"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] text-zinc-400 uppercase font-semibold mb-1">Department</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="e.g. CSE, ECE"
                                                        value={editDepartment}
                                                        onChange={(e) => setEditDepartment(e.target.value)}
                                                        className="w-full px-3 py-2 bg-black border border-themeGrey rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-white/20"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-zinc-400 uppercase font-semibold mb-1">Class/Batch</label>
                                                    <select 
                                                        value={editClassId}
                                                        onChange={(e) => setEditClassId(e.target.value)}
                                                        className="w-full px-3 py-2 bg-black border border-themeGrey rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-white/20 cursor-pointer"
                                                    >
                                                        <option value="" className="bg-zinc-950 text-zinc-400">No Class</option>
                                                        {classes.map((cls: any) => (
                                                            <option key={cls.id} value={cls.id} className="bg-zinc-950 text-white">{cls.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] text-zinc-400 uppercase font-semibold mb-1">New Password (optional)</label>
                                                    <input 
                                                        type="password" 
                                                        placeholder="Leave blank to keep unchanged"
                                                        value={editPassword}
                                                        onChange={(e) => setEditPassword(e.target.value)}
                                                        className="w-full px-3 py-2 bg-black border border-themeGrey rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-white/20"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-2 justify-end pt-2">
                                                <button 
                                                    onClick={() => setEditingStudentId(null)}
                                                    className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white transition-all"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    onClick={() => handleSaveEdit(student.id)}
                                                    className="px-3 py-1.5 bg-white hover:bg-zinc-200 text-black rounded-lg text-xs font-bold transition-all"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <input 
                                                    type="checkbox"
                                                    checked={selectedStudentIds.includes(student.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedStudentIds(prev => [...prev, student.id])
                                                        } else {
                                                            setSelectedStudentIds(prev => prev.filter(id => id !== student.id))
                                                        }
                                                    }}
                                                    className="rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer shrink-0"
                                                />
                                                <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-themeGrey flex items-center justify-center font-bold text-sm text-themeTextWhite shrink-0">
                                                    {(student.name || "Student").substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                                                        {student.name}
                                                        {student.class && (
                                                            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-mono font-medium">
                                                                {student.class.name}
                                                            </span>
                                                        )}
                                                        {student.department && (
                                                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-medium">
                                                                {student.department}
                                                            </span>
                                                        )}
                                                    </h4>
                                                    <p className="text-xs text-themeTextGrey">
                                                        Roll No: {student.rollNo.toUpperCase()} | Created: {new Date(student.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {student.isFirstLogin ? (
                                                    <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-400/5 border border-amber-400/20 px-2.5 py-1 rounded-lg">
                                                        <LockKeyhole size={12} /> Pending Password Setup
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-400/5 border border-emerald-400/20 px-2.5 py-1 rounded-lg">
                                                        <ShieldCheck size={12} /> Profile Configured
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleStartEdit(student)}
                                                    className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg text-[10px] font-bold transition-all"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSingleStudent(student.id, student.name)}
                                                    className="p-1.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[10px] font-bold transition-all"
                                                    title="Delete Student"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Permissions control panel inside student card */}
                                    {(() => {
                                        const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
                                        const isAllowedToday = student.isAllowedInClass && 
                                            (student.allowedClassDate === todayStr || student.allowedClassDate === "PENDING_" + todayStr)
                                        return (
                                            <div className="flex flex-col gap-3 pt-3.5 border-t border-themeGrey/40 text-xs text-themeTextGrey">
                                                <h5 className="font-bold text-[10px] uppercase text-zinc-500 tracking-wider">Attendance & Session Permissions</h5>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* In Class Checkin Permission */}
                                                    <div className="flex items-center justify-between bg-black/40 border border-themeGrey/30 p-2.5 rounded-xl">
                                                        <span className="font-medium text-white">In-Class Check-in</span>
                                                        <button
                                                            onClick={() => handleToggleInClass(student.id, !isAllowedToday)}
                                                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                                isAllowedToday 
                                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                                                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                                                            }`}
                                                        >
                                                            {isAllowedToday ? 'Allowed' : 'Blocked'}
                                                        </button>
                                                    </div>
                                                    {/* WFH Checkin Permission */}
                                                    <div className="flex flex-col gap-2 bg-black/40 border border-themeGrey/30 p-2.5 rounded-xl">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-medium text-white">Work From Home</span>
                                                            <button
                                                                onClick={() => handleToggleWFH(student.id, !student.isAssignedWFH)}
                                                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                                    student.isAssignedWFH 
                                                                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' 
                                                                        : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                                                                }`}
                                                            >
                                                                {student.isAssignedWFH ? 'Assigned' : 'Unassigned'}
                                                            </button>
                                                        </div>

                                                        {student.isAssignedWFH && (
                                                            <div className="flex flex-col gap-1.5 pt-1.5 border-t border-themeGrey/20">
                                                                <span className="text-[10px] text-themeTextGrey">Assignment Deadline:</span>
                                                                <input
                                                                    type="datetime-local"
                                                                    defaultValue={student.wfhDeadline ? new Date(new Date(student.wfhDeadline).getTime() - new Date().getTimezoneOffset()*60*1000).toISOString().slice(0, 16) : ""}
                                                                    onChange={(e) => handleSaveWFHDeadline(student.id, e.target.value)}
                                                                    className="w-full bg-zinc-950/80 border border-themeGrey rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-white/20"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })()}
                                </GlassCard>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
