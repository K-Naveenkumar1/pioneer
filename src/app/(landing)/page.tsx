import dynamic from "next/dynamic";
import CallToAction from "./_components/call-to-action";
import DasboardSnippet from "./_components/dashboard-snippet";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Home - Naveo",
    description: "Welcome to Naveo. Explore modern community platforms, interactive classrooms, secure online testing and robust learning tools all in one premium workspace.",
}

const PricingSection = dynamic(
    () => 
        import("./_components/pricing").then(
            (component) => component.PricingSection,
        ),
    { ssr: true}
)

export default function Home() {
    return (
        <main className="md:px-10 py-20 flex flex-col gap-36">
            <div>
                <CallToAction />
                <DasboardSnippet />
                <PricingSection />
            </div>
        </main>
    )
}
