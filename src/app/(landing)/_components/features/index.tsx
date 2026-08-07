import BackdropGradient from "@/components/global/backdrop-gradient"
import GradientText from "@/components/global/gradient-text"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import {
  BookOpen,
  CalendarCheck,
  CodeXml,
  Keyboard,
  MessageSquare,
  Trophy
} from "lucide-react"

type FeatureItem = {
  title: string
  description: string
  icon: React.ReactNode
}

const featuresList: FeatureItem[] = [
  {
    title: "Interactive Classrooms",
    description: "Real-time learning and peer discussions in collaborative portals.",
    icon: <BookOpen className="size-8 text-white" />,
  },
  {
    title: "Coding Exam Compiler",
    description: "Secure multi-language compiler for online editor exams.",
    icon: <CodeXml className="size-8 text-white" />,
  },
  {
    title: "Live Chat & Channels",
    description: "Instant group messaging and dedicated instructor help desks.",
    icon: <MessageSquare className="size-8 text-white" />,
  },
  {
    title: "Daily Attendance & Check-ins",
    description: "Easy habit tracking and daily student attendance check-ins.",
    icon: <CalendarCheck className="size-8 text-white" />,
  },
  {
    title: "Typing Challenges & Games",
    description: "Interactive coding and typing games to build speed.",
    icon: <Keyboard className="size-8 text-white" />,
  },
  {
    title: "Gamified Leaderboards",
    description: "Live rankings, progress charts, and peer grade leaderboards.",
    icon: <Trophy className="size-8 text-white" />,
  },
]

export const FeaturesSection = () => {
  return (
    <div className="w-full pt-8 flex flex-col items-start" id="features">
      <BackdropGradient 
        className="w-8/12 h-full opacity-40 flex flex-col items-center"
        container="items-center gap-y-2"
      >
        <GradientText className="text-4xl font-semibold text-center pl-5 pb-2" element="H2">
          Designed for Premium Learning
        </GradientText>
        <p className="text-sm text-center text-muted-foreground text-themeTextGrey pl-5">
          Everything you need to collaborate, study, build, and level up your skills in one cohesive environment.
        </p>
      </BackdropGradient>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12 w-full justify-center px-4">
        {featuresList.map((feature, idx) => (
          <Card 
            key={idx} 
            className="p-7 bg-[#121212] border border-zinc-800/80 rounded-2xl flex flex-col gap-4 hover:border-zinc-700/80 transition-all duration-300 group shadow-lg"
          >
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl w-fit group-hover:bg-zinc-800 transition-all duration-300">
              {feature.icon}
            </div>
            <div className="flex flex-col gap-2">
              <CardTitle className="text-xl font-semibold text-white">
                {feature.title}
              </CardTitle>
              <CardDescription className="text-themeTextGrey text-sm leading-relaxed mt-1">
                {feature.description}
              </CardDescription>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
