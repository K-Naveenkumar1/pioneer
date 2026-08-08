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

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://naveo.com"

export const metadata: Metadata = {
    metadataBase: new URL(baseUrl),
    title: {
        default: "Naveo | Modern Classroom & Community Platform",
        template: "%s | Naveo"
    },
    description: "Naveo empowers schools, institutions, and students with interactive digital notes, live exam portals, task workflows, and real-time collaboration tools.",
    keywords: [
        "Naveo",
        "Learning Management System",
        "Online Exam Portal",
        "Student Community Platform",
        "Digital Notes App",
        "Classroom Management",
        "Interactive Coding Exam",
        "EduTech Software",
        "Attendance Check-In System"
    ],
    authors: [{ name: "Naveen", url: baseUrl }],
    creator: "Naveen",
    publisher: "Naveo Inc.",
    alternates: {
        canonical: "/",
    },
    openGraph: {
        title: "Naveo | Modern Classroom & Community Platform",
        description: "A vibrant online community and exam platform for modern students, schools, and educators.",
        url: baseUrl,
        siteName: "Naveo",
        locale: "en_US",
        type: "website",
        images: [
            {
                url: "/nk-logo.png",
                width: 1200,
                height: 630,
                alt: "Naveo Platform Logo"
            }
        ]
    },
    twitter: {
        card: "summary_large_image",
        title: "Naveo | Modern Classroom & Community Platform",
        description: "Connect, collaborate, take exams, and cultivate meaningful learning experiences.",
        images: ["/nk-logo.png"]
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
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
