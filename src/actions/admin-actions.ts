"use server"

import { client } from "@/lib/prisma"
import { getAdminUser } from "./custom-auth"
import { hashPassword } from "@/lib/hash"
import mammoth from "mammoth"

/**
 * Creates a new student credentials profile.
 */
export async function adminCreateStudentAction(rollNo: string, name: string, tempPassword?: string, classId?: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const cleanRoll = rollNo.trim()
        const cleanName = name.trim()

        if (!cleanRoll || !cleanName) {
            return { success: false, error: "Missing required fields" }
        }

        const passwordToHash = (tempPassword && tempPassword.trim()) ? tempPassword.trim() : cleanRoll

        // Check if student rollNo already exists
        const existingStudent = await client.student.findUnique({
            where: { rollNo: cleanRoll }
        })

        if (existingStudent) {
            return { success: false, error: `Roll number ${cleanRoll} is already registered.` }
        }

        const student = await client.student.create({
            data: {
                rollNo: cleanRoll,
                name: cleanName,
                password: hashPassword(passwordToHash),
                isFirstLogin: true,
                classId: classId && classId.trim() !== "" ? classId.trim() : null
            }
        })

        return { success: true, message: `Student profile ${student.rollNo} created successfully!` }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to create student profile" }
    }
}

/**
 * Creates multiple students in a transaction, auto-creating classes if they don't exist.
 */
export async function adminBatchCreateStudentsAction(
    studentsList: { name: string; rollNo: string; className?: string }[]
) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        if (!studentsList || studentsList.length === 0) {
            return { success: false, error: "Empty student list" }
        }

        const results = await client.$transaction(async (tx) => {
            const createdStudents = []
            const skippedStudents = []

            for (const item of studentsList) {
                const cleanName = item.name?.toString().trim()
                const cleanRoll = item.rollNo?.toString().trim()
                const cleanClass = item.className?.toString().trim()

                if (!cleanName || !cleanRoll) {
                    continue
                }

                // Check if student already exists
                const existing = await tx.student.findUnique({
                    where: { rollNo: cleanRoll }
                })

                if (existing) {
                    skippedStudents.push(cleanRoll)
                    continue
                }

                let classId: string | null = null
                if (cleanClass) {
                    // Find or create class
                    let cls = await tx.class.findUnique({
                        where: { name: cleanClass }
                    })
                    if (!cls) {
                        cls = await tx.class.create({
                            data: { name: cleanClass }
                        })
                    }
                    classId = cls.id
                }

                await tx.student.create({
                    data: {
                        name: cleanName,
                        rollNo: cleanRoll,
                        password: hashPassword(cleanRoll), // default password is rollNo
                        isFirstLogin: true,
                        classId: classId
                    }
                })
                createdStudents.push(cleanRoll)
            }

            return { createdStudents, skippedStudents }
        })

        return { 
            success: true, 
            message: `Successfully registered ${results.createdStudents.length} students. Skipped ${results.skippedStudents.length} duplicates.`,
            createdCount: results.createdStudents.length,
            skippedCount: results.skippedStudents.length
        }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to batch import students" }
    }
}

/**
 * Returns a list of all registered students.
 */
export async function adminGetStudentsList() {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const students = await client.student.findMany({
            orderBy: { rollNo: "asc" },
            select: {
                id: true,
                rollNo: true,
                name: true,
                department: true,
                isFirstLogin: true,
                isAllowedInClass: true,
                isAssignedWFH: true,
                wfhDeadline: true,
                createdAt: true,
                classId: true,
                class: {
                    select: {
                        name: true
                    }
                }
            }
        })
        return { success: true, students }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Toggles in-class check-in permission for a student.
 */
export async function adminToggleInClassPermission(studentId: string, allowed: boolean) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        await client.student.update({
            where: { id: studentId },
            data: { isAllowedInClass: allowed }
        })

        return { success: true, message: `In-class permission successfully updated.` }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to update permission" }
    }
}

/**
 * Assigns or clears WFH check-in permission along with a deadline.
 */
export async function adminAssignWFHAction(studentId: string, assigned: boolean, deadlineStr?: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        let deadline: Date | null = null
        if (assigned && deadlineStr) {
            deadline = new Date(deadlineStr)
        }

        await client.student.update({
            where: { id: studentId },
            data: { 
                isAssignedWFH: assigned,
                wfhDeadline: deadline
            }
        })

        return { success: true, message: assigned ? "Work From Home assigned successfully!" : "Work From Home assignment cleared." }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to assign Work From Home" }
    }
}

/**
 * Creates and allocates a task.
 */
export async function adminCreateTaskAction(title: string, description: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        if (!title.trim() || !description.trim()) {
            return { success: false, error: "Missing title or description" }
        }

        const task = await client.task.create({
            data: {
                title: title.trim(),
                description: description.trim()
            }
        })

        return { success: true, task, message: "Task created and allocated successfully!" }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Fetches all tasks and their respective student submissions.
 */
export async function adminGetTasksAndSubmissions() {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const tasks = await client.task.findMany({
            include: {
                submissions: {
                    include: {
                        student: {
                            select: { name: true, rollNo: true }
                        }
                    },
                    orderBy: { submittedAt: "desc" }
                }
            },
            orderBy: { createdAt: "desc" }
        })

        return { success: true, tasks }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Approves or Rejects a student's task submission.
 */
export async function adminReviewSubmissionAction(submissionId: string, status: "APPROVED" | "REJECTED") {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        await client.taskSubmission.update({
            where: { id: submissionId },
            data: { status }
        })

        return { success: true, message: `Submission successfully marked as ${status}.` }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Returns overall dashboard aggregates for stats panels.
 */
export async function adminGetDashboardStats() {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const studentCount = await client.student.count()
        const taskCount = await client.task.count()
        const examCount = await client.exam.count()

        // Active check-ins today (checkOut is null)
        const activeCheckins = await client.attendance.findMany({
            where: { checkOut: null },
            include: {
                student: {
                    select: { name: true, rollNo: true }
                }
            }
        })

        return {
            success: true,
            studentCount,
            taskCount,
            examCount,
            activeCount: activeCheckins.length,
            activeCheckins
        }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Returns check-in logs history for all students.
 */
export async function adminGetAttendanceLogs() {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const logs = await client.attendance.findMany({
            include: {
                student: {
                    select: { name: true, rollNo: true }
                }
            },
            orderBy: { checkIn: "desc" }
        })

        return { success: true, logs }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Parses the base64-encoded Word document upload into structured JSON MCQs.
 */
export async function parseDocxQuestionsAction(base64Data: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const buffer = Buffer.from(base64Data, "base64")
        const parseRes = await mammoth.extractRawText({ buffer })
        const text = parseRes.value

        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0)
        const questions: any[] = []
        let currentQ: any = null
        let expectingNewQuestion = true

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]

            // Correct Answer pattern (supports: "Answer: B", "Correct Answer: B", "Ans: B", "Answer Key: B", "Correct: B", "Answer - B", etc.)
            const ansMatch = line.match(/^(?:Correct\s+Answer|Answer\s+Key|Answer|Correct|Ans|Key)[\s:-]+([A-D])/i)
            if (ansMatch) {
                if (currentQ) {
                    currentQ.correctAnswer = ansMatch[1].toUpperCase()
                    expectingNewQuestion = true
                }
                continue
            }

            // Option pattern (supports optionally parenthesized options: "A) option", "(A) option", "A. option", "A - option")
            const optMatch = line.match(/^\(?([A-D])\)?[\.\):-]\s*(.*)$/i)
            if (optMatch) {
                if (currentQ) {
                    const letter = optMatch[1].toUpperCase()
                    const val = optMatch[2].trim()
                    if (letter === "A") currentQ.optionA = val
                    else if (letter === "B") currentQ.optionB = val
                    else if (letter === "C") currentQ.optionC = val
                    else if (letter === "D") currentQ.optionD = val
                    expectingNewQuestion = false
                }
                continue
            }

            // If it is a new question starting with a number (e.g. "16. What is...")
            const newQMatch = line.match(/^(?:Question\s+)?\d+[\.\):-]\s*(.*)$/i)
            if (newQMatch) {
                if (currentQ) {
                    questions.push(currentQ)
                }
                currentQ = {
                    questionText: newQMatch[1].trim(),
                    optionA: "",
                    optionB: "",
                    optionC: "",
                    optionD: "",
                    correctAnswer: ""
                }
                expectingNewQuestion = false
                continue
            }

            // If it is not an option and not an answer:
            if (expectingNewQuestion) {
                // Save previous question if exists
                if (currentQ) {
                    questions.push(currentQ)
                }

                // Strip leading numbers if they exist (e.g. "1. What is" -> "What is")
                const cleanedText = line.replace(/^(?:Question\s+)?\d+[\.\):-]\s*/i, "").trim()

                currentQ = {
                    questionText: cleanedText,
                    optionA: "",
                    optionB: "",
                    optionC: "",
                    optionD: "",
                    correctAnswer: ""
                }
                expectingNewQuestion = false
            } else {
                // Multiline question description append
                if (currentQ) {
                    currentQ.questionText += " " + line
                }
            }
        }

        if (currentQ) questions.push(currentQ)

        // Filter out items that are missing essential details to prevent DB crashes
        const validQuestions = questions.filter(q => 
            q.questionText.trim() && 
            q.optionA.trim() && 
            q.optionB.trim() && 
            q.optionC.trim() && 
            q.optionD.trim() && 
            q.correctAnswer.trim()
        )

        return { success: true, questions: validQuestions, totalParsed: questions.length, validCount: validQuestions.length }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to parse document" }
    }
}

/**
 * Creates and publishes an exam in a single transaction.
 */
export async function adminCreateExamAction(
    title: string, 
    duration: number, 
    questions: { 
        questionText: string, 
        optionA: string, 
        optionB: string, 
        optionC: string, 
        optionD: string, 
        correctAnswer: string 
    }[]
) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        if (!title.trim() || duration <= 0 || questions.length === 0) {
            return { success: false, error: "Invalid exam details or empty questions list" }
        }

        const newExam = await client.$transaction(async (tx) => {
            const exam = await tx.exam.create({
                data: {
                    title: title.trim(),
                    duration: Number(duration)
                }
            })

            // Batch insert questions
            await Promise.all(
                questions.map(q => 
                    tx.examQuestion.create({
                        data: {
                            examId: exam.id,
                            questionText: q.questionText.trim(),
                            optionA: q.optionA.trim(),
                            optionB: q.optionB.trim(),
                            optionC: q.optionC.trim(),
                            optionD: q.optionD.trim(),
                            correctAnswer: q.correctAnswer.trim().toUpperCase()
                        }
                    })
                )
            )

            return exam
        })

        return { success: true, exam: newExam, message: `Exam "${title}" successfully created with ${questions.length} questions.` }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Creates a new class/batch.
 */
export async function adminCreateClassAction(name: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        if (!name.trim()) {
            return { success: false, error: "Class name is required" }
        }

        const existingClass = await client.class.findUnique({
            where: { name: name.trim() }
        })

        if (existingClass) {
            return { success: false, error: `Class ${name} already exists.` }
        }

        const newClass = await client.class.create({
            data: { name: name.trim() }
        })

        return { success: true, class: newClass, message: `Class "${name}" created successfully!` }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to create class" }
    }
}

/**
 * Gets the list of all classes.
 */
export async function adminGetClassesAction() {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const classes = await client.class.findMany({
            orderBy: { name: "asc" }
        })

        return { success: true, classes }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to fetch classes" }
    }
}

/**
 * Parses student details from CSV, automatically creates classes, and updates/saves details.
 */
export async function adminUploadStudentsAction(csvText: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)
        if (lines.length <= 1) {
            return { success: false, error: "CSV file is empty or only contains header" }
        }

        let startIndex = 0
        const header = lines[0].toLowerCase()
        if (header.includes("roll") || header.includes("name") || header.includes("department")) {
            startIndex = 1
        }

        let createdCount = 0
        let errors: string[] = []

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i]
            const parts = line.split(",").map(p => p.trim())
            if (parts.length < 2) continue

            const rollNo = parts[0]
            const name = parts[1]
            const department = parts[2] || ""
            const className = parts[3] || ""
            const tempPassword = parts[4] || "123456"

            if (!rollNo || !name) {
                errors.push(`Row ${i + 1}: Missing Roll Number or Name`)
                continue
            }

            let classId: string | null = null
            if (className) {
                let dbClass = await client.class.findUnique({
                    where: { name: className }
                })
                if (!dbClass) {
                    dbClass = await client.class.create({
                        data: { name: className }
                    })
                }
                classId = dbClass.id
            }

            const existing = await client.student.findUnique({
                where: { rollNo }
            })

            if (existing) {
                await client.student.update({
                    where: { rollNo },
                    data: {
                        name,
                        department,
                        classId
                    }
                })
            } else {
                await client.student.create({
                    data: {
                        rollNo,
                        name,
                        department,
                        password: hashPassword(tempPassword),
                        isFirstLogin: true,
                        classId
                    }
                })
                createdCount++
            }
        }

        return { 
            success: true, 
            message: `Successfully processed student upload. Registered ${createdCount} new profiles.`,
            errors: errors.length > 0 ? errors.join("; ") : undefined
        }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Toggles "No Task" declaration for a class and a date.
 */
export async function adminDeclareNoTaskAction(date: string, classId: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const existing = await client.noTaskDeclaration.findUnique({
            where: {
                date_classId: {
                    date,
                    classId
                }
            }
        })

        if (existing) {
            await client.noTaskDeclaration.delete({
                where: { id: existing.id }
            })
            return { success: true, message: "Task requirement restored successfully." }
        } else {
            await client.noTaskDeclaration.create({
                data: {
                    date,
                    classId
                }
            })
            return { success: true, message: "Declared 'No Task' for this date and class." }
        }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Returns calculated attendance report (Present/Absent) based on 8 hours check-in + task completion.
 */
export async function adminGetAttendanceReportAction(date: string, classId: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const students = await client.student.findMany({
            where: { classId: classId || undefined },
            select: {
                id: true,
                name: true,
                rollNo: true,
                department: true,
                attendance: {
                    where: { date },
                    orderBy: { checkIn: "asc" }
                },
                submissions: {
                    include: { task: true }
                }
            }
        })

        const dayTasks = await client.task.findMany({
            select: { id: true, createdAt: true }
        })
        const tasksForDate = dayTasks.filter(t => {
            const d = new Date(t.createdAt)
            const offset = d.getTimezoneOffset()
            const dateStr = new Date(d.getTime() - (offset*60*1000)).toISOString().split('T')[0]
            return dateStr === date
        }).map(t => t.id)

        const noTaskDecl = await client.noTaskDeclaration.findUnique({
            where: {
                date_classId: {
                    date,
                    classId
                }
            }
        })
        const hasNoTaskDecl = !!noTaskDecl

        const report = students.map(student => {
            let totalMs = 0
            student.attendance.forEach(att => {
                if (att.checkIn) {
                    const checkInTime = new Date(att.checkIn).getTime()
                    const checkOutTime = att.checkOut ? new Date(att.checkOut).getTime() : Date.now()
                    totalMs += (checkOutTime - checkInTime)
                }
            })
            const totalHours = totalMs / (1000 * 60 * 60)

            let taskStatus = "NO_TASK"
            let taskMessage = "No Task Assigned"

            if (tasksForDate.length > 0 && !hasNoTaskDecl) {
                const approvedSubs = student.submissions.filter(s => tasksForDate.includes(s.taskId) && s.status === "APPROVED")
                const pendingSubs = student.submissions.filter(s => tasksForDate.includes(s.taskId) && s.status === "PENDING")

                if (approvedSubs.length > 0) {
                    taskStatus = "COMPLETED"
                    taskMessage = "Approved"
                } else if (pendingSubs.length > 0) {
                    taskStatus = "PENDING"
                    taskMessage = "Pending Review"
                } else {
                    taskStatus = "INCOMPLETE"
                    taskMessage = "Not Submitted"
                }
            } else if (hasNoTaskDecl) {
                taskStatus = "NO_TASK_DECLARED"
                taskMessage = "Declared: No Task"
            }

            const meetsHours = totalHours >= 8
            const meetsTask = (taskStatus === "NO_TASK" || taskStatus === "NO_TASK_DECLARED" || taskStatus === "COMPLETED")
            
            const isPresent = meetsHours && meetsTask

            return {
                studentId: student.id,
                name: student.name,
                rollNo: student.rollNo,
                department: student.department || "N/A",
                totalHours: Math.round(totalHours * 10) / 10,
                taskStatus,
                taskMessage,
                isPresent,
                attendanceLogs: student.attendance
            }
        })

        return { success: true, report, hasNoTaskDecl }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Updates details of a student profile.
 */
export async function adminUpdateStudentAction(
    studentId: string, 
    rollNo: string, 
    name: string, 
    department: string, 
    classId: string
) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const existing = await client.student.findFirst({
            where: {
                rollNo: rollNo.trim(),
                id: { not: studentId }
            }
        })

        if (existing) {
            return { success: false, error: `Roll number ${rollNo} is already registered to another student.` }
        }

        await client.student.update({
            where: { id: studentId },
            data: {
                rollNo: rollNo.trim(),
                name: name.trim(),
                department: department.trim() || null,
                classId: classId && classId.trim() !== "" ? classId.trim() : null
            }
        })

        return { success: true, message: "Student details updated successfully." }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Updates a specific attendance log session.
 */
export async function adminUpdateAttendanceAction(
    attendanceId: string,
    checkIn: string,
    checkOut: string | null
) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        await client.attendance.update({
            where: { id: attendanceId },
            data: {
                checkIn: new Date(checkIn),
                checkOut: checkOut ? new Date(checkOut) : null
            }
        })

        return { success: true, message: "Attendance session log updated successfully." }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Deletes a specific attendance log session.
 */
export async function adminDeleteAttendanceAction(attendanceId: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        await client.attendance.delete({
            where: { id: attendanceId }
        })

        return { success: true, message: "Attendance session log deleted successfully." }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Retrieves the list of all published exams.
 */
export async function adminGetExamsListAction() {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const exams = await client.exam.findMany({
            include: {
                questions: {
                    select: { id: true }
                }
            },
            orderBy: { createdAt: "desc" }
        })

        return { success: true, exams }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Deletes an existing exam.
 */
export async function adminDeleteExamAction(examId: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        await client.exam.delete({
            where: { id: examId }
        })

        return { success: true, message: "Exam and all related student attempts deleted successfully." }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
