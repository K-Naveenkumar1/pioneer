
import { cn } from "@/lib/utils"
import React from "react"

type LoaderProps = {
    loading: boolean
    children: React.ReactNode
    className?: string
}
     
export const Loader = ({ loading, children, className}: LoaderProps) => { 
    return loading ? (
    <div className={cn("w-full flex justify-center items-center", className)} >
        <div role="status" className="relative flex items-center justify-center w-16 h-16">
            <div className="w-16 h-16 rounded-full border-2 border-t-amber-500 border-r-transparent border-b-transparent border-l-transparent animate-spin absolute" />
            <img 
                src="/nk-logo.png" 
                alt="Loading..."
                className="w-10 h-10 object-contain animate-pulse -rotate-45"
            />
            <span className="sr-only">Loading...</span> 
        </div>
    </div>
    ) : (
        children
    )
}