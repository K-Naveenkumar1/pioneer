import { BsFillCreditCardFill } from "react-icons/bs";
import { HiHome } from "react-icons/hi2";
import { MdExplore } from "react-icons/md";

export type MenuProps =  
 {
    id:number
    lable: string
    icon: JSX.Element
    path: string
    section?: boolean
    integratin?: boolean
}

export const LANDING_PAGE_MENU:MenuProps[] =[
    {
        id:0,
        lable: "Home",
        icon: <HiHome />,
        path: "/",
        section: true,
    },
    {
        id:1,
        lable: "Pricing",
        icon: <BsFillCreditCardFill />,
        path: "#pricing",
        section: true,
    },
    {
        id:1,
        lable: "Explore",
        icon: <MdExplore />,
        path: "/explore",
    },

    
]