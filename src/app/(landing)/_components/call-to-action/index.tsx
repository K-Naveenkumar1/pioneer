import { getAdminUser, getStudentUser } from "@/actions/custom-auth"
import GradientText from "@/components/global/gradient-text"
import { Button } from "@/components/ui/button"
import { BadgePlus, LayoutDashboard } from "lucide-react"
import Link from "next/link"

const CallToAction = async () => {
  const student = await getStudentUser()
  const admin = !student ? await getAdminUser() : null
  const dashboardUrl = student ? "/student/dashboard" : admin ? "/admin/dashboard" : null

  return (
    <div className="relative flex flex-col items-start md:items-center gap-y-5 md:gap-y-0 text-left md:text-center pt-6 pb-4">
        {/* Background Gridlines */}
        <div 
          className="absolute inset-0 -z-10 pointer-events-none -top-16 h-[550px] w-full"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, #000 60%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, #000 60%, transparent 100%)',
          }}
        />
        <div className="overflow-hidden py-1">
          <GradientText className="text-[2.1875rem] md:text-[2.5rem] lg:text-[3.4375rem] xl:text-[4.375rem] 2xl:text-[5rem] leading-tight font-semibold animate-title-reveal" element="H1">
            Build Skills, Create Your Future
          </GradientText>
        </div>
        <p className="text-[15.5px] md:text-center text-left text-muted-foreground text-themeTextGrey mt-3">
          Naveo is a vibrant online learning platform that empowers students to learn, practice, take exams, and<br></br> build real-world skills through interactive courses and assessments.
        </p>
        <div className="flex md:flex-row flex-col md:justify-center gap-5 md:mt-5 w-full">
          <Button variant="outline" className="rounded-full bg-transparent text-base border-themeGrey">
            Watch Demo
          </Button>
          <Link href={dashboardUrl || "/login"}>
          <Button className="rounded-full text-base flex gap-2 w-full">
            {dashboardUrl ? <LayoutDashboard /> : <BadgePlus />}
            {dashboardUrl ? "Dashboard" : "Get Started"}
          </Button>
          </Link>
        </div>
    </div>
  )
}

export default CallToAction
