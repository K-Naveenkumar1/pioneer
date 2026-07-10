import { cookies } from "next/headers"
import crypto from "crypto"

// We use a fallback secret if SESSION_SECRET is not set in env
const SECRET = process.env.SESSION_SECRET || "pioneer_exam_lockdown_secret_key_12345!"
// AES-256-GCM needs 32 bytes key
const KEY = crypto.createHash("sha256").update(SECRET).digest()

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv)
    let encrypted = cipher.update(text, "utf8", "hex")
    encrypted += cipher.final("hex")
    const authTag = cipher.getAuthTag().toString("hex")
    return `${iv.toString("hex")}:${authTag}:${encrypted}`
}

export function decrypt(encryptedText: string): string | null {
    try {
        const parts = encryptedText.split(":")
        if (parts.length !== 3) return null
        const iv = Buffer.from(parts[0], "hex")
        const authTag = Buffer.from(parts[1], "hex")
        const encrypted = parts[2]
        
        const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv)
        decipher.setAuthTag(authTag)
        let decrypted = decipher.update(encrypted, "hex", "utf8")
        decrypted += decipher.final("utf8")
        return decrypted
    } catch (e) {
        return null
    }
}

export async function setSessionCookie(name: string, data: any, expiresDays = 7) {
    const cookieStore = await cookies()
    const serialized = JSON.stringify(data)
    const encrypted = encrypt(serialized)
    
    cookieStore.set(name, encrypted, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * expiresDays, // days
        path: "/",
    })
}

export async function getSessionCookie(name: string): Promise<any | null> {
    const cookieStore = await cookies()
    const cookie = cookieStore.get(name)
    if (!cookie || !cookie.value) return null
    
    const decrypted = decrypt(cookie.value)
    if (!decrypted) return null
    
    try {
        return JSON.parse(decrypted)
    } catch (e) {
        return null
    }
}

export async function deleteSessionCookie(name: string) {
    const cookieStore = await cookies()
    cookieStore.delete(name)
}
