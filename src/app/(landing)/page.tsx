import type { Metadata } from "next";
import dynamic from "next/dynamic";
import CallToAction from "./_components/call-to-action";
import DasboardSnippet from "./_components/dashboard-snippet";

export const metadata: Metadata = {
    title: "Naveo | All-in-One Learning & Classroom Management Platform",
    description: "Discover Naveo: the premier educational workspace featuring online exams, digital notes, automated attendance, coding assessments, and real-time student collaboration.",
}

const PricingSection = dynamic(
    () => 
        import("./_components/pricing").then(
            (component) => component.PricingSection,
        ),
    { ssr: true}
)

const FeaturesSection = dynamic(
    () => 
        import("./_components/features").then(
            (component) => component.FeaturesSection,
        ),
    { ssr: true}
)

const ContactSection = dynamic(
    () => 
        import("./_components/contact").then(
            (component) => component.ContactSection,
        ),
    { ssr: true}
)

export default function Home() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "SoftwareApplication",
                "name": "Naveo",
                "operatingSystem": "Web",
                "applicationCategory": "EducationalApplication",
                "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "USD"
                },
                "description": "Naveo is an all-in-one classroom management and learning platform offering online exams, coding challenges, digital notes, and attendance tracking."
            },
            {
                "@type": "Organization",
                "name": "Naveo",
                "url": process.env.NEXT_PUBLIC_APP_URL || "https://naveo.com",
                "logo": `${process.env.NEXT_PUBLIC_APP_URL || "https://naveo.com"}/nk-logo.png`,
                "sameAs": []
            }
        ]
    }

    return (
        <main className="md:px-10 py-20 flex flex-col gap-36">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <div>
                <CallToAction />
                <DasboardSnippet />
                <FeaturesSection />
                <PricingSection />
                <ContactSection />
            </div>
        </main>
    )
}

