"use client"

import { logoutAction } from "@/actions/custom-auth"
import { getStudentProfileDetails, updateStudentAvatarAction } from "@/actions/student-actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
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
  Trophy,
  User
} from "lucide-react"
import { Montserrat } from "next/font/google"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import React, { useTransition } from "react"
import { toast } from "sonner"

const boyAvatars = [
  { path: "/avatars/avatar2.png", name: "Mohawk" },
  { path: "/avatars/avatar7.png", name: "Grey glasses" },
  { path: "/avatars/avatar8.png", name: "Beard" },
  { path: "/avatars/avatar9.png", name: "Pirate" }
]

const girlAvatars = [
  { path: "/avatars/avatar1.png", name: "White beret" },
  { path: "/avatars/avatar3.png", name: "Hijab" },
  { path: "/avatars/avatar4.png", name: "Blonde glasses" },
  { path: "/avatars/avatar6.png", name: "Bindi" }
]

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
  const [profile, setProfile] = React.useState<any>(null)
  const [isAvatarOpen, setIsAvatarOpen] = React.useState(false)
  const [selectedAvatar, setSelectedAvatar] = React.useState<string | null>(null)
  const [updating, setUpdating] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    getStudentProfileDetails().then(res => {
      if (res.success) {
        setProfile(res.profile)
      }
    })
  }, [])

  React.useEffect(() => {
    if (profile?.avatar) {
      setSelectedAvatar(profile.avatar)
    }
  }, [profile])

  const handleSaveAvatar = async () => {
    if (!selectedAvatar) return
    setUpdating(true)
    const res = await updateStudentAvatarAction(selectedAvatar)
    setUpdating(false)
    if (res.success) {
      toast.success(res.message || "Avatar updated successfully!")
      setIsAvatarOpen(false)
      setProfile((prev: any) => prev ? { ...prev, avatar: selectedAvatar } : { avatar: selectedAvatar })
      router.refresh()
    } else {
      toast.error(res.error || "Failed to update avatar")
    }
  }

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
              <Link href="/student/dashboard" className="flex items-center gap-[5px] pl-3">
                <Image src="/nk-logo.png" alt="Logo" width={30} height={22} className="object-contain shrink-0" />
                <div className="animate-slide-name flex flex-col items-start">
                  <span className={`${logoFont.className} font-bold text-[1.5rem] text-white tracking-tight leading-none`}>Naveo.</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-zinc-400 font-bold px-3 py-2 tracking-wider text-[11px] select-none">
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
                  <Avatar className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-white select-none overflow-hidden">
                    {profile?.avatar ? (
                      profile.avatar.startsWith("/avatars/") || profile.avatar.startsWith("data:image/") || profile.avatar.startsWith("http") || profile.avatar.startsWith("/") ? (
                        <img src={profile.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover select-none" />
                      ) : (
                        <span className="text-base leading-none select-none">{profile.avatar}</span>
                      )
                    ) : (
                      <AvatarFallback className="bg-transparent text-white font-bold select-none">
                        {student.name.substring(0, 1).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight select-none">
                    <span className="truncate font-semibold text-white">{student.name}</span>
                    <span className="truncate text-xs text-white/90 uppercase">
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
                  <div className="flex items-center gap-2 px-3 py-2 text-left text-sm select-none">
                    <Avatar className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-white select-none overflow-hidden">
                      {profile?.avatar ? (
                        profile.avatar.startsWith("/avatars/") || profile.avatar.startsWith("data:image/") || profile.avatar.startsWith("http") || profile.avatar.startsWith("/") ? (
                          <img src={profile.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover select-none" />
                        ) : (
                          <span className="text-base leading-none select-none">{profile.avatar}</span>
                        )
                      ) : (
                        <AvatarFallback className="bg-transparent text-white font-bold select-none">
                          {student.name.substring(0, 1).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold text-white">{student.name}</span>
                      <span className="truncate text-xs text-white/90 uppercase">
                        {student.rollNo}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem 
                  onSelect={() => setIsAvatarOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 text-zinc-300 focus:bg-zinc-900 focus:text-white rounded-lg cursor-pointer"
                >
                  <User className="h-4 w-4" />
                  <span>Change Avatar</span>
                </DropdownMenuItem>
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

      <Dialog open={isAvatarOpen} onOpenChange={setIsAvatarOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border border-zinc-800 text-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white tracking-tight">Choose Your Avatar</DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs mt-1">
              Select an Apple-style animoji to display on your profile and class leaderboard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 my-4">
            <div>
              <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Boys Animojis</h4>
              <div className="grid grid-cols-4 gap-3">
                {boyAvatars.map((av) => (
                  <button
                    key={av.path}
                    onClick={() => setSelectedAvatar(av.path)}
                    className={`h-16 w-full rounded-2xl border flex items-center justify-center transition-all hover:scale-105 active:scale-95 overflow-hidden p-2 ${
                      selectedAvatar === av.path
                        ? "border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30"
                        : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <img src={av.path} alt={av.name} className="h-full object-contain select-none" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Girls Animojis</h4>
              <div className="grid grid-cols-4 gap-3">
                {girlAvatars.map((av) => (
                  <button
                    key={av.path}
                    onClick={() => setSelectedAvatar(av.path)}
                    className={`h-16 w-full rounded-2xl border flex items-center justify-center transition-all hover:scale-105 active:scale-95 overflow-hidden p-2 ${
                      selectedAvatar === av.path
                        ? "border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30"
                        : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <img src={av.path} alt={av.name} className="h-full object-contain select-none" />
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Image or Emoji Selection */}
            <div className="border-t border-zinc-900 pt-4">
              <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Custom Image or Emoji</h4>
              <div className="flex items-center gap-3">
                {/* Custom File Upload Button */}
                <label className="flex-1 flex flex-col items-center justify-center h-16 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/40 hover:border-zinc-700 transition-all cursor-pointer p-2 relative overflow-hidden select-none">
                  {selectedAvatar && selectedAvatar.startsWith("data:image/") ? (
                    <img src={selectedAvatar} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <>
                      <span className="text-xs font-semibold text-zinc-300">Upload Image</span>
                      <span className="text-[9px] text-zinc-500 mt-0.5">PNG, JPG up to 1MB</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        if (file.size > 1 * 1024 * 1024) {
                          toast.error("Image size must be less than 1MB.")
                          return
                        }
                        const reader = new FileReader()
                        reader.onload = () => {
                          if (typeof reader.result === "string") {
                            setSelectedAvatar(reader.result)
                          }
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                    className="hidden"
                  />
                </label>

                {/* Custom Emoji Input */}
                <div className="w-24">
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="Emoji/Char"
                    value={selectedAvatar && !selectedAvatar.startsWith("/") && !selectedAvatar.startsWith("data:") ? selectedAvatar : ""}
                    onChange={(e) => setSelectedAvatar(e.target.value)}
                    className="w-full h-16 rounded-2xl border border-zinc-800 bg-zinc-900/40 text-center text-2xl text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-700 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex sm:justify-end gap-2.5 pt-2 border-t border-zinc-900">
            <Button
              variant="outline"
              onClick={() => setIsAvatarOpen(false)}
              className="border-zinc-800 hover:bg-zinc-900 text-white rounded-xl text-xs py-2 px-4"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAvatar}
              disabled={updating || !selectedAvatar}
              className="bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl text-xs py-2 px-4 shadow-lg disabled:opacity-50"
            >
              {updating ? "Saving..." : "Save Avatar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  )
}
