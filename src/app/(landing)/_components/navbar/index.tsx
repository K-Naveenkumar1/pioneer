import GlassSheet from "@/components/global/glass-sheet"
import { Button } from "@/components/ui/button"
import { MenuIcon } from "lucide-react"
import { montserrat as logoFont } from "@/lib/fonts"
import Image from "next/image"
import Link from "next/link"
import Menu from "./menu"

const LandingPageNavbar = () => {
  return (
    <div className="w-full flex justify-between sticky top-0 items-center py-5 z-50">
        <div className="flex items-center gap-2.5">
            <Image src="/nk-logo.png" alt="Naveo Logo" width={34} height={26} className="object-contain" />
            <div className="animate-slide-name flex items-center">
                <p className={`${logoFont.className} font-bold text-[1.6rem] tracking-tight leading-none text-white`}>Naveo.</p>
            </div>
        </div>
        <Menu orientation="desktop"/>
        <div className="flex gap-2">
          <Link href="/login">
            <Button className="rounded-2xl text-base">
              Get Started
            </Button>
          </Link>
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