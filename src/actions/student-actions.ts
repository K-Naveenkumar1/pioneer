"use server"

import { client } from "@/lib/prisma"
import { getStudentUser } from "./custom-auth"

// Helper to get local date in YYYY-MM-DD
function getLocalDateString() {
    const d = new Date()
    const offset = d.getTimezoneOffset()
    const localDate = new Date(d.getTime() - (offset*60*1000))
    return localDate.toISOString().split('T')[0]
}

function getYesterdayLocalDateString() {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    const offset = d.getTimezoneOffset()
    const localDate = new Date(d.getTime() - (offset*60*1000))
    return localDate.toISOString().split('T')[0]
}

/**
 * Checks in a student for attendance tracking.
 */
export async function checkInAction() {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

        const dbStudent = await client.student.findUnique({
            where: { id: student.id }
        })

        if (!dbStudent) return { success: false, error: "Student profile not found" }

        // Determine check-in type and enforce admin permissions
        const dateStr = getLocalDateString()
        let checkInType = ""
        if (dbStudent.isAllowedInClass && (dbStudent.allowedClassDate === dateStr || dbStudent.allowedClassDate === "PENDING_" + dateStr)) {
            checkInType = "CLASS"
        } else if (dbStudent.isAssignedWFH) {
            // Check WFH deadline
            if (dbStudent.wfhDeadline && new Date() > new Date(dbStudent.wfhDeadline)) {
                return { success: false, error: "Blocked: Your work-from-home session deadline has passed." }
            }
            checkInType = "WFH"
        } else {
            return { success: false, error: "Blocked: The administrator has not granted you check-in permission at this time." }
        }

        // Check if there is already an active check-in (missing checkOut)
        let activeAttendance = await client.attendance.findFirst({
            where: {
                studentId: student.id,
                checkOut: null
            }
        })

        if (activeAttendance) {
            if (activeAttendance.date !== dateStr) {
                // Auto checkout previous day's session: set checkOut to checkIn + 8 hours
                const checkInDate = new Date(activeAttendance.checkIn)
                const autoCheckOutTime = new Date(checkInDate.getTime() + 8 * 60 * 60 * 1000)
                await client.attendance.update({
                    where: { id: activeAttendance.id },
                    data: { checkOut: autoCheckOutTime }
                })
                activeAttendance = null
            } else {
                return { success: true, record: activeAttendance, message: "Already checked in" }
            }
        }

        const newAttendance = await client.attendance.create({
            data: {
                studentId: student.id,
                checkIn: new Date(),
                date: dateStr,
                type: checkInType
            }
        })

        return { success: true, record: newAttendance, message: `Checked in successfully for ${checkInType}!` }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to check in" }
    }
}

/**
 * Calculates distinct attendance percentage and total attended days.
 */
export async function getAttendanceMetrics() {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

        // Run both queries in parallel
        const [distinctStudentSessions, distinctSystemDays] = await Promise.all([
            client.attendance.findMany({
                where: { studentId: student.id },
                select: { date: true },
                distinct: ["date"]
            }),
            client.attendance.findMany({
                select: { date: true },
                distinct: ["date"]
            })
        ])

        const daysAttended = distinctStudentSessions.length
        const totalClassDays = distinctSystemDays.length
        const percentage = totalClassDays > 0 ? Math.round((daysAttended / totalClassDays) * 100) : 0

        return {
            success: true,
            daysAttended,
            percentage,
            totalClassDays
        }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to calculate metrics" }
    }
}

/**
 * Fetches all data needed for the student dashboard in a single server action call.
 * Replaces 5 separate action calls with one — all queries run in parallel.
 */
export async function getDashboardDataAction() {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

        // Fetch student profile to get classId first
        const dbStudent = await client.student.findUnique({
            where: { id: student.id },
            select: { id: true, name: true, rollNo: true, department: true, classId: true }
        })
        if (!dbStudent) return { success: false, error: "Student not found" }

        // Run remaining queries in parallel using classId
        const [
            tasks,
            submissions,
            exams,
            attempts,
            distinctStudentSessions,
            distinctSystemDays,
            sessions
        ] = await Promise.all([
            client.task.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
            client.taskSubmission.findMany({ where: { studentId: student.id } }),
            client.exam.findMany({
                where: { 
                    type: { not: "CODING" },
                    OR: [
                        { classId: dbStudent.classId },
                        { classId: null }
                    ]
                },
                include: { _count: { select: { questions: true } } },
                orderBy: { createdAt: "desc" }
            }),
            client.examAttempt.findMany({ where: { studentId: student.id } }),
            client.attendance.findMany({
                where: { studentId: student.id },
                select: { date: true },
                distinct: ["date"]
            }),
            client.attendance.findMany({
                where: { student: { classId: dbStudent.classId } },
                select: { date: true },
                distinct: ["date"]
            }),
            client.attendance.findMany({
                where: { studentId: student.id },
                orderBy: { checkIn: "asc" }
            })
        ])

        // Task stats
        const tasksWithStatus = tasks.map(task => {
            const submission = submissions.find(s => s.taskId === task.id)
            return {
                ...task,
                status: submission ? submission.status : "PENDING",
                submittedContent: submission ? submission.content : null,
                submittedAt: submission ? submission.submittedAt : null
            }
        })

        // Exam stats
        const examsWithStatus = exams.map(exam => {
            const attempt = attempts.find(a => a.examId === exam.id && a.completedAt !== null)
            return {
                id: exam.id,
                title: exam.title,
                type: exam.type,
                duration: exam.duration,
                isActive: exam.isActive,
                totalQuestions: exam._count.questions,
                attempted: !!attempt,
                score: attempt ? attempt.score : null,
                completedAt: attempt ? attempt.completedAt : null
            }
        })

        // Attendance metrics
        const daysAttended = distinctStudentSessions.length
        const totalClassDays = distinctSystemDays.length
        const attendancePercentage = totalClassDays > 0 ? Math.round((daysAttended / totalClassDays) * 100) : 0

        return {
            success: true,
            profile: dbStudent,
            tasks: tasksWithStatus,
            exams: examsWithStatus,
            sessions,
            metrics: { daysAttended, totalClassDays, percentage: attendancePercentage }
        }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Checks out a student.
 */
export async function checkOutAction() {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

        const activeAttendance = await client.attendance.findFirst({
            where: {
                studentId: student.id,
                checkOut: null
            }
        })

        if (!activeAttendance) {
            return { success: false, error: "No active check-in found" }
        }

        const updatedAttendance = await client.attendance.update({
            where: { id: activeAttendance.id },
            data: { checkOut: new Date() }
        })

        return { success: true, record: updatedAttendance, message: "Checked out successfully" }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to check out" }
    }
}

/**
 * Retrieves the student's active check-in status and today's attendance log.
 */
export async function getAttendanceStatus() {
    try {
        const student = await getStudentUser()
        if (!student) return { isCheckedIn: false, activeRecord: null }

        const dateStr = getLocalDateString()

        let activeRecord = await client.attendance.findFirst({
            where: {
                studentId: student.id,
                checkOut: null
            }
        })

        // Auto checkout previous day's session
        if (activeRecord && activeRecord.date !== dateStr) {
            const checkInDate = new Date(activeRecord.checkIn)
            const autoCheckOutTime = new Date(checkInDate.getTime() + 8 * 60 * 60 * 1000)
            await client.attendance.update({
                where: { id: activeRecord.id },
                data: { checkOut: autoCheckOutTime }
            })
            activeRecord = null
        }

        const allRecords = await client.attendance.findMany({
            where: {
                studentId: student.id
            },
            orderBy: { checkIn: "desc" }
        })

        const todayRecords = allRecords.filter(rec => rec.date === dateStr).reverse() // reverse to maintain asc order for today records clock logic
        const yesterdayDateStr = getYesterdayLocalDateString()

        let yesterdayTotalMs = 0
        allRecords.forEach(rec => {
            if (rec.date === yesterdayDateStr && rec.checkIn) {
                const checkInTime = new Date(rec.checkIn).getTime()
                const checkOutTime = rec.checkOut ? new Date(rec.checkOut).getTime() : checkInTime
                yesterdayTotalMs += (checkOutTime - checkInTime)
            }
        })

        return {
            isCheckedIn: !!activeRecord,
            activeRecord,
            todayRecords,
            allRecords,
            yesterdayTotalMs
        }
    } catch (e) {
        return { isCheckedIn: false, activeRecord: null, todayRecords: [], allRecords: [], yesterdayTotalMs: 0 }
    }
}

/**
 * Fetches tasks and flags whether the student has completed them.
 */
export async function getStudentTasks() {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

        const dbStudent = await client.student.findUnique({
            where: { id: student.id },
            select: { isAllowedInClass: true, allowedClassDate: true, isAssignedWFH: true }
        })

        if (!dbStudent) return { success: false, error: "Student profile not found" }

        const dateStr = getLocalDateString()
        // Block task access completely if admin has not allowed check-in
        const isAllowed = (dbStudent.isAllowedInClass && dbStudent.allowedClassDate === dateStr) || dbStudent.isAssignedWFH
        if (!isAllowed) {
            return {
                success: true,
                tasks: [],
                isCheckedIn: false,
                isBlockedFromTasks: true
            }
        }

        // Run all queries in parallel for faster response
        const [tasks, submissions, activeAttendance] = await Promise.all([
            client.task.findMany({ orderBy: { createdAt: "desc" } }),
            client.taskSubmission.findMany({ where: { studentId: student.id } }),
            client.attendance.findFirst({ where: { studentId: student.id, checkOut: null } })
        ])

        const tasksWithStatus = tasks.map(task => {
            const submission = submissions.find(s => s.taskId === task.id)
            return {
                ...task,
                status: submission ? submission.status : "PENDING",
                submittedContent: submission ? submission.content : null,
                submittedAt: submission ? submission.submittedAt : null
            }
        })

        return {
            success: true,
            tasks: tasksWithStatus,
            isCheckedIn: !!activeAttendance,
            isBlockedFromTasks: false
        }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}


/**
 * Submits a completed task. Enforces that the student must be checked in.
 */
export async function submitTaskAction(taskId: string, content: string) {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

        // Enforce check-in block
        const activeAttendance = await client.attendance.findFirst({
            where: {
                studentId: student.id,
                checkOut: null
            }
        })

        if (!activeAttendance) {
            return { success: false, error: "Blocked: You must be Checked-In to submit tasks!" }
        }

        // If check-in type is WFH, verify deadline
        if (activeAttendance.type === "WFH") {
            const dbStudent = await client.student.findUnique({
                where: { id: student.id }
            })
            if (dbStudent && dbStudent.wfhDeadline && new Date() > new Date(dbStudent.wfhDeadline)) {
                return { success: false, error: "Blocked: The work-from-home deadline for this task has passed." }
            }
        }

        // Check if already submitted
        const existingSubmission = await client.taskSubmission.findFirst({
            where: {
                taskId,
                studentId: student.id
            }
        })

        if (existingSubmission) {
            // Allow re-submission/update if it hasn't been approved yet
            if (existingSubmission.status === "APPROVED") {
                return { success: false, error: "Task has already been approved and cannot be modified." }
            }

            await client.taskSubmission.update({
                where: { id: existingSubmission.id },
                data: {
                    content,
                    submittedAt: new Date(),
                    status: "PENDING"
                }
            })
        } else {
            await client.taskSubmission.create({
                data: {
                    taskId,
                    studentId: student.id,
                    content,
                    status: "PENDING"
                }
            })
        }

        return { success: true, message: "Task solution submitted successfully!" }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Fetches all exams and their completion status.
 */
export async function getStudentExams(type?: string) {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

        // Fetch student classId from database
        const studentRecord = await client.student.findUnique({
            where: { id: student.id },
            select: { classId: true }
        })
        const studentClassId = studentRecord?.classId

        const whereClause: any = {}
        if (type) {
            whereClause.type = type
        }

        // Only show exams belonging to student's class, or global exams
        whereClause.OR = [
            { classId: studentClassId },
            { classId: null }
        ]

        const exams = await client.exam.findMany({
            where: whereClause,
            include: {
                _count: {
                    select: { questions: true }
                }
            },
            orderBy: { createdAt: "desc" }
        })

        const attempts = await client.examAttempt.findMany({
            where: { studentId: student.id }
        })

        const examsWithStatus = exams.map(exam => {
            const attempt = attempts.find(a => a.examId === exam.id && a.completedAt !== null)
            return {
                id: exam.id,
                title: exam.title,
                type: exam.type,
                duration: exam.duration,
                examCode: exam.examCode, // Include exam code
                isActive: exam.isActive,
                totalQuestions: exam._count.questions,
                attempted: !!attempt,
                attemptId: attempt ? attempt.id : null,
                score: attempt ? attempt.score : null,
                completedAt: attempt ? attempt.completedAt : null
            }
        })

        return { success: true, exams: examsWithStatus }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Starts an exam attempt.
 */
export async function startExamAttemptAction(examId: string, inputCode: string) {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

        const exam = await client.exam.findUnique({
            where: { id: examId }
        })

        if (!exam) return { success: false, error: "Exam not found" }

        if (!exam.isActive) {
            return { success: false, error: "This exam has ended and is no longer available to attend." }
        }

        // Enforce class level security
        if (exam.classId) {
            const studentRecord = await client.student.findUnique({
                where: { id: student.id },
                select: { classId: true }
            })
            if (!studentRecord || studentRecord.classId !== exam.classId) {
                return { success: false, error: "Access denied. You are not registered for this exam's class." }
            }
        }

        if (exam.examCode && exam.examCode.trim() !== "") {
            if (!inputCode || inputCode.trim() !== exam.examCode.trim()) {
                return { success: false, error: "Incorrect exam code. Access denied." }
            }
        }

        // Check if student already completed this exam
        const existingAttempt = await client.examAttempt.findFirst({
            where: {
                examId,
                studentId: student.id,
                completedAt: { not: null }
            }
        })

        if (existingAttempt) {
            return { success: false, error: "You have already completed this exam." }
        }

        // Create a new attempt session
        const attempt = await client.examAttempt.create({
            data: {
                examId,
                studentId: student.id,
                score: 0,
                answers: JSON.stringify({}),
                warnings: 0
            }
        })

        return { success: true, attemptId: attempt.id }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Increments warning counts for breaking lockdown mode.
 */
export async function updateExamWarningAction(attemptId: string, warningsCount: number) {
    try {
        await client.examAttempt.update({
            where: { id: attemptId },
            data: { warnings: warningsCount }
        })
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Grade and submit an exam attempt.
 */
export async function submitExamAttemptAction(attemptId: string, answers: Record<string, string>) {
    try {
        const attempt = await client.examAttempt.findUnique({
            where: { id: attemptId },
            include: {
                exam: {
                    include: { questions: true }
                }
            }
        })

        if (!attempt) return { success: false, error: "Attempt not found" }
        if (attempt.completedAt) return { success: true, score: attempt.score, totalQuestions: attempt.exam.questions.length, message: "Exam already completed" }

        const questions = attempt.exam.questions
        let correctCount = 0

        questions.forEach(q => {
            const studentAnswer = answers[q.id]
            if (studentAnswer && q.correctAnswer && studentAnswer.trim().toUpperCase() === q.correctAnswer.trim().toUpperCase()) {
                correctCount++
            }
        })

        const finalScore = correctCount

        const updatedAttempt = await client.examAttempt.update({
            where: { id: attemptId },
            data: {
                score: finalScore,
                answers: JSON.stringify(answers),
                completedAt: new Date()
            }
        })

        return {
            success: true,
            score: updatedAttempt.score,
            totalQuestions: questions.length,
            correctCount
        }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Lightweight action to get the exam session duration and startedAt timestamp.
 * Avoids loading all questions and choices, reducing DB workload significantly.
 */
export async function getExamSessionDuration(attemptId: string) {
    try {
        const attempt = await client.examAttempt.findUnique({
            where: { id: attemptId },
            select: {
                startedAt: true,
                exam: {
                    select: {
                        duration: true
                    }
                }
            }
        })
        if (!attempt) return { success: false, error: "Attempt not found" }
        return { success: true, duration: attempt.exam.duration, startedAt: attempt.startedAt }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

/**
 * Returns complete exam details (questions) for the current student inside the exam lobby.
 * Ensures the student has an active incomplete attempt before disclosing questions.
 */
export async function getExamSessionDetails(attemptId: string) {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

        const attempt = await client.examAttempt.findUnique({
            where: { id: attemptId },
            include: {
                exam: {
                    select: {
                        title: true,
                        duration: true,
                        type: true,
                        questions: {
                            select: {
                                id: true,
                                questionText: true,
                                optionA: true,
                                optionB: true,
                                optionC: true,
                                optionD: true,
                                correctAnswer: true,
                                title: true,
                                constraints: true,
                                inputFormat: true,
                                outputFormat: true,
                                sampleInput: true,
                                sampleOutput: true
                            }
                        }
                    }
                }
            }
        })

        if (!attempt || attempt.studentId !== student.id) {
            return { success: false, error: "Session invalid or unauthorized" }
        }

        const isCompleted = !!attempt.completedAt

        let questions = attempt.exam.questions.map(q => {
            const { correctAnswer, ...rest } = q
            return rest
        })

        if (attempt.exam.type === "MCQ" && questions.length > 0) {
            // Seeded shuffle using attemptId (UUID)
            let h = 2166136261 >>> 0
            for (let i = 0; i < attemptId.length; i++) {
                h = Math.imul(h ^ attemptId.charCodeAt(i), 16777619)
            }
            const random = () => {
                let t = (h += 0x6d2b79f5)
                t = Math.imul(t ^ (t >>> 15), t | 1)
                t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296
            }

            const shuffled = [...questions]
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(random() * (i + 1))
                const temp = shuffled[i]
                shuffled[i] = shuffled[j]
                shuffled[j] = temp
            }
            questions = shuffled
        }

        let studentAnswers: Record<string, string> = {}
        if (isCompleted && attempt.answers) {
            try {
                studentAnswers = JSON.parse(attempt.answers)
            } catch (e) {}
        }

        return {
            success: true,
            examTitle: attempt.exam.title,
            examType: attempt.exam.type,
            duration: attempt.exam.duration,
            questions,
            startedAt: attempt.startedAt,
            warnings: attempt.warnings,
            codingSubmissions: attempt.codingSubmissions,
            isCompleted,
            studentAnswers,
            score: attempt.score
        }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Returns full student profile details for dashboard rendering.
 */
export async function getStudentProfileDetails() {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

        const dbStudent = await client.student.findUnique({
            where: { id: student.id },
            select: {
                id: true,
                rollNo: true,
                name: true,
                isAllowedInClass: true,
                allowedClassDate: true,
                isAssignedWFH: true,
                wfhDeadline: true
            }
        })
        if (!dbStudent) return { success: false, error: "Student profile not found" }

        const dateStr = getLocalDateString()
        const isAllowedInClass = dbStudent.isAllowedInClass && 
            (dbStudent.allowedClassDate === dateStr || dbStudent.allowedClassDate === "PENDING_" + dateStr)

        const profile = {
            id: dbStudent.id,
            rollNo: dbStudent.rollNo,
            name: dbStudent.name,
            isAllowedInClass,
            isAssignedWFH: dbStudent.isAssignedWFH,
            wfhDeadline: dbStudent.wfhDeadline
        }
        return { success: true, profile }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Runs student code practice execution using Judge0 CE API.
 */
export async function runCodeAction(languageId: number, code: string, stdin: string) {
    try {
        const response = await fetch("https://ce.judge0.com/submissions?wait=true", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                source_code: code,
                language_id: languageId,
                stdin: stdin
            }),
            cache: "no-store"
        })

        const result = await response.json()
        return { success: true, result }
    } catch (error: any) {
        console.error("Code compilation API error:", error)
        return { success: false, error: error?.message || "Failed to execute code" }
    }
}

/**
 * Saves a student note for a specific date (YYYY-MM-DD format).
 * Enforces check-in state.
 */
export async function saveNoteAction(dateStr: string, content: string) {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

        // Check if student is checked in
        const activeAttendance = await client.attendance.findFirst({
            where: {
                studentId: student.id,
                checkOut: null
            }
        })

        if (!activeAttendance) {
            return { success: false, error: "Blocked: You must be Checked-In to save notes!" }
        }

        // Upsert the note
        const note = await client.note.upsert({
            where: {
                studentId_date: {
                    studentId: student.id,
                    date: dateStr
                }
            },
            update: {
                content,
                updatedAt: new Date()
            },
            create: {
                studentId: student.id,
                date: dateStr,
                content
            }
        })

        return { success: true, note, message: "Note saved successfully!" }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to save note" }
    }
}

/**
 * Gets a student note for a specific date.
 */
export async function getNoteAction(dateStr: string) {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

        const note = await client.note.findUnique({
            where: {
                studentId_date: {
                    studentId: student.id,
                    date: dateStr
                }
            }
        })

        return { success: true, note }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to fetch note" }
    }
}

/**
 * Gets all dates for which the logged-in student has written a note.
 */
export async function getAllNoteDatesAction() {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

        const notes = await client.note.findMany({
            where: { studentId: student.id },
            select: { date: true }
        })

        const dates = notes.map(n => n.date)
        return { success: true, dates }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to fetch note dates" }
    }
}

/**
 * Gets all notes (with content) for the logged-in student.
 */
export async function getAllNotesAction() {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

        const notes = await client.note.findMany({
            where: { studentId: student.id },
            orderBy: { date: "asc" }
        })

        return { success: true, notes }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to fetch notes" }
    }
}

/**
 * Retrieves the ranked leaderboard of students in the logged-in student's class.
 * Ranked by score = (completed_tasks * 10) + sum(exam_scores)
 */
export async function getStudentLeaderboardAction() {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

        // Fetch student's classId
        const dbStudent = await client.student.findUnique({
            where: { id: student.id },
            select: { classId: true }
        })

        if (!dbStudent || !dbStudent.classId) {
            return { success: true, leaderboard: [], className: "No Class Assigned" }
        }

        // Fetch class details, classmates, tasks, and no-task declarations in parallel
        const [targetClass, classmates, allTasks, noTasks] = await Promise.all([
            client.class.findUnique({
                where: { id: dbStudent.classId },
                select: { name: true }
            }),
            client.student.findMany({
                where: { classId: dbStudent.classId },
                select: {
                    id: true,
                    name: true,
                    rollNo: true,
                    submissions: {
                        select: { status: true }
                    },
                    attempts: {
                        where: { completedAt: { not: null } },
                        select: { score: true, startedAt: true, examId: true }
                    }
                }
            }),
            client.task.findMany({
                select: { id: true, createdAt: true }
            }),
            client.noTaskDeclaration.findMany({
                where: { classId: dbStudent.classId },
                select: { date: true }
            })
        ])

        // Group tasks by date string
        const taskDates: { [dateStr: string]: string[] } = {}
        allTasks.forEach(t => {
            const d = new Date(t.createdAt)
            const offset = d.getTimezoneOffset()
            const dateStr = new Date(d.getTime() - (offset*60*1000)).toISOString().split('T')[0]
            if (!taskDates[dateStr]) taskDates[dateStr] = []
            taskDates[dateStr].push(t.id)
        })
        const noTaskDates = new Set(noTasks.map(nt => nt.date))

        // Map classmates to calculate their leaderboard score
        const leaderboard = classmates.map(c => {
            const approvedSubmissions = c.submissions.filter(s => s.status === "APPROVED")
            const completedTasksCount = approvedSubmissions.length

            let examScoreSum = 0
            c.attempts.forEach(attempt => {
                examScoreSum += attempt.score
            })

            const totalScore = (completedTasksCount * 10) + examScoreSum

            return {
                id: c.id,
                name: c.name,
                rollNo: c.rollNo,
                tasksCompleted: completedTasksCount,
                examScoreSum: examScoreSum,
                totalScore: totalScore
            }
        })

        // Sort by totalScore desc, then name asc
        leaderboard.sort((a, b) => {
            if (b.totalScore !== a.totalScore) {
                return b.totalScore - a.totalScore
            }
            return a.name.localeCompare(b.name)
        })

        return { 
            success: true, 
            leaderboard, 
            className: targetClass?.name || "Classroom" 
        }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to fetch leaderboard" }
    }
}

/**
 * Gets all attendance sessions for the logged-in student.
 */
export async function getStudentAttendanceSessionsAction() {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

        const sessions = await client.attendance.findMany({
            where: { studentId: student.id },
            orderBy: { checkIn: "desc" }
        })

        return { success: true, sessions }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to fetch sessions" }
    }
}

/**
 * Compiles student code and runs all test cases to score a coding exam question.
 */
export async function gradeCodingQuestionAction(
    attemptId: string,
    questionId: string,
    code: string,
    languageId: number
) {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

        const attempt = await client.examAttempt.findUnique({
            where: { id: attemptId },
            include: {
                exam: {
                    include: {
                        questions: {
                            where: { id: questionId }
                        }
                    }
                }
            }
        })

        if (!attempt) return { success: false, error: "Attempt not found" }
        if (attempt.completedAt) return { success: false, error: "Exam is already completed" }

        const question = attempt.exam.questions[0]
        if (!question) return { success: false, error: "Question not found" }

        let testCases: any[] = []
        try {
            testCases = JSON.parse(question.testCases || "[]")
        } catch (err) {
            console.error("Failed to parse test cases:", err)
        }

        if (testCases.length === 0) {
            testCases = [{ input: "", output: "", points: 100, isSample: true }]
        }

        // Run all test cases in parallel
        const results = await Promise.all(
            testCases.map(async (tc, index) => {
                try {
                    const response = await fetch("https://ce.judge0.com/submissions?wait=true", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            source_code: code,
                            language_id: languageId,
                            stdin: String(tc.input || ""),
                            expected_output: String(tc.output || "")
                        }),
                        cache: "no-store"
                    })

                    const result = await response.json()
                    const passed = result.status?.id === 3

                    return {
                        index,
                        isSample: tc.isSample || false,
                        passed,
                        status: result.status?.description || (passed ? "Accepted" : "Wrong Answer"),
                        compile_output: result.compile_output,
                        stderr: result.stderr,
                        stdout: result.stdout
                    }
                } catch (e: any) {
                    return {
                        index,
                        isSample: tc.isSample || false,
                        passed: false,
                        status: "Runtime Error",
                        stderr: e.message
                    }
                }
            })
        )

        const passedCount = results.filter(r => r.passed).length
        const questionScore = Math.round((passedCount / testCases.length) * 100)

        const submissionsMap = JSON.parse(attempt.codingSubmissions || "{}")
        submissionsMap[questionId] = {
            code,
            languageId,
            marks: questionScore,
            testCaseResults: results.map(r => ({
                index: r.index,
                isSample: r.isSample,
                passed: r.passed,
                status: r.status
            }))
        }

        // Update coding submissions maps in db
        await client.examAttempt.update({
            where: { id: attemptId },
            data: {
                codingSubmissions: JSON.stringify(submissionsMap)
            }
        })

        return { success: true, results, score: questionScore }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Finalizes the coding exam attempt and updates the final aggregate score.
 */
export async function submitCodingExamAction(attemptId: string) {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

        const attempt = await client.examAttempt.findUnique({
            where: { id: attemptId },
            include: {
                exam: {
                    include: { questions: true }
                }
            }
        })

        if (!attempt) return { success: false, error: "Attempt not found" }
        if (attempt.completedAt) return { success: true, score: attempt.score, message: "Exam already completed" }

        const submissionsMap = JSON.parse(attempt.codingSubmissions || "{}")
        let totalMarks = 0
        const questions = attempt.exam.questions

        questions.forEach(q => {
            const sub = submissionsMap[q.id]
            if (sub) {
                totalMarks += sub.marks || 0
            }
        })

        // Final score marks
        const finalScore = totalMarks

        await client.examAttempt.update({
            where: { id: attemptId },
            data: {
                score: finalScore,
                completedAt: new Date()
            }
        })

        return { success: true, score: finalScore }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Fetches the active typing session if available.
 */
export async function studentGetActiveTypingSessionAction() {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

        const dbStudent = await client.student.findUnique({
            where: { id: student.id },
            select: { classId: true }
        })

        if (!dbStudent || !dbStudent.classId) {
            return { success: true, session: null }
        }

        const session = await client.typingGameSession.findFirst({
            where: { isActive: true, classId: dbStudent.classId },
            orderBy: { createdAt: "desc" }
        })

        if (session) {
            const existingRun = await client.typingGameRun.findFirst({
                where: {
                    sessionId: session.id,
                    studentId: student.id
                }
            })

            const { password, ...sessionWithoutPassword } = session
            return { 
                success: true, 
                session: {
                    ...sessionWithoutPassword,
                    hasPassword: !!password && password.trim() !== "",
                    hasAttempted: !!existingRun,
                    pastRun: existingRun ? {
                        wpm: existingRun.wpm,
                        accuracy: existingRun.accuracy,
                        isCompleted: existingRun.isCompleted
                    } : null
                }
            }
        }

        return { success: true, session: null }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Starts a student run for the active typing session.
 */
export async function studentStartTypingRunAction(sessionId: string, passwordInput?: string) {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

        const session = await client.typingGameSession.findUnique({
            where: { id: sessionId }
        })

        if (!session) return { success: false, error: "Session not found" }

        const existingRun = await client.typingGameRun.findFirst({
            where: {
                sessionId,
                studentId: student.id
            }
        })

        if (existingRun) {
            return { success: false, error: "You have already attempted this typing test." }
        }

        if (session.password && session.password.trim() !== "") {
            if (!passwordInput || passwordInput.trim() !== session.password.trim()) {
                return { success: false, error: "Incorrect password. Please try again." }
            }
        }

        const run = await client.typingGameRun.create({
            data: {
                sessionId,
                studentId: student.id,
                wpm: 0,
                accuracy: 0,
                progressPercentage: 0,
                isCompleted: false,
                createdAt: new Date()
            }
        })

        return { success: true, runId: run.id }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Updates a student's real-time typing run metrics.
 */
export async function studentUpdateTypingProgressAction(
    runId: string,
    wpm: number,
    accuracy: number,
    progressPercentage: number,
    isCompleted: boolean
) {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

        const run = await client.typingGameRun.findUnique({
            where: { id: runId },
            include: { session: true }
        })

        if (!run) return { success: false, error: "Run not found" }
        if (run.studentId !== student.id) return { success: false, error: "Unauthorized" }


        // Also cap WPM to 200 WPM
        let finalWpm = Number(wpm)
        if (finalWpm > 200) {
            finalWpm = 200
        }

        const updatedRun = await client.typingGameRun.update({
            where: { id: runId },
            data: {
                wpm: finalWpm,
                accuracy: Number(accuracy),
                progressPercentage: Number(progressPercentage),
                isCompleted,
                completedAt: isCompleted ? new Date() : undefined
            }
        })

        return { success: true, run: updatedRun }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function studentUpdateExamAnswersAction(attemptId: string, answers: Record<string, string>) {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

        const attempt = await client.examAttempt.findUnique({
            where: { id: attemptId }
        })

        if (!attempt || attempt.studentId !== student.id) {
            return { success: false, error: "Attempt invalid or unauthorized" }
        }

        if (attempt.completedAt) {
            return { success: false, error: "Exam is already completed" }
        }

        await client.examAttempt.update({
            where: { id: attemptId },
            data: {
                answers: JSON.stringify(answers)
            }
        })

        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Saves a student's coding solution draft to the database in real-time.
 */
export async function saveCodingDraftAction(
    attemptId: string,
    questionId: string,
    code: string,
    languageId: number
) {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

        const attempt = await client.examAttempt.findUnique({
            where: { id: attemptId }
        })

        if (!attempt || attempt.studentId !== student.id) {
            return { success: false, error: "Attempt invalid or unauthorized" }
        }

        if (attempt.completedAt) {
            return { success: false, error: "Exam is already completed" }
        }

        const submissionsMap = JSON.parse(attempt.codingSubmissions || "{}")
        const existing = submissionsMap[questionId] || {}
        submissionsMap[questionId] = {
            code,
            languageId,
            marks: existing.marks ?? 0,
            testCaseResults: existing.testCaseResults ?? [],
            isDraft: true
        }

        await client.examAttempt.update({
            where: { id: attemptId },
            data: {
                codingSubmissions: JSON.stringify(submissionsMap)
            }
        })

        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
