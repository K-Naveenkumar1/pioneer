import ClerkClientProvider from "@/components/global/clerk-client-provider"
import MobileBlocker from "@/components/global/mobile-blocker"
import { ThemeProvider } from "@/components/theme"
import { ReactQueryProvider } from "@/react-query/provider"
import { ReduxProvider } from "@/redux/provider"
import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"] })

export const metadata: Metadata = {
    title: "Naveo - Created By Naveen",
    description: "Luxury education at affordable price",
}



export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <ClerkClientProvider>
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
                                <div className="hidden lg:block min-h-screen">
                                    {children}
                                </div>
                            </ReactQueryProvider>
                        </ReduxProvider>
                        <Toaster />
                    </ThemeProvider>
                </body>
            </html>
        </ClerkClientProvider>
    )
}
