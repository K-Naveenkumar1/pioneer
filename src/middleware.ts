import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isProtectedRoute = createRouteMatcher([])

export default clerkMiddleware(async (auth, req) => {
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set("x-url", req.url)

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    })
})

export const config = {
    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}
