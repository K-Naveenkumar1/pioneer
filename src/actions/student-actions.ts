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
        let checkInType = ""
        if (dbStudent.isAllowedInClass) {
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

        const dateStr = getLocalDateString()

        // Check if there is already an active check-in (missing checkOut)
        const activeAttendance = await client.attendance.findFirst({
            where: {
                studentId: student.id,
                checkOut: null
            }
        })

        if (activeAttendance) {
            return { success: true, record: activeAttendance, message: "Already checked in" }
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

        // Count distinct days attended
        const distinctStudentSessions = await client.attendance.findMany({
            where: { studentId: student.id },
            select: { date: true },
            distinct: ["date"]
        })
        const daysAttended = distinctStudentSessions.length

        // Count distinct class days across the system
        const distinctSystemDays = await client.attendance.findMany({
            select: { date: true },
            distinct: ["date"]
        })
        const totalClassDays = distinctSystemDays.length

        // Assume at least 1 class day if system is empty to prevent division by zero
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

        const activeRecord = await client.attendance.findFirst({
            where: {
                studentId: student.id,
                checkOut: null
            }
        })

        const dateStr = getLocalDateString()
        const todayRecords = await client.attendance.findMany({
            where: {
                studentId: student.id,
                date: dateStr
            },
            orderBy: { checkIn: "asc" }
        })

        return {
            isCheckedIn: !!activeRecord,
            activeRecord,
            todayRecords
        }
    } catch (e) {
        return { isCheckedIn: false, activeRecord: null, todayRecords: [] }
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
            where: { id: student.id }
        })

        if (!dbStudent) return { success: false, error: "Student profile not found" }

        // Block task access completely if admin has not allowed check-in
        const isAllowed = dbStudent.isAllowedInClass || dbStudent.isAssignedWFH
        if (!isAllowed) {
            return {
                success: true,
                tasks: [],
                isCheckedIn: false,
                isBlockedFromTasks: true
            }
        }

        const tasks = await client.task.findMany({
            orderBy: { createdAt: "desc" }
        })

        const submissions = await client.taskSubmission.findMany({
            where: { studentId: student.id }
        })

        const activeAttendance = await client.attendance.findFirst({
            where: { studentId: student.id, checkOut: null }
        })

        const tasksWithStatus = tasks.map(task => {
            const submission = submissions.find(s => s.taskId === task.id)
            return {
                ...task,
                status: submission ? submission.status : "PENDING", // PENDING, APPROVED, REJECTED
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
export async function getStudentExams() {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

        const exams = await client.exam.findMany({
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
                duration: exam.duration,
                totalQuestions: exam._count.questions,
                attempted: !!attempt,
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
export async function startExamAttemptAction(examId: string) {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

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
            if (studentAnswer && studentAnswer.trim().toUpperCase() === q.correctAnswer.trim().toUpperCase()) {
                correctCount++
            }
        })

        const finalScore = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0

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
                    include: {
                        questions: {
                            select: {
                                id: true,
                                questionText: true,
                                optionA: true,
                                optionB: true,
                                optionC: true,
                                optionD: true
                            }
                        }
                    }
                }
            }
        })

        if (!attempt || attempt.studentId !== student.id) {
            return { success: false, error: "Session invalid or unauthorized" }
        }

        if (attempt.completedAt) {
            return { success: false, error: "Exam is already completed and graded." }
        }

        return {
            success: true,
            examTitle: attempt.exam.title,
            duration: attempt.exam.duration,
            questions: attempt.exam.questions,
            startedAt: attempt.startedAt,
            warnings: attempt.warnings
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

        const profile = await client.student.findUnique({
            where: { id: student.id },
            select: {
                id: true,
                rollNo: true,
                name: true,
                isAllowedInClass: true,
                isAssignedWFH: true,
                wfhDeadline: true
            }
        })
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
            })
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

        // Fetch class details and all students in the same class
        const targetClass = await client.class.findUnique({
            where: { id: dbStudent.classId },
            select: { name: true }
        })

        const classmates = await client.student.findMany({
            where: { classId: dbStudent.classId },
            select: {
                id: true,
                name: true,
                rollNo: true,
                submissions: {
                    include: { task: true }
                },
                attempts: {
                    where: { completedAt: { not: null } },
                    select: { score: true, startedAt: true, examId: true }
                }
            }
        })

        // Fetch all tasks to know when tasks were created
        const allTasks = await client.task.findMany({
            select: { id: true, createdAt: true }
        })

        // Group tasks by date string
        const taskDates: { [dateStr: string]: string[] } = {}
        allTasks.forEach(t => {
            const d = new Date(t.createdAt)
            const offset = d.getTimezoneOffset()
            const dateStr = new Date(d.getTime() - (offset*60*1000)).toISOString().split('T')[0]
            if (!taskDates[dateStr]) taskDates[dateStr] = []
            taskDates[dateStr].push(t.id)
        })

        // Fetch NoTaskDeclaration for this class
        const noTasks = await client.noTaskDeclaration.findMany({
            where: { classId: dbStudent.classId },
            select: { date: true }
        })
        const noTaskDates = new Set(noTasks.map(nt => nt.date))

        // Map classmates to calculate their leaderboard score
        const leaderboard = classmates.map(c => {
            const approvedSubmissions = c.submissions.filter(s => s.status === "APPROVED")
            const completedTasksCount = approvedSubmissions.length

            let examScoreSum = 0
            c.attempts.forEach(attempt => {
                const d = new Date(attempt.startedAt)
                const offset = d.getTimezoneOffset()
                const attemptDate = new Date(d.getTime() - (offset*60*1000)).toISOString().split('T')[0]

                // Is there a task for this date?
                const tasksForDate = taskDates[attemptDate] || []

                let isAllowed = false
                if (tasksForDate.length === 0 || noTaskDates.has(attemptDate)) {
                    isAllowed = true
                } else {
                    // There is a task assigned on this date. Did classmate complete it (APPROVED)?
                    const completedTasksForDate = approvedSubmissions.filter(s => tasksForDate.includes(s.taskId))
                    if (completedTasksForDate.length > 0) {
                        isAllowed = true
                    }
                }

                if (isAllowed) {
                    examScoreSum += attempt.score
                }
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
