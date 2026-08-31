import { getStudentUser } from "@/actions/custom-auth"
import { redirect } from "next/navigation"
import LoginForm from "./login-form"

export default async function LoginPage() {
    const student = await getStudentUser()
    if (student) {
        redirect("/student/dashboard")
    }

    return <LoginForm />
}
