import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set("x-url", req.url)

    const pathname = req.nextUrl.pathname

    if (pathname === "/login") {
        const studentCookie = req.cookies.get("student_session")
        if (studentCookie && studentCookie.value) {
            return NextResponse.redirect(new URL("/student/dashboard", req.url))
        }
        const adminCookie = req.cookies.get("admin_session")
        if (adminCookie && adminCookie.value) {
            return NextResponse.redirect(new URL("/admin/dashboard", req.url))
        }
    }

    if (pathname === "/login/admin-auth-secure-2a9f5d") {
        const adminCookie = req.cookies.get("admin_session")
        if (adminCookie && adminCookie.value) {
            return NextResponse.redirect(new URL("/admin/dashboard", req.url))
        }
    }

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    })
}

export const config = {
    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}

