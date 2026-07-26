"use server"

import { client } from "@/lib/prisma"
import { getAdminUser, getStudentUser } from "./custom-auth"
import fs from "fs"
import path from "path"
import { revalidatePath } from "next/cache"

/**
 * Uploads a file to public/uploads/ and returns the relative path and original name.
 */
export async function adminUploadFileAction(formData: FormData) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const file = formData.get("file") as File | null
        if (!file) return { success: false, error: "No file provided" }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const uploadDir = path.join(process.cwd(), "public", "uploads")
        if (!fs.existsSync(uploadDir)) {
            await fs.promises.mkdir(uploadDir, { recursive: true })
        }

        const fileExt = path.extname(file.name)
        const baseName = path.basename(file.name, fileExt).replace(/[^a-zA-Z0-9]/g, "_")
        const uniqueFilename = `${baseName}_${Date.now()}${fileExt}`
        const filePath = path.join(uploadDir, uniqueFilename)

        await fs.promises.writeFile(filePath, buffer)

        return { 
            success: true, 
            fileUrl: `/uploads/${uniqueFilename}`, 
            fileName: file.name 
        }
    } catch (e: any) {
        console.error("Upload error:", e)
        return { success: false, error: e.message || "Failed to upload file" }
    }
}

/**
 * Creates a new course material.
 */
export async function adminCreateMaterialAction(
    title: string, 
    description: string | null, 
    fileUrl: string | null, 
    fileName: string | null
) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        if (!title.trim()) return { success: false, error: "Title is required" }

        const material = await client.courseMaterial.create({
            data: {
                title: title.trim(),
                description: description?.trim() || null,
                fileUrl,
                fileName,
                isLocked: false
            }
        })

        revalidatePath("/admin/materials")
        revalidatePath("/student/materials")
        return { success: true, material }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to create material" }
    }
}

/**
 * Deletes a course material and its physical files.
 */
export async function adminDeleteMaterialAction(id: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const material = await client.courseMaterial.findUnique({ where: { id } })
        if (material && material.fileUrl) {
            const filePath = path.join(process.cwd(), "public", material.fileUrl)
            if (fs.existsSync(filePath)) {
                try {
                    await fs.promises.unlink(filePath)
                } catch (err) {
                    console.error("Failed to delete physical file:", err)
                }
            }
        }

        const pages = await client.courseMaterialPage.findMany({ where: { courseMaterialId: id } })
        for (const page of pages) {
            if (page.imageUrl) {
                const pageImagePath = path.join(process.cwd(), "public", page.imageUrl)
                if (fs.existsSync(pageImagePath)) {
                    try {
                        await fs.promises.unlink(pageImagePath)
                    } catch (err) {
                        console.error("Failed to delete physical page image:", err)
                    }
                }
            }
        }

        await client.courseMaterial.delete({ where: { id } })

        revalidatePath("/admin/materials")
        revalidatePath("/student/materials")
        return { success: true, message: "Course material deleted successfully" }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to delete material" }
    }
}

/**
 * Toggles the lock status of a course material.
 */
export async function adminToggleLockMaterialAction(id: string, isLocked: boolean) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        await client.courseMaterial.update({
            where: { id },
            data: { isLocked }
        })

        revalidatePath("/admin/materials")
        revalidatePath("/student/materials")
        return { success: true, message: isLocked ? "Material locked" : "Material unlocked" }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to update lock status" }
    }
}

/**
 * Fetches all course materials (Admin).
 */
export async function adminGetMaterialsAction() {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const materials = await client.courseMaterial.findMany({
            include: {
                pages: {
                    orderBy: {
                        pageNumber: "asc"
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        return { success: true, materials }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to fetch materials" }
    }
}

/**
 * Adds a page to a course material.
 */
export async function adminAddPageAction(
    materialId: string,
    pageNumber: number,
    title: string | null,
    content: string | null,
    imageUrl: string | null,
    isLocked: boolean
) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const page = await client.courseMaterialPage.create({
            data: {
                courseMaterialId: materialId,
                pageNumber,
                title: title?.trim() || null,
                content: content?.trim() || null,
                imageUrl,
                isLocked
            }
        })

        revalidatePath("/admin/materials")
        revalidatePath("/student/materials")
        return { success: true, page }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to add page" }
    }
}

/**
 * Updates a page of a course material.
 */
export async function adminUpdatePageAction(
    pageId: string,
    title: string | null,
    content: string | null,
    imageUrl: string | null,
    isLocked: boolean
) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const data: any = {
            title: title?.trim() || null,
            content: content?.trim() || null,
            isLocked
        }
        if (imageUrl !== undefined) {
            data.imageUrl = imageUrl
        }

        const page = await client.courseMaterialPage.update({
            where: { id: pageId },
            data
        })

        revalidatePath("/admin/materials")
        revalidatePath("/student/materials")
        return { success: true, page }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to update page" }
    }
}

/**
 * Deletes a page and its physical file.
 */
export async function adminDeletePageAction(pageId: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const page = await client.courseMaterialPage.findUnique({ where: { id: pageId } })
        if (page && page.imageUrl) {
            const filePath = path.join(process.cwd(), "public", page.imageUrl)
            if (fs.existsSync(filePath)) {
                try {
                    await fs.promises.unlink(filePath)
                } catch (err) {
                    console.error("Failed to delete physical page image:", err)
                }
            }
        }

        await client.courseMaterialPage.delete({ where: { id: pageId } })

        revalidatePath("/admin/materials")
        revalidatePath("/student/materials")
        return { success: true, message: "Page deleted successfully" }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to delete page" }
    }
}

/**
 * Toggles lock status of a specific page.
 */
export async function adminToggleLockPageAction(pageId: string, isLocked: boolean) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        await client.courseMaterialPage.update({
            where: { id: pageId },
            data: { isLocked }
        })

        revalidatePath("/admin/materials")
        revalidatePath("/student/materials")
        return { success: true, message: isLocked ? "Page locked" : "Page unlocked" }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to update page lock status" }
    }
}

/**
 * Fetches all course materials (Student).
 */
export async function studentGetMaterialsAction() {
    try {
        const student = await getStudentUser()
        if (!student) return { success: false, error: "Unauthorized" }

        const materials = await client.courseMaterial.findMany({
            include: {
                pages: {
                    orderBy: {
                        pageNumber: "asc"
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        return { success: true, materials }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to fetch materials" }
    }
}
