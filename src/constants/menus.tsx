import CreditCard from "@/icons/Credit"
import Home from "@/icons/Home"
import Explore from "@/icons/price"

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
        icon: <Home />,
        path: "/",
        section: true,
    },
    {
        id:1,
        lable: "Pricing",
        icon: <CreditCard />,
        path: "#pricing",
        section: true,
    },
    {
        id:1,
        lable: "Explore",
        icon: <Explore />,
        path: "/explore",
    },

    
]