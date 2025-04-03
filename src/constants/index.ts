import { AuthFormProps, SIGN_IN_FORM, SIGN_UP_FORM } from "./forms"
import { LANDING_PAGE_MENU, MenuProps } from "./menus"
type PioneerConstantsProps = {
    LandingPageMenu: MenuProps[],
    signUpForm: AuthFormProps[],
    signInForm: AuthFormProps[],
    //groupList:,
    //createGroupPlaceholder:
    //CREATE_GROUP_PLACEHOLDER,
}
export const PIONEER_CONSTANTS:
PioneerConstantsProps ={
    LandingPageMenu: LANDING_PAGE_MENU,
    signUpForm:SIGN_UP_FORM,
    signInForm:SIGN_IN_FORM,
    //groupList:GROUP_LIST,
    //createGroupPlaceholder:
    //CREATE_GROUP_PLACEHOLDER,
}

