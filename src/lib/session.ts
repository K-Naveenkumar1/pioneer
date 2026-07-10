import { cookies, headers } from "next/headers"
import crypto from "crypto"

// We use a fallback secret if SESSION_SECRET is not set in env
const SECRET = process.env.SESSION_SECRET || "pioneer_exam_lockdown_secret_key_12345!"
// AES-256-GCM needs 32 bytes key
const KEY = crypto.createHash("sha256").update(SECRET).digest()

// Log the status of key initialization
console.log(`[session.ts] Crypto KEY initialized. Secret prefix: "${SECRET.substring(0, 4)}...", Secret length: ${SECRET.length}`)

/**
 * Checks if an error is a Next.js dynamic server usage error.
 * These errors must be rethrown so that Next.js knows a page or segment is dynamic.
 */
export function isNextDynamicServerError(err: any): boolean {
    if (!err) return false
    return (
        err.digest === "DYNAMIC_SERVER_USAGE" ||
        (err.message && err.message.includes("Dynamic server usage")) ||
        err.code === "DYNAMIC_SERVER_USAGE"
    )
}

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
        if (parts.length !== 3) {
            console.warn(`[session.ts:decrypt] Invalid encrypted text structure (parts count: ${parts.length})`)
            return null
        }
        const iv = Buffer.from(parts[0], "hex")
        const authTag = Buffer.from(parts[1], "hex")
        const encrypted = parts[2]
        
        const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv)
        decipher.setAuthTag(authTag)
        let decrypted = decipher.update(encrypted, "hex", "utf8")
        decrypted += decipher.final("utf8")
        return decrypted
    } catch (e: any) {
        console.error(`[session.ts:decrypt] Error during session decryption: ${e.message}`)
        return null
    }
}

export async function setSessionCookie(name: string, data: any, expiresDays = 7) {
    const cookieStore = await cookies()
    let isSecure = false
    
    try {
        const headersList = await headers()
        const xForwardedProto = headersList.get("x-forwarded-proto")
        const xForwardedSsl = headersList.get("x-forwarded-ssl")
        const frontEndHttps = headersList.get("front-end-https")
        const xUrl = headersList.get("x-url")
        
        const protocolIsHttps = 
            xForwardedProto === "https" || 
            xForwardedSsl === "on" || 
            frontEndHttps === "on" ||
            (xUrl && xUrl.startsWith("https://"))
        
        // If we are on HTTPS, make it secure. If we are on HTTP, do not make it secure (so the browser can store it).
        isSecure = !!protocolIsHttps
        
        console.log(`[session.ts:setSessionCookie] Setting cookie "${name}" with secure=${isSecure} (x-forwarded-proto: ${xForwardedProto}, x-url: ${xUrl})`)
    } catch (e: any) {
        // Fallback to process.env in case headers() fails or isn't available
        isSecure = process.env.NODE_ENV === "production"
        console.warn(`[session.ts:setSessionCookie] Headers check failed: ${e.message}. Falling back to secure=${isSecure}`)
    }

    const serialized = JSON.stringify(data)
    const encrypted = encrypt(serialized)
    
    cookieStore.set(name, encrypted, {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * expiresDays, // days
        path: "/",
    })
}

export async function getSessionCookie(name: string): Promise<any | null> {
    try {
        const cookieStore = await cookies()
        const cookie = cookieStore.get(name)
        if (!cookie) {
            console.log(`[session.ts:getSessionCookie] Cookie not found: "${name}"`)
            return null
        }
        if (!cookie.value) {
            console.warn(`[session.ts:getSessionCookie] Cookie "${name}" has no value`)
            return null
        }
        
        const decrypted = decrypt(cookie.value)
        if (!decrypted) {
            console.error(`[session.ts:getSessionCookie] Failed to decrypt cookie "${name}"`)
            return null
        }
        
        try {
            return JSON.parse(decrypted)
        } catch (jsonErr: any) {
            console.error(`[session.ts:getSessionCookie] Failed to parse JSON for cookie "${name}": ${jsonErr.message}`)
            return null
        }
    } catch (err: any) {
        if (isNextDynamicServerError(err)) {
            throw err // Rethrow to let Next.js handle dynamic rendering detection
        }
        console.error(`[session.ts:getSessionCookie] Error retrieving cookie "${name}": ${err.message}`)
        return null
    }
}

export async function deleteSessionCookie(name: string) {
    const cookieStore = await cookies()
    cookieStore.delete(name)
}
