import GradientText from "@/components/global/gradient-text"
import { Button } from "@/components/ui/button"
import { BadgePlus, LayoutDashboard } from "lucide-react"
import Link from "next/link"
import { getStudentUser, getAdminUser } from "@/actions/custom-auth"

const CallToAction = async () => {
  const student = await getStudentUser()
  const admin = !student ? await getAdminUser() : null
  const dashboardUrl = student ? "/student/dashboard" : admin ? "/admin/dashboard" : null

  return (
    <div className="flex flex-col items-start md:items-center gap-y-5 md:gap-y-0 text-left md:text-center">
        <GradientText className="text-[2.1875rem] md:text-[2.5rem] lg:text-[3.4375rem] xl:text-[4.375rem] 2xl:text-[5rem] leading-tight font-semibold" element="H1">
        Bringing Communities Together 
        </GradientText>
        <p className="text-[15.5px] md:text-center text-left text-muted-foreground text-themeTextGrey mt-3">
          Naveo is a vibrant online learning platform that empowers students to learn, practice, take exams, and<br></br> build real-world skills through interactive courses and assessments.
        </p>
        <div className="flex md:flex-row flex-col md:justify-center gap-5 md:mt-5 w-full">
          <Button variant="outline" className="rounded-xl bg-transparent text-base border-themeGrey">
            Watch Demo
          </Button>
          <Link href={dashboardUrl || "/login"}>
          <Button className="rounded-xl text-base flex gap-2 w-full">
            {dashboardUrl ? <LayoutDashboard /> : <BadgePlus />}
            {dashboardUrl ? "Dashboard" : "Get Started"}
          </Button>
          </Link>
        </div>
    </div>
  )
}

export default CallToAction