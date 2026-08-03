import type { Metadata } from "next";
import dynamic from "next/dynamic";
import CallToAction from "./_components/call-to-action";
import DasboardSnippet from "./_components/dashboard-snippet";

export const metadata: Metadata = {
    title: "Naveo - Luxury Learning Platform",
    description: "Welcome to Naveo. Explore modern community platforms, interactive classrooms, secure online testing and robust learning tools all in one premium workspace.",
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
    return (
        <main className="md:px-10 py-20 flex flex-col gap-36">
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
