import BackdropGradient from "@/components/global/backdrop-gradient"
import GradientText from "@/components/global/gradient-text"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { FaCheck } from "react-icons/fa"

type Props = {}

export const PricingSection = (props: Props) => {
  return (
    <div className="w-full pt-20 flex flex-col items-start" id="pricing">
      <BackdropGradient 
        className="w-8/12 h-full opacity-40 flex flex-col items-center"
        container="items-center gap-y-2"
      >
        <GradientText className="text-4xl font-semibold text-center pl-5 pb-2" element="H2">
          Pricing Plans
        </GradientText>
        <p className="text-sm text-center text-muted-foreground text-themeTextGrey pl-5">
          
          Choose your plan according to your need
        </p>
      </BackdropGradient>
      <div className="flex flex-col lg:flex-row gap-6 mt-12 w-full justify-center items-stretch px-4">
        {/* Starter Plan */}
        <Card className="p-7 flex flex-col justify-between w-full lg:w-1/3 bg-[#121212] border border-zinc-800/80 rounded-2xl shadow-lg hover:border-zinc-700/80 transition-all duration-300">
          <div>
            <div className="flex flex-col gap-2">
                <CardTitle>₹ 99/m</CardTitle>
                <CardDescription className="text-themeTextGrey">
                  Great if you're getting Started
                </CardDescription>
                <Link href="#" className="w-full mt-3">
                  <Button variant="default" className="bg-[#333337] w-full rounded-2xl text-white hover:text-[#333337]">
                    Start for free
                  </Button>
                </Link>
            </div>
            <div className="flex flex-col gap-2 text-themeTextGrey mt-5">
              <p className="font-semibold text-white">Features</p>
                <span className="flex gap-2 mt-3 items-center">
                <FaCheck />
                 Feature Number 1
                </span>
                <span className="flex gap-2 items-center">
                <FaCheck />
                 Feature Number 2
                </span>
                <span className="flex gap-2 items-center">
                <FaCheck />
                 Feature Number 3
                </span>
                <span className="flex gap-2 items-center">
                <FaCheck />
                 Feature Number 4
                </span>
                <span className="flex gap-2 items-center">
                <FaCheck />
                 Feature Number 5
                </span>
            </div>
          </div>
        </Card>

        {/* Pro Plan */}
        <Card className="p-7 flex flex-col justify-between w-full lg:w-1/3 bg-[#121212] border border-zinc-800/80 rounded-2xl shadow-lg hover:border-zinc-700/80 transition-all duration-300">
          <div>
            <div className="flex flex-col gap-2">
                <CardTitle>₹ 499/m</CardTitle>
                <CardDescription className="text-themeTextGrey">
                  Perfect for active learners & builders
                </CardDescription>
                <Link href="#" className="w-full mt-3">
                  <Button variant="default" className="bg-[#333337] w-full rounded-2xl text-white hover:text-[#333337]">
                    Upgrade to Pro
                  </Button>
                </Link>
            </div>
            <div className="flex flex-col gap-2 text-themeTextGrey mt-5">
              <p className="font-semibold text-white">Features</p>
                <span className="flex gap-2 mt-3 items-center">
                <FaCheck />
                 All Starter features included
                </span>
                <span className="flex gap-2 items-center">
                <FaCheck />
                 Feature Number 6
                </span>
                <span className="flex gap-2 items-center">
                <FaCheck />
                 Feature Number 7
                </span>
                <span className="flex gap-2 items-center">
                <FaCheck />
                 Feature Number 8
                </span>
                <span className="flex gap-2 items-center">
                <FaCheck />
                 Feature Number 9
                </span>
            </div>
          </div>
        </Card>

        {/* Elite Plan */}
        <Card className="p-7 flex flex-col justify-between w-full lg:w-1/3 bg-[#121212] border border-zinc-800/80 rounded-2xl shadow-lg hover:border-zinc-700/80 transition-all duration-300">
          <div>
            <div className="flex flex-col gap-2">
                <CardTitle>₹ 1999/m</CardTitle>
                <CardDescription className="text-themeTextGrey">
                  Ultimate access with custom support
                </CardDescription>
                <Link href="#" className="w-full mt-3">
                  <Button variant="default" className="bg-[#333337] w-full rounded-2xl text-white hover:text-[#333337]">
                    Become a Billionaire
                  </Button>
                </Link>
            </div>
            <div className="flex flex-col gap-2 text-themeTextGrey mt-5">
              <p className="font-semibold text-white">Features</p>
                <span className="flex gap-2 mt-3 items-center">
                <FaCheck />
                 All Pro features included
                </span>
                <span className="flex gap-2 items-center">
                <FaCheck />
                 Feature Number 10
                </span>
                <span className="flex gap-2 items-center">
                <FaCheck />
                 Feature Number 11
                </span>
                <span className="flex gap-2 items-center">
                <FaCheck />
                 Feature Number 12
                </span>
                <span className="flex gap-2 items-center">
                <FaCheck />
                 Feature Number 13
                </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
