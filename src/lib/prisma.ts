import { PrismaClient } from "@prisma/client"

declare global {
    var prisma: PrismaClient | undefined
}

// If the cached global client is stale (e.g., from hot-reloads before schema push), bypass it
const isStale = globalThis.prisma && (!("courseMaterial" in globalThis.prisma) || !("resumeAnalysis" in globalThis.prisma))
export const client = (globalThis.prisma && !isStale) ? globalThis.prisma : new PrismaClient()

if (process.env.NODE_ENV !== "production") globalThis.prisma = client
