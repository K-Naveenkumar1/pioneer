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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  BookOpen,
  CheckSquare,
  Clock,
  Code,
  FileText,
  Keyboard,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  MoreVertical,
  Trophy,
  Library
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import React, { useTransition } from "react"
import { toast } from "sonner"

interface StudentSidebarProps {
  student: {
    id: string
    rollNo: string
    name: string
  }
}

const data = {
  navMain: [
    {
      title: "Overview",
      items: [
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
      ],
    },
    {
      title: "Academics",
      items: [
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
    },
  ],
}

export function StudentSidebar({ student, ...props }: StudentSidebarProps & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { isMobile } = useSidebar()
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
            <SidebarMenuButton size="lg" asChild>
              <Link href="/student/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-white">
                  <div className="size-7 rounded-full bg-black" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="font-bold text-[19px] text-white tracking-tight leading-none mt-1">Naveo.</span>
                  <span className="text-xs text-zinc-500 font-medium mt-0.80 select-none">Created by Naveen</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-4">
            {data.navMain.map((item) => (
              <SidebarMenuItem key={item.title}>
                <div className="px-3 py-2 text-xs font-bold text-zinc-400 uppercase tracking-wider select-none mb-1">
                  {item.title}
                </div>
                {item.items?.length ? (
                  <SidebarMenuSub className="ml-0 border-l-0 px-1.5 gap-2.5">
                    {item.items.map((subItem) => {
                      const isActive = mounted && pathname === subItem.url
                      const Icon = subItem.icon
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild isActive={isActive} className={`flex items-center gap-2.5 px-3 rounded-xl transition-all text-sm font-medium ${
                            isActive
                              ? "bg-zinc-900 border border-zinc-800 text-white font-semibold py-5"
                              : "text-white hover:bg-transparent hover:text-white active:bg-transparent active:text-white cursor-pointer py-3"
                          }`}>
                            <Link href={subItem.url} className="flex items-center gap-2.5 w-full">
                              <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-white"}`} />
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            ))}
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
                  <Avatar className="h-8 w-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-white">
                    <AvatarFallback className="bg-transparent text-white font-bold">
                      {student.name.substring(0, 2).toUpperCase()}
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
                    <Avatar className="h-8 w-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-white">
                      <AvatarFallback className="bg-transparent text-white font-bold">
                        {student.name.substring(0, 2).toUpperCase()}
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
