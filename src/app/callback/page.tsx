import { AuthenticateWithRedirectCallback } from "@clerk/nextjs"

export const dynamic = "force-dynamic"

const CallBackPage = () => {
    return <AuthenticateWithRedirectCallback />
}

export default CallBackPage