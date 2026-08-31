import { getAdminUser, getStudentUser } from "@/actions/custom-auth"
import GlassSheet from "@/components/global/glass-sheet"
import { Button } from "@/components/ui/button"
import { montserrat as logoFont } from "@/lib/fonts"
import { LayoutDashboard, MenuIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import Menu from "./menu"

const LandingPageNavbar = async () => {
  const student = await getStudentUser()
  const admin = !student ? await getAdminUser() : null
  const dashboardUrl = student ? "/student/dashboard" : admin ? "/admin/dashboard" : null

  return (
    <div className="w-full md:px-10 flex justify-between sticky top-0 items-center py-5 z-48">
        <div className="flex items-center gap-2.5">
            <Image src="/nk-logo.png" alt="Naveo Logo" width={34} height={26} className="object-contain" />
            <div className="animate-slide-name flex items-center">
                <p className={`${logoFont.className} font-bold text-[1.6rem] tracking-tight leading-none text-white`}>Naveo.</p>
            </div>
        </div>
        <Menu orientation="desktop"/>
        <div className="flex gap-2">
          {dashboardUrl ? (
            <Link href={dashboardUrl}>
              <Button className="rounded-xl text-base bg-white text-black hover:bg-zinc-200 flex items-center gap-2">
                <LayoutDashboard size={18} />
                Dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button className="rounded-xl text-base">
                Get Started
              </Button>
            </Link>
          )}
          <GlassSheet triggerClass="lg:hidden"
          trigger={
            <Button
              variant="ghost"
              className="hover:bg-transparent"
              >
                <MenuIcon size={30} />
              </Button>
          }>
            <Menu orientation="mobile"/>
          </GlassSheet>
        </div>
    </div>
  )
}

export default LandingPageNavbar
