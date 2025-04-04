'use client'

type Props = {}

const SignUpForm = (props: Props) => {
    const {
        register,
        errors,
        verifying,
        creating,
        onGenerateCOde,
        onInitiateUserRegistration,
        code,
        setCode,
        getvalues,
    } = useAuthSignUp()
  return (
    <div>SignUpForm</div>
  )
}

export default SignUpForm