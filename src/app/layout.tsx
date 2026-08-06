import MobileBlocker from "@/components/global/mobile-blocker"
import Preloader from "@/components/global/preloader"
import { ThemeProvider } from "@/components/theme"
import { ReactQueryProvider } from "@/react-query/provider"
import { ReduxProvider } from "@/redux/provider"
import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"] })

export const metadata: Metadata = {
    title: {
        default: "Naveo - Empowering Communities & Classrooms",
        template: "%s | Naveo"
    },
    description: "Naveo is a vibrant educational and community platform that empowers students and instructors to connect, collaborate, and excel together.",
    keywords: ["Naveo", "education", "student community", "classrooms", "exam portal", "online learning", "collaboration", "Pioneer"],
    authors: [{ name: "Naveen" }],
    creator: "Naveen",
    openGraph: {
        title: "Naveo - Empowering Communities & Classrooms",
        description: "A vibrant online community and exam platform for modern students and educators.",
        url: "https://naveo.com",
        siteName: "Naveo",
        locale: "en_US",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Naveo - Empowering Communities & Classrooms",
        description: "Connect, collaborate, and cultivate meaningful learning experiences.",
    },
    robots: {
        index: true,
        follow: true,
    }
}



export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${jakarta.className} bg-black`}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    disableTransitionOnChange
                >
                    <ReduxProvider>
                        <ReactQueryProvider>
                            <MobileBlocker />
                            <Preloader />
                            <div className="hidden lg:block min-h-screen">
                                {children}
                            </div>
                        </ReactQueryProvider>
                    </ReduxProvider>
                    <Toaster />
                </ThemeProvider>
            </body>
        </html>
    )
}
