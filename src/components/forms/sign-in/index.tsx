'use client'

import { useAuthSignIn } from "@/hooks/authentication"

type Props = {}

const SignInForm = (props: Props) => {
    const { ispending, onAuthenticatedUser, register, errors } = useAuthSignIn()
  return (
    <div>SignInForm</div>
  )
}

export default SignInForm