import { z } from "zod"

export const SignInSchema = z.object ({
    email: z.string().email("You must give a valid email"),
    password: z
    .string()
    .min(8, {message: "Your password must be atleast 8 characters long"})
    .max(64, {
        message: "Your character cannot be longer than 64 characters",
    })
    .refine(
        (value) => /^[a-zA-Z0-9_.-]*$/.test(value ?? ""),
        "Password should contain only alphbets and numerics",
    )
})