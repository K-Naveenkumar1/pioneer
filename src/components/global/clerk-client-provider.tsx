"use client"

import React, { useEffect, useState } from "react"
import { ClerkProvider } from "@clerk/nextjs"

export default function ClerkClientProvider({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        // Return children directly during Server-Side Rendering (SSR) and initial hydration.
        // This prevents Clerk v5 from executing synchronous server-side header checks on Next.js 15.
        return <>{children}</>
    }

    return <ClerkProvider>{children}</ClerkProvider>
}
