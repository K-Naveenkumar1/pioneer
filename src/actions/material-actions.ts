"use server"

import { client } from "@/lib/prisma"
import { getAdminUser, getStudentUser } from "./custom-auth"
import fs from "fs"
import path from "path"
import { revalidatePath } from "next/cache"
// mammoth is dynamically imported inside autoGeneratePagesFromDocx (on-demand)


/**
 * Helper to auto-generate pages from a Word (.docx) document.
 */
async function autoGeneratePagesFromDocx(materialId: string, fileUrl: string) {
    try {
        const filePath = path.join(process.cwd(), "public", fileUrl)
        if (!fs.existsSync(filePath)) return

        const buffer = await fs.promises.readFile(filePath)
        const mammoth = (await import("mammoth")).default
        const result = await mammoth.convertToHtml({ buffer })
        const html = result.value

        // Split by headings (h1, h2, h3)
        let parts = html.split(/(?=<h[1-3][^>]*>)/i).map(p => p.trim()).filter(p => p.length > 0)

        // Fallback: If no headings are present, chunk by paragraphs (4 paragraphs per page)
        if (parts.length <= 1) {
            const paragraphs = html.split("</p>").map(p => p.trim()).filter(p => p.length > 0)
            parts = []
            for (let i = 0; i < paragraphs.length; i += 4) {
                const chunk = paragraphs.slice(i, i + 4).join("</p>") + (paragraphs[i + 3] ? "</p>" : "")
                if (chunk.trim()) parts.push(chunk)
            }
        }

        // Add pages to database
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i]
            let pageTitle = `Page ${i + 1}`
            let pageContent = part

            // Try to extract slide/page title from header tag
            const headingMatch = part.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/i)
            if (headingMatch) {
                pageTitle = headingMatch[1].replace(/<[^>]*>/g, "").trim()
                // Remove header tag from page content to avoid duplicate headings
                pageContent = part.replace(/<h[1-3][^>]*>.*?<\/h[1-3]>/i, "").trim()
            }

            await client.courseMaterialPage.create({
                data: {
                    courseMaterialId: materialId,
                    pageNumber: i + 1,
                    title: pageTitle || `Page ${i + 1}`,
                    content: pageContent,
                    isLocked: false
                }
            })
        }
    } catch (err) {
        console.error("Failed to auto-generate pages from Word docx:", err)
    }
}

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

        if (admin.adminRole === "SUPER_ADMIN") {
            return { success: false, error: "Super Admins are restricted from creating course materials. Material management is handled by Class Admins." }
        }

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

        // Auto-generate pages if Word Document is uploaded
        if (fileUrl && fileUrl.endsWith(".docx")) {
            await autoGeneratePagesFromDocx(material.id, fileUrl)
        }

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
 * Auto-generates pages from an uploaded .docx file for an existing course material.
 */
export async function adminGeneratePagesFromAttachmentAction(materialId: string) {
    try {
        const admin = await getAdminUser()
        if (!admin) return { success: false, error: "Unauthorized" }

        const material = await client.courseMaterial.findUnique({
            where: { id: materialId },
            include: { pages: true }
        })

        if (!material) return { success: false, error: "Material not found" }
        if (!material.fileUrl) return { success: false, error: "No file attachment found on this material" }
        if (!material.fileUrl.endsWith(".docx")) {
            return { success: false, error: "Only Word Document (.docx) files are supported for auto-page generation." }
        }

        // Delete existing pages to prevent duplicates
        await client.courseMaterialPage.deleteMany({
            where: { courseMaterialId: materialId }
        })

        await autoGeneratePagesFromDocx(materialId, material.fileUrl)

        revalidatePath("/admin/materials")
        revalidatePath("/student/materials")
        return { success: true, message: "Pages generated successfully from document!" }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to generate pages" }
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
