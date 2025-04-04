'use client'

import { Loader } from "@/components/global/loader";
import { Button } from "@/components/ui/button";
import { useGoogleAuth } from "@/hooks/authentication";
import { FcGoogle } from "react-icons/fc";

type Props = {
    method: "signup" | "signin"
}

export const GoogleAuthButton = ({method}: Props) => {
    const {signUpWith, signInWith} = useGoogleAuth()
  return (
    <Button 
        {...(method === "signin"
            ? {
                onClick: () => signInWith("oauth_google"),
            }
            : {
                onClick: () => signUpWith("oauth_google"),
            })}
        className="w-full rounded-2xl flex gap-3 bg-black border-themeGrey"
        variant="outline">
            <Loader loading={false}>
                <FcGoogle />
                Google
            </Loader>
        </Button>
  )
}
