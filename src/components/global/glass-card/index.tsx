import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Props = {
    children: React.ReactNode
    className?: string
}

const GlassCard = ({children,className}: Props) => {
  return (
    <Card className={cn(className, "rounded-2xl glass-effect")}>
        {children}
    </Card>
  )
}

export default GlassCard