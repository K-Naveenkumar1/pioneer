import { getAdminUser, getStudentUser } from "@/actions/custom-auth"
import GlassSheet from "@/components/global/glass-sheet"
import { Button } from "@/components/ui/button"
import { montserrat as logoFont } from "@/lib/fonts"
import { LayoutDashboard, MenuIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import Menu from "./menu"
import NavbarWrapper from "./navbar-wrapper"

const LandingPageNavbar = async () => {
  const student = await getStudentUser()
  const admin = !student ? await getAdminUser() : null
  const dashboardUrl = student ? "/student/dashboard" : admin ? "/admin/dashboard" : null

  return (
    <NavbarWrapper>
      <div className="flex items-center gap-2.5 shrink-0">
          <Image src="/nk-logo.png" alt="Naveo Logo" width={30} height={23} className="object-contain" />
          <div className="animate-slide-name flex items-center">
              <p className={`${logoFont.className} font-bold text-[1.4rem] tracking-tight leading-none text-white`}>Naveo.</p>
          </div>
      </div>
      <div className="mx-4 md:mx-6 lg:mx-8 flex items-center justify-center">
        <Menu orientation="desktop"/>
      </div>
      <div className="flex gap-2 items-center shrink-0">
        {dashboardUrl ? (
          <Link href={dashboardUrl}>
            <Button className="rounded-full text-base font-medium h-12 px-5 bg-white text-black hover:bg-zinc-200 flex items-center gap-2">
              <LayoutDashboard size={16} />
              Dashboard
            </Button>
          </Link>
        ) : (
          <Link href="/login">
            <Button className="rounded-full text-base font-medium h-12 px-5">
              Get Started
            </Button>
          </Link>
        )}
        <GlassSheet triggerClass="lg:hidden"
        trigger={
          <Button
            variant="ghost"
            className="hover:bg-transparent p-1 h-12 w-12 rounded-full flex items-center justify-center"
            >
              <MenuIcon size={22} />
            </Button>
        }>
          <Menu orientation="mobile"/>
        </GlassSheet>
      </div>
    </NavbarWrapper>
  )
}

export default LandingPageNavbar
