"use server"

import { client } from "@/lib/prisma"
import { getAdminUser } from "./custom-auth"
import { hashPassword } from "@/lib/hash"
import mammoth from "mammoth"

function getLocalDateString() {
    const d = new Date()
    const offset = d.getTimezoneOffset()
    const localDate = new Date(d.getTime() - (offset*60*1000))
    return localDate.toISOString().split('T')[0]
}

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

        // 1. Clean the list and filter out invalid rows
        const cleanedList = studentsList.map(item => ({
            name: item.name?.toString().trim(),
            rollNo: item.rollNo?.toString().trim(),
            className: item.className?.toString().trim()
        })).filter(item => item.name && item.rollNo)

        if (cleanedList.length === 0) {
            return { success: false, error: "No valid student rows to import." }
        }

        // 2. Fetch all existing student roll numbers to avoid duplicates
        const existingStudents = await client.student.findMany({
            select: { rollNo: true }
        })
        const existingRolls = new Set(existingStudents.map(s => s.rollNo))

        // 3. Extract unique class names and ensure they exist
        const uniqueClasses = Array.from(new Set(
            cleanedList.map(s => s.className).filter((c): c is string => !!c)
        ))

        const classMap: Record<string, string> = {}
        for (const clsName of uniqueClasses) {
            let cls = await client.class.findUnique({
                where: { name: clsName }
            })
            if (!cls) {
                cls = await client.class.create({
                    data: { name: clsName }
                })
            }
            classMap[clsName] = cls.id
        }

        // 4. Filter list for new students only
        const studentsToInsert = cleanedList.filter(s => !existingRolls.has(s.rollNo))
        const skippedCount = cleanedList.length - studentsToInsert.length

        // 5. Insert students in parallel chunks to optimize performance
        const CHUNK_SIZE = 50
        let createdCount = 0

        for (let i = 0; i < studentsToInsert.length; i += CHUNK_SIZE) {
            const chunk = studentsToInsert.slice(i, i + CHUNK_SIZE)
            await Promise.all(
                chunk.map(async (s) => {
                    const classId = s.className ? classMap[s.className] : null
                    await client.student.create({
                        data: {
                            name: s.name,
                            rollNo: s.rollNo,
                            password: hashPassword(s.rollNo), // default password is rollNo
                            isFirstLogin: true,
                            classId: classId
                        }
                    })
                })
            )
            createdCount += chunk.length
        }

        return { 
            success: true, 
            message: `Successfully registered ${createdCount} students. Skipped ${skippedCount} duplicate roll numbers.`,
            createdCount,
            skippedCount
        }
    } catch (e: any) {
        console.error("Batch import error:", e)
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
                allowedClassDate: true,
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
            data: { 
                isAllowedInClass: allowed,
                allowedClassDate: allowed ? "PENDING_" + getLocalDateString() : null
            }
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

        // Execute all dashboard queries in parallel to drastically improve loading speed
        const [studentCount, taskCount, examCount, activeCheckins] = await Promise.all([
            client.student.count(),
            client.task.count(),
            client.exam.count(),
            client.attendance.findMany({
                where: { checkOut: null },
                include: {
                    student: {
                        select: { name: true, rollNo: true }
                    }
                }
            })
        ])

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

        const rawLines = text.split(/\r?\n/)
        const questions: any[] = []
        let currentQ: any = null
        let expectingNewQuestion = true

        for (let i = 0; i < rawLines.length; i++) {
            const rawLine = rawLines[i]
            const line = rawLine.trim()

            if (line.length === 0) {
                if (currentQ && !currentQ.optionA) {
                    currentQ.questionText += "\n"
                }
                continue
            }

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

            // If we already have Option A populated, and this line doesn't match an option or answer,
            // then we should start a new question to prevent merging multiple questions together.
            if (currentQ && currentQ.optionA && !optMatch && !ansMatch) {
                questions.push(currentQ)
                currentQ = {
                    questionText: line,
                    optionA: "",
                    optionB: "",
                    optionC: "",
                    optionD: "",
                    correctAnswer: ""
                }
                expectingNewQuestion = false
                continue
            }

            // If it is a new question starting with a number (e.g. "16. What is...", "[16] What...", "(16) What...")
            const newQMatch = line.match(/^(?:Question\s+)?(?:\[\d+\]|\(?\d+\)[\.\):-]?|\d+[\.\):-])\s*(.*)$/i)
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

                // Strip leading numbers if they exist
                const cleanedText = line.replace(/^(?:Question\s+)?(?:\[\d+\]|\(?\d+\)[\.\):-]?|\d+[\.\):-])\s*/i, "").trim()

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
                    currentQ.questionText += "\n" + rawLine
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
    }[],
    examCode: string,
    classId?: string | null
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
                    duration: Number(duration),
                    examCode: examCode.trim() || null,
                    classId: classId && classId.trim() !== "" ? classId.trim() : null
                }
            })

            // Batch insert questions in a single fast query
            await tx.examQuestion.createMany({
                data: questions.map(q => ({
                    examId: exam.id,
                    questionText: q.questionText.trim(),
                    optionA: q.optionA.trim(),
                    optionB: q.optionB.trim(),
                    optionC: q.optionC.trim(),
                    optionD: q.optionD.trim(),
                    correctAnswer: q.correctAnswer.trim().toUpperCase()
                }))
            })

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

        // 1. Fetch dayTasks and noTaskDecl first
        const [dayTasks, noTaskDecl] = await Promise.all([
            client.task.findMany({
                select: { id: true, createdAt: true }
            }),
            client.noTaskDeclaration.findUnique({
                where: {
                    date_classId: {
                        date,
                        classId
                    }
                }
            })
        ])

        const tasksForDate = dayTasks.filter(t => {
            const d = new Date(t.createdAt)
            const offset = d.getTimezoneOffset()
            const dateStr = new Date(d.getTime() - (offset*60*1000)).toISOString().split('T')[0]
            return dateStr === date
        }).map(t => t.id)

        const hasNoTaskDecl = !!noTaskDecl

        // 2. Fetch students, filtering their submissions to only contain the relevant tasks for this date
        const students = await client.student.findMany({
            where: { classId: classId || undefined },
            select: {
                id: true,
                name: true,
                rollNo: true,
                department: true,
                isAllowedInClass: true,
                allowedClassDate: true,
                attendance: {
                    where: { date },
                    orderBy: { checkIn: "asc" }
                },
                submissions: {
                    where: tasksForDate.length > 0 ? {
                        taskId: { in: tasksForDate }
                    } : {
                        id: "none" // empty result
                    },
                    select: {
                        taskId: true,
                        status: true
                    }
                }
            }
        })

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
            
            const isAllowed = student.isAllowedInClass && 
                (student.allowedClassDate === date || student.allowedClassDate === "PENDING_" + date)
            const hasLogs = student.attendance.length > 0
            const isPresent = isAllowed || hasLogs

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
    classId: string,
    newPassword?: string
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

        const updateData: any = {
            rollNo: rollNo.trim(),
            name: name.trim(),
            department: department.trim() || null,
            classId: classId && classId.trim() !== "" ? classId.trim() : null
        }

        if (newPassword && newPassword.trim() !== "") {
            updateData.password = hashPassword(newPassword.trim())
            updateData.isFirstLogin = true
        }

        await client.student.update({
            where: { id: studentId },
            data: updateData
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
                },
                class: {
                    select: { id: true, name: true }
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

/**
 * Manually marks a student present or absent (deletes logs or blocks access).
 */
export async function adminSetAttendanceStatusAction(studentId: string, date: string, isPresent: boolean) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        // Update student checkin access permission (Present = Allowed but pending, Absent = Blocked)
        await client.student.update({
            where: { id: studentId },
            data: { 
                isAllowedInClass: isPresent,
                allowedClassDate: isPresent ? "PENDING_" + date : null
            }
        })

        return { success: true, message: "Attendance status updated successfully." }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to update attendance status" }
    }
}

/**
 * Manually marks multiple students present or absent at once.
 */
export async function adminBatchSetAttendanceStatusAction(
    studentIds: string[],
    date: string,
    isPresent: boolean
) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        // Update all students' checkin access permissions (Present = Allowed but pending, Absent = Blocked)
        await client.student.updateMany({
            where: { id: { in: studentIds } },
            data: { 
                isAllowedInClass: isPresent,
                allowedClassDate: isPresent ? "PENDING_" + date : null
            }
        })

        return { success: true, message: "Attendance statuses updated successfully." }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to update attendance status" }
    }
}

/**
 * Blocks check-in permission for all students in a class.
 */
export async function adminBlockAllCheckinsAction(classId: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        await client.student.updateMany({
            where: { classId: classId || undefined },
            data: {
                isAllowedInClass: false,
                allowedClassDate: null
            }
        })

        return { success: true, message: "All check-in permissions for this class have been blocked." }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Unblocks check-in permission for all students in a class for a date.
 */
export async function adminUnblockAllCheckinsAction(classId: string, date: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        await client.student.updateMany({
            where: { classId: classId || undefined },
            data: {
                isAllowedInClass: true,
                allowedClassDate: date
            }
        })

        return { success: true, message: "All check-in permissions for this class have been unblocked." }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Grants access to checked-in students marked present for a date in a class.
 */
export async function adminGiveCheckinAccessAction(classId: string, date: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const pendingPrefix = "PENDING_" + date
        const result = await client.student.updateMany({
            where: {
                classId: classId || undefined,
                isAllowedInClass: true,
                allowedClassDate: pendingPrefix
            },
            data: {
                allowedClassDate: date
            }
        })

        return { success: true, message: `Access granted successfully to student check-ins.` }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Ends check-in session for all students in a class, checking them out and blocking access.
 */
export async function adminEndCheckinAction(classId: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const dateStr = getLocalDateString()

        // 1. Block access for all students in this class
        await client.student.updateMany({
            where: { classId: classId || undefined },
            data: {
                isAllowedInClass: false,
                allowedClassDate: null
            }
        })

        // 2. Find all active attendance records for students in this class
        const activeAttendances = await client.attendance.findMany({
            where: {
                student: {
                    classId: classId || undefined
                },
                checkOut: null
            }
        })

        // 3. Update active attendance records to be checked out now
        if (activeAttendances.length > 0) {
            await client.attendance.updateMany({
                where: {
                    id: { in: activeAttendances.map(a => a.id) }
                },
                data: {
                    checkOut: new Date()
                }
            })
        }

        return { 
            success: true, 
            message: `Check-in session ended. ${activeAttendances.length} student(s) checked out, and check-in access blocked.` 
        }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Retrieves the full details of a specific exam including all its questions.
 */
export async function adminGetExamDetailsAction(examId: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const exam = await client.exam.findUnique({
            where: { id: examId },
            include: {
                questions: true
            }
        })

        if (!exam) return { success: false, error: "Exam not found" }

        return { success: true, exam }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Updates an existing exam title, duration, passcode, and aligns its MCQ questions list.
 */
export async function adminUpdateExamAction(
    examId: string,
    title: string,
    duration: number,
    examCode: string,
    questions: {
        id?: string
        questionText: string
        optionA: string
        optionB: string
        optionC: string
        optionD: string
        correctAnswer: string
    }[],
    classId?: string | null
) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        await client.$transaction(async (tx) => {
            // Update parent Exam record
            await tx.exam.update({
                where: { id: examId },
                data: {
                    title: title.trim(),
                    duration: Number(duration),
                    examCode: examCode.trim() || null,
                    classId: classId && classId.trim() !== "" ? classId.trim() : null
                }
            })

            // Retrieve current questions stored for this exam (all fields to compare changes)
            const existingQuestions = await tx.examQuestion.findMany({
                where: { examId }
            })
            const existingIds = existingQuestions.map(q => q.id)

            // Filter incoming questions that already exist
            const incomingIds = questions.filter(q => q.id).map(q => q.id!)

            // 1. Delete questions that were removed in the edit screen
            const idsToDelete = existingIds.filter(id => !incomingIds.includes(id))
            if (idsToDelete.length > 0) {
                await tx.examQuestion.deleteMany({
                    where: { id: { in: idsToDelete } }
                })
            }

            // 2. Build list of write promises (only update if fields differ)
            const writePromises = questions.map(q => {
                if (q.id && existingIds.includes(q.id)) {
                    const existing = existingQuestions.find(ex => ex.id === q.id)
                    if (existing) {
                        const hasChanged = 
                            existing.questionText !== q.questionText.trim() ||
                            existing.optionA !== q.optionA.trim() ||
                            existing.optionB !== q.optionB.trim() ||
                            existing.optionC !== q.optionC.trim() ||
                            existing.optionD !== q.optionD.trim() ||
                            (existing.correctAnswer?.toUpperCase() ?? "") !== q.correctAnswer.trim().toUpperCase()

                        if (!hasChanged) return null // No changes, skip update query!
                    }

                    return tx.examQuestion.update({
                        where: { id: q.id },
                        data: {
                            questionText: q.questionText.trim(),
                            optionA: q.optionA.trim(),
                            optionB: q.optionB.trim(),
                            optionC: q.optionC.trim(),
                            optionD: q.optionD.trim(),
                            correctAnswer: q.correctAnswer.trim().toUpperCase()
                        }
                    })
                } else {
                    return tx.examQuestion.create({
                        data: {
                            examId,
                            questionText: q.questionText.trim(),
                            optionA: q.optionA.trim(),
                            optionB: q.optionB.trim(),
                            optionC: q.optionC.trim(),
                            optionD: q.optionD.trim(),
                            correctAnswer: q.correctAnswer.trim().toUpperCase()
                        }
                    })
                }
            }).filter((p): p is Exclude<typeof p, null> => p !== null)

            // Run updates/creations concurrently
            await Promise.all(writePromises)
        }, {
            maxWait: 15000,
            timeout: 35000
        })

        return { success: true, message: "Exam updated successfully." }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Checks if No Task status is declared for a class and a specific date.
 */
export async function adminCheckNoTaskAction(date: string, classId: string) {
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

        return { success: true, declared: !!existing }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Retrieves all student attempts for a specific exam, categorizing them into live and completed.
 */
export async function adminGetExamSubmissionsAction(examId: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const exam = await client.exam.findUnique({
            where: { id: examId },
            select: { classId: true }
        })
        if (!exam) return { success: false, error: "Exam not found" }

        const attemptsWhere: any = { examId }
        if (exam.classId) {
            attemptsWhere.student = { classId: exam.classId }
        }

        const attempts = await client.examAttempt.findMany({
            where: attemptsWhere,
            include: {
                student: {
                    select: { name: true, rollNo: true }
                },
                exam: {
                    select: {
                        type: true,
                        questions: {
                            select: { id: true, correctAnswer: true }
                        }
                    }
                }
            },
            orderBy: { startedAt: "desc" }
        })

        const completedList = []
        const liveList = []

        for (const att of attempts) {
            const totalQuestions = att.exam.questions.length
            const isCoding = att.exam.type === "CODING"

            if (att.completedAt) {
                let displayMarks = ""
                if (isCoding) {
                    const codingSubmissionsMap = JSON.parse(att.codingSubmissions || "{}")
                    let totalMarks = 0
                    att.exam.questions.forEach(q => {
                        const sub = codingSubmissionsMap[q.id]
                        if (sub) {
                            totalMarks += sub.marks || 0
                        }
                    })
                    displayMarks = `${totalMarks} pts / ${totalQuestions * 100} pts`
                } else {
                    const answersMap = JSON.parse(att.answers || "{}")
                    let correctCount = 0
                    att.exam.questions.forEach(q => {
                        const studentAns = answersMap[q.id]
                        if (studentAns && q.correctAnswer && studentAns.trim().toUpperCase() === q.correctAnswer.trim().toUpperCase()) {
                            correctCount++
                        }
                    })
                    displayMarks = `${correctCount} / ${totalQuestions}`
                }

                completedList.push({
                    id: att.id,
                    studentName: att.student.name,
                    rollNo: att.student.rollNo,
                    score: att.score,
                    marks: displayMarks,
                    warnings: att.warnings,
                    startedAt: att.startedAt,
                    completedAt: att.completedAt
                })
            } else {
                // Live writing attempt monitoring
                let answeredCount = 0
                let answeredQuestions: string[] = []
                if (isCoding) {
                    const codingSubmissionsMap = JSON.parse(att.codingSubmissions || "{}")
                    answeredCount = Object.keys(codingSubmissionsMap).length
                    answeredQuestions = Object.keys(codingSubmissionsMap)
                } else {
                    const answersMap = JSON.parse(att.answers || "{}")
                    answeredCount = Object.keys(answersMap).length
                    answeredQuestions = Object.keys(answersMap)
                }

                liveList.push({
                    id: att.id,
                    studentName: att.student.name,
                    rollNo: att.student.rollNo,
                    warnings: att.warnings,
                    startedAt: att.startedAt,
                    answeredCount,
                    totalQuestions,
                    answeredQuestions,
                    questions: att.exam.questions.map((q: any) => ({ id: q.id }))
                })
            }
        }

        return {
            success: true,
            completed: completedList,
            live: liveList
        }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Revokes / Deletes a student's exam attempt to let them re-take/rewrite it.
 */
export async function adminResetExamAttemptAction(attemptId: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        await client.examAttempt.delete({
            where: { id: attemptId }
        })

        return { success: true, message: "Student attempt revoked. They are allowed to rewrite the exam." }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Force-terminates a student's active exam attempt and grades the current answers.
 */
export async function adminForceSubmitExamAttemptAction(attemptId: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const attempt = await client.examAttempt.findUnique({
            where: { id: attemptId },
            include: {
                exam: {
                    select: {
                        type: true,
                        questions: { select: { id: true, correctAnswer: true } }
                    }
                }
            }
        })

        if (!attempt) return { success: false, error: "Attempt not found" }
        if (attempt.completedAt) return { success: false, error: "Attempt is already completed" }

        const questions = attempt.exam.questions
        let finalScore = 0

        if (attempt.exam.type === "CODING") {
            const codingSubmissionsMap = JSON.parse(attempt.codingSubmissions || "{}")
            let earned = 0
            questions.forEach(q => {
                const sub = codingSubmissionsMap[q.id]
                if (sub) earned += sub.marks || 0
            })
            finalScore = earned
        } else {
            const answersMap = JSON.parse(attempt.answers || "{}")
            let correctCount = 0
            questions.forEach(q => {
                const studentAns = answersMap[q.id]
                if (studentAns && q.correctAnswer && studentAns.trim().toUpperCase() === q.correctAnswer.trim().toUpperCase()) {
                    correctCount++
                }
            })
            finalScore = correctCount
        }

        await client.examAttempt.update({
            where: { id: attemptId },
            data: {
                score: finalScore,
                completedAt: new Date()
            }
        })

        return { success: true, message: "Attempt force submitted and graded successfully." }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Creates and publishes a coding exam.
 */
export async function adminCreateCodingExamAction(
    title: string,
    duration: number,
    examCode: string,
    questions: {
        title: string,
        questionText: string,
        constraints: string,
        inputFormat: string,
        outputFormat: string,
        sampleInput: string,
        sampleOutput: string,
        testCases: string // JSON representation
    }[],
    classId?: string | null
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
                    type: "CODING",
                    duration: Number(duration),
                    examCode: examCode.trim() || null,
                    classId: classId && classId.trim() !== "" ? classId.trim() : null
                }
            })

            // Batch insert questions
            await tx.examQuestion.createMany({
                data: questions.map(q => ({
                    examId: exam.id,
                    title: q.title.trim(),
                    questionText: q.questionText.trim(),
                    constraints: q.constraints.trim(),
                    inputFormat: q.inputFormat.trim(),
                    outputFormat: q.outputFormat.trim(),
                    sampleInput: q.sampleInput.trim(),
                    sampleOutput: q.sampleOutput.trim(),
                    testCases: q.testCases.trim()
                }))
            })

            return exam
        })

        return { success: true, message: "Coding Exam created successfully!", examId: newExam.id }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to create coding exam" }
    }
}

export async function adminStartTypingSessionAction(passage: string, timeLimit: number = 60, classId: string, password?: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        if (!passage.trim()) {
            return { success: false, error: "Passage cannot be empty" }
        }

        if (!classId) {
            return { success: false, error: "Class must be selected" }
        }

        await client.typingGameSession.updateMany({
            where: { isActive: true, classId },
            data: { isActive: false }
        })

        const session = await client.typingGameSession.create({
            data: {
                isActive: true,
                passage: passage.trim(),
                timeLimit,
                classId,
                password: password && password.trim() !== "" ? password.trim() : null
            }
        })

        return { success: true, sessionId: session.id, message: "Typing game session started!" }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Ends a Typing Game session.
 */
export async function adminEndTypingSessionAction(sessionId: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        await client.typingGameSession.update({
            where: { id: sessionId },
            data: { isActive: false }
        })

        return { success: true, message: "Typing game session ended." }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Returns all runs for the specified Typing Game session, sorted by progress and WPM.
 */
export async function adminGetTypingLeaderboardAction(sessionId: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const session = await client.typingGameSession.findUnique({
            where: { id: sessionId },
            select: { isActive: true }
        })

        const runs = await client.typingGameRun.findMany({
            where: { sessionId },
            include: {
                student: {
                    select: {
                        name: true,
                        rollNo: true
                    }
                }
            },
            orderBy: [
                { wpm: "desc" },
                { accuracy: "desc" },
                { progressPercentage: "desc" }
            ]
        })

        return { success: true, runs, isActive: session ? session.isActive : false }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Retrieves the ranked leaderboard of students in the specified class for admin viewing.
 */
export async function adminGetLeaderboardAction(classId: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        if (!classId || classId.trim() === "") {
            return { success: false, error: "Please select a valid class." }
        }

        // Fetch target classmates, class details, tasks, and no-task declarations in parallel
        const [classmates, targetClass, allTasks, noTasks] = await Promise.all([
            client.student.findMany({
                where: { classId },
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
            client.class.findUnique({
                where: { id: classId },
                select: { name: true }
            }),
            client.task.findMany({
                select: { id: true, createdAt: true }
            }),
            client.noTaskDeclaration.findMany({
                where: { classId },
                select: { date: true }
            })
        ])

        const taskDates: { [dateStr: string]: string[] } = {}
        allTasks.forEach(t => {
            const d = new Date(t.createdAt)
            const offset = d.getTimezoneOffset()
            const dateStr = new Date(d.getTime() - (offset*60*1000)).toISOString().split('T')[0]
            if (!taskDates[dateStr]) taskDates[dateStr] = []
            taskDates[dateStr].push(t.id)
        })

        const noTaskDates = new Set(noTasks.map(nt => nt.date))

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

export async function adminDeleteStudentsAction(studentIds: string[]) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        if (!studentIds || studentIds.length === 0) {
            return { success: false, error: "No students selected for deletion" }
        }

        // Run deletion of related records in a transaction to handle relationMode = "prisma"
        await client.$transaction([
            client.attendance.deleteMany({ where: { studentId: { in: studentIds } } }),
            client.taskSubmission.deleteMany({ where: { studentId: { in: studentIds } } }),
            client.examAttempt.deleteMany({ where: { studentId: { in: studentIds } } }),
            client.note.deleteMany({ where: { studentId: { in: studentIds } } }),
            client.studentMessage.deleteMany({ where: { studentId: { in: studentIds } } }),
            client.typingGameRun.deleteMany({ where: { studentId: { in: studentIds } } }),
            client.student.deleteMany({ where: { id: { in: studentIds } } })
        ])
        return { success: true, message: `${studentIds.length} student(s) deleted successfully.` }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to delete students" }
    }
}

/**
 * Ends a published exam, preventing new student attempts.
 */
export async function adminEndExamAction(examId: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        await client.exam.update({
            where: { id: examId },
            data: { isActive: false }
        })

        return { success: true, message: "Exam ended successfully. Students can no longer attend this exam." }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to end exam" }
    }
}

/**
 * Reactivates an ended exam, allowing students to take it again.
 */
export async function adminPublishExamAgainAction(examId: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        await client.exam.update({
            where: { id: examId },
            data: { isActive: true }
        })

        return { success: true, message: "Exam republished successfully. Students can now attend this exam again." }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to republish exam" }
    }
}
