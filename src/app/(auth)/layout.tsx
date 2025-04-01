import { onAuthenticatedUser } from "@/actions/auth"
import { redirect } from "next/navigation"

type Props = {
    children: React.ReactNode
}

const AuthLayout = async ({children}: Props) => {
    const user = await onAuthenticatedUser()

    if (user.status === 200) redirect("/callback/sign-in")
  return (
    <div>AuthLayout</div>
  )
}

export default AuthLayout