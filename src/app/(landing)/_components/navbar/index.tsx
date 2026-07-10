import GlassSheet from "@/components/global/glass-sheet"
import { Button } from "@/components/ui/button"
import { BadgePlus, MenuIcon } from "lucide-react"
import Link from "next/link"
import Menu from "./menu"

type Props = {}

const LandingPageNavbar = (props: Props) => {
  return (
    <div className="w-full flex justify-between sticky top-0 items-center py-5 z-50">
        <div className="flex flex-col leading-none">
           <p className="font-bold text-2xl tracking-tight leading-none">Billionaire.</p>
            <span className="text-xs text-zinc-500 font-medium select-none -mt-0.95">created by Naveen</span>
        </div>
        <Menu orientation="desktop"/>
        <div className="flex gap-2">
          <Link href="/login">
            <Button className="rounded-2xl flex gap-2 text-base">
              <BadgePlus />
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