import { onAuthenticatedUser } from "@/actions/auth"
import BackdropGradient from "@/components/global/backdrop-gradient"
import GlassCard from "@/components/global/glass-card"
import { redirect } from "next/navigation"

type Props = {
    children: React.ReactNode
}

const AuthLayout = async ({children}: Props) => {
    const user = await onAuthenticatedUser()

    if (user.status === 200) redirect("/callback/sign-in")
  return <div className="container h-screen flex justify-center items-center">
    <div className="flex flex-col w-full items-center py-24">
      <div className="flex items-center gap-3 leading-none mb-8">
        <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-white shrink-0">
          <div className="size-8 rounded-full bg-black" />
        </div>
        <div className="flex flex-col items-start leading-none">
          <h2 className="text-[28px] font-bold text-white tracking-tight select-none leading-none">
            Naveo.
          </h2>
          <p className="text-xs text-zinc-500 font-medium select-none mt-1">Created by Naveen</p>
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