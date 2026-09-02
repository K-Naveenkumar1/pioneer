import BackdropGradient from "@/components/global/backdrop-gradient"
import GradientText from "@/components/global/gradient-text"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ArrowRight, Check } from "lucide-react"
import Link from "next/link"

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For side projects, prototypes and your first real product question.",
    buttonText: "Start free",
    popular: false,
    href: "/login",
    buttonStyle: "bg-white text-black hover:bg-zinc-200",
    features: [
      "100k events / month",
      "3 seats",
      "90-day data retention",
      "Funnels, retention and paths",
      "Full data export, any time",
      "Community support",
    ],
  },
  {
    name: "Team",
    price: "$47",
    period: "/mo · billed yearly",
    description: "For a product team that ships weekly",
    buttonText: "Start 30-day trial",
    popular: true,
    href: "/login",
    buttonStyle: "bg-black text-white hover:bg-zinc-900 border border-zinc-800 shadow-md",
    features: [
      "2M events / month",
      "Unlimited seats",
      "12-month data retention",
      "Plain-English queries",
      "Shared metric library",
      "Alerts to Slack, Teams and email",
      "42 native integrations",
      "Email support, one business day",
    ],
  },
  {
    name: "Business",
    price: "$183",
    period: "/mo · billed yearly",
    description: "For companies where more than one team depends.",
    buttonText: "Start 30-day trial",
    popular: false,
    href: "/login",
    buttonStyle: "bg-white text-black hover:bg-zinc-200",
    features: [
      "10M events / month",
      "Everything in Team, plus:",
      "24-month data retention",
      "Session replay",
      "SSO / SAML and SCIM",
      "EU or US data residency",
      "Two-way warehouse sync",
      "Priority support, four hours",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For regulated industries, huge volume, or both at once.",
    buttonText: "Talk to sales",
    popular: false,
    href: "#contact",
    buttonStyle: "bg-white text-black hover:bg-zinc-200",
    features: [
      "Unlimited events",
      "Everything in Business, plus:",
      "Custom retention, up to 7 years",
      "Dedicated infrastructure",
      "99.99% SLA with credits",
      "Custom DPA and security review",
      "Named CSM on Slack Connect",
    ],
  },
]

export const PricingSection = () => {
  return (
    <div className="w-full pt-16 pb-12 flex flex-col items-center" id="pricing">
      <BackdropGradient
        className="w-8/12 h-full opacity-40 flex flex-col items-center"
        container="items-center gap-y-2"
      >
        <GradientText className="text-4xl sm:text-5xl font-extrabold tracking-tight text-center pb-2" element="H2">
          Pricing Plans
        </GradientText>
        <p className="text-base text-center text-zinc-400 max-w-xl">
          Choose your plan according to your need
        </p>
      </BackdropGradient>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-14 w-full max-w-7xl px-4 items-stretch">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={cn(
              "p-7 flex flex-col justify-between rounded-3xl transition-all duration-300 relative overflow-hidden bg-[#121215] shadow-xl",
              plan.popular
                ? "border-2 border-white shadow-2xl shadow-white/10"
                : "border border-zinc-800/80 hover:border-zinc-700/80"
            )}
          >
            <div>
              {/* Header Title & Badge */}
              <div className="flex items-center justify-between gap-2 h-7">
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                {plan.popular && (
                  <span className="bg-black text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider border border-zinc-700">
                    MOST POPULAR
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="mt-4 flex items-baseline gap-1.5 h-10">
                <span className="text-4xl font-black tracking-tight text-white">{plan.price}</span>
                {plan.period && <span className="text-sm font-normal text-zinc-400">{plan.period}</span>}
              </div>

              {/* Description */}
              <p className="text-sm text-zinc-400 mt-3 min-h-[48px] leading-relaxed">
                {plan.description}
              </p>

              {/* CTA Button */}
              <Link href={plan.href} className="w-full block mt-6">
                <Button
                  className={cn(
                    "w-full rounded-full h-11 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2",
                    plan.buttonStyle
                  )}
                >
                  {plan.buttonText}
                  {plan.popular && <ArrowRight className="w-4 h-4" />}
                </Button>
              </Link>

              {/* Divider */}
              <div className="my-6 border-t border-zinc-800/80" />
            </div>

            {/* Features Checkmarks List */}
            <ul className="space-y-3.5 text-sm text-zinc-300 flex-1">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <Check className="w-4 h-4 mt-0.5 shrink-0 text-zinc-400" />
                  <span className="leading-tight">{feature}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  )
}
