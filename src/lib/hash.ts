import crypto from "crypto"

const SALT = process.env.PASSWORD_SALT || "pioneer_salt_key_99_secret_salt"

export function hashPassword(password: string): string {
    return crypto.pbkdf2Sync(password, SALT, 1000, 64, "sha512").toString("hex")
}

export function verifyPassword(password: string, hash: string): boolean {
    return hashPassword(password) === hash
}
