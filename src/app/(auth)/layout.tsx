import { onAuthenticatedUser } from "@/actions/auth"
import BackdropGradient from "@/components/global/backdrop-gradient"
import GlassCard from "@/components/global/glass-card"
import { redirect } from "next/navigation"
import Image from "next/image"
import { Montserrat } from "next/font/google"

const logoFont = Montserrat({ subsets: ["latin"], weight: ["700"] })

type Props = {
    children: React.ReactNode
}

const AuthLayout = async ({children}: Props) => {
    const user = await onAuthenticatedUser()

    if (user.status === 200) redirect("/callback/sign-in")
  return <div className="container h-screen flex justify-center items-center">
    <div className="flex flex-col w-full items-center py-24">
      <div className="flex items-center leading-none mb-8">
        <Image src="/nk-logo.png" alt="Naveo Logo" width={30} height={22} className="object-contain" />
        <div className="animate-slide-name flex items-center">
          <h2 className={`${logoFont.className} text-[1.5rem] font-bold text-white tracking-tight select-none leading-none`}>
            Naveo.
          </h2>
        </div>
      </div>
      <BackdropGradient className="w-8/12 h-4/6 opacity-45" container="flex flex-col items-center">
      <GlassCard className="xs:w-full md:w-7/12 lg:w-5/12 xl:w-4/12 p-7 mt-16">
      {children}
      </GlassCard>
      </BackdropGradient>
    </div>
  </div>
}

export default AuthLayout