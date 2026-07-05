"use client"

import { Card, CardContent } from "@/components/ui/card"
import { PIONEER_CONSTANTS } from "@/constants"
import { useNavigation } from "@/hooks/navigation"
import { cn } from "@/lib/utils"
import Link from "next/link"

type MenuProps={
    orientation:"mobile" | "desktop"
}

const Menu = ({orientation}: MenuProps) => {
    const { section,onSetSection} = useNavigation()
    switch (orientation) {
        case "desktop":
            return (
                <Card className="bg-themeGrey border-themeGrey bg-clip-padding backdrop--blur_safari backdrop-filter backdrop-blur-2xl bg-opacity-60 p-1 lg:flex hidden rounded-xl">
                    <CardContent className="p-0 flex gap-2">
                        {PIONEER_CONSTANTS.LandingPageMenu.map((menuItem) => (
                            <Link
                                key={menuItem.id}
                                href={menuItem.path}
                                onClick={menuItem.section ? () => onSetSection(menuItem.path) : undefined}
                                className={cn(
                                    "rounded-xl flex gap-2 py-3 px-3 items-center",
                                    section == menuItem.path ? "bg-[#09090B] border-[#27272A]" : ""
                                )}
                            >
                                <>
                                    {section == menuItem.path && menuItem.icon}
                                    {menuItem.lable}
                                </>
                            </Link>
                        ))}
                    </CardContent>
                </Card>
            )
        case "mobile":
            return (
                <div className="flex flex-col mt-10">
                    {PIONEER_CONSTANTS.LandingPageMenu.map((menuItem) => (
                        <Link
                            key={menuItem.id}
                            href={menuItem.path}
                            onClick={menuItem.section ? () => onSetSection(menuItem.path) : undefined}
                            className={cn(
                                "rounded-xl flex gap-2 py-2 px-4 items-center",
                                section == menuItem.path ? "bg-themeGrey border-[#27272A]" : ""
                            )}
                        >
                            <>
                                {menuItem.icon}
                                {menuItem.lable}
                            </>
                        </Link>
                    ))}
                </div>
            )
        default:
            return <></>

    }
}

export default Menu