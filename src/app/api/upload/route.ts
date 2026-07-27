import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/actions/custom-auth"
import fs from "fs"
import path from "path"

export async function POST(req: NextRequest) {
    try {
        const admin = await getAdminUser()
        if (!admin) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
        }

        const formData = await req.formData()
        const file = formData.get("file") as File | null
        if (!file) {
            return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
        }

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

        return NextResponse.json({
            success: true,
            fileUrl: `/uploads/${uniqueFilename}`,
            fileName: file.name
        })
    } catch (e: any) {
        console.error("Upload route error:", e)
        return NextResponse.json({ success: false, error: e.message || "Failed to upload file" }, { status: 500 })
    }
}
