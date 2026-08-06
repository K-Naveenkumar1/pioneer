"use client"

import { logoutAction } from "@/actions/custom-auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar"
import {
  BookOpen,
  CheckSquare,
  Clock,
  Code,
  FileText,
  Keyboard,
  LayoutDashboard,
  Library,
  LogOut,
  MessageSquare,
  MoreVertical,
  Trophy
} from "lucide-react"
import { Montserrat } from "next/font/google"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import React, { useTransition } from "react"
import { toast } from "sonner"

const logoFont = Montserrat({ subsets: ["latin"], weight: ["700"] })

interface StudentSidebarProps {
  student: {
    id: string
    rollNo: string
    name: string
  }
}

const data = {
  navItems: [
    {
      title: "Dashboard",
      url: "/student/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Check-In",
      url: "/student/checkin",
      icon: Clock,
    },
    {
      title: "Leaderboard",
      url: "/student/leaderboard",
      icon: Trophy,
    },
    {
      title: "Doubts Chat",
      url: "/student/chat",
      icon: MessageSquare,
    },
    {
      title: "Digital Notes",
      url: "/student/notes",
      icon: FileText,
    },
    {
      title: "Course Materials",
      url: "/student/materials",
      icon: Library,
    },
    {
      title: "Tasks",
      url: "/student/tasks",
      icon: CheckSquare,
    },
    {
      title: "Exams",
      url: "/student/exams",
      icon: BookOpen,
    },
    {
      title: "Coding Exam",
      url: "/student/coding-exam",
      icon: Code,
    },
    {
      title: "Typing Game",
      url: "/student/typing-game",
      icon: Keyboard,
    },
  ],
}

export function StudentSidebar({ student, ...props }: StudentSidebarProps & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { isMobile, state, toggleSidebar } = useSidebar()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = () => {
    startTransition(async () => {
      const res = await logoutAction("student")
      if (res.success) {
        toast.success("Successfully logged out.")
        router.push("/login")
      } else {
        toast.error("Failed to log out.")
      }
    })
  }

  return (
    <Sidebar variant="floating" collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="w-full">
              <Link href="/student/dashboard" className="flex items-center gap-2 pl-3">
                <Image src="/nk-logo.png" alt="Logo" width={30} height={22} className="object-contain shrink-0" />
                <div className="animate-slide-name flex flex-col items-start gap-0.5 leading-none">
                  <span className={`${logoFont.className} font-bold text-[1.5rem] text-white tracking-tight leading-none`}>Naveo.</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-zinc-400 font-bold px-3 py-2 tracking-wider text-[10px] select-none">
            Student Portal
          </SidebarGroupLabel>
          <SidebarMenu className="gap-2.5 px-1">
            {data.navItems.map((item) => {
              const isActive = mounted && pathname === item.url
              const Icon = item.icon
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive} className={`flex items-center gap-2.5 px-3 rounded-xl transition-all text-sm font-medium ${
                    isActive
                      ? "bg-zinc-900 border border-zinc-800 text-white font-semibold py-5"
                      : "text-white hover:bg-transparent hover:text-white active:bg-transparent active:text-white cursor-pointer py-3"
                  }`}>
                    <Link href={item.url} className="flex items-center gap-2.5 w-full">
                      <Icon className="h-4 w-4 shrink-0" {...(isActive ? { fill: "currentColor" } : {})} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-zinc-900 data-[state=open]:text-white hover:bg-zinc-900/50 rounded-xl"
                >
                  <Avatar className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-white">
                    <AvatarFallback className="bg-transparent text-white font-bold">
                      {student.name.substring(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-white">{student.name}</span>
                    <span className="truncate text-xs text-white/90">
                      {student.rollNo}
                    </span>
                  </div>
                  <MoreVertical className="ml-auto size-4 text-white" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-3 py-2 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-white">
                      <AvatarFallback className="bg-transparent text-white font-bold">
                        {student.name.substring(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold text-white">{student.name}</span>
                      <span className="truncate text-xs text-white/90">
                        {student.rollNo}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  disabled={isPending}
                  className="flex items-center gap-2 px-3 py-2 text-rose-400 focus:bg-rose-500/10 focus:text-rose-400 rounded-lg cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{isPending ? "Logging out..." : "Log out"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
