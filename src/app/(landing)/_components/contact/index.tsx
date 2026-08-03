"use client"

import BackdropGradient from "@/components/global/backdrop-gradient"
import GradientText from "@/components/global/gradient-text"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Mail, MapPin, Phone, Send } from "lucide-react"
import React, { useState } from "react"
import { toast } from "sonner"

export const ContactSection = () => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Please fill in all required fields")
      return
    }

    setLoading(true)
    // Simulate API request
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setLoading(false)
    
    toast.success("Thank you! Your message has been sent successfully.")
    setFormData({
      name: "",
      email: "",
      subject: "",
      message: ""
    })
  }

  return (
    <div className="w-full pt-20 pb-10 flex flex-col items-center gap-6" id="contact">
      <BackdropGradient 
        className="w-8/12 h-full opacity-40 flex flex-col items-center"
        container="items-center gap-y-4"
      >
        <GradientText className="text-4xl font-semibold text-center" element="H2">
          Get In Touch
        </GradientText>
        <p className="text-sm md:text-center text-center text-muted-foreground text-themeTextGrey max-w-xl">
          Have questions or want to collaborate?
        </p>
      </BackdropGradient>

      <div className="flex flex-col lg:flex-row gap-10 mt-12 w-full max-w-6xl px-4 items-stretch justify-center">
        {/* Contact Info Cards */}
        <div className="flex flex-col gap-6 w-full lg:w-5/12 justify-between">
          <div className="flex flex-col gap-6">
            <Card className="p-6 bg-[#121212] border border-zinc-800/80 rounded-2xl flex gap-4 items-center shadow-lg hover:border-zinc-700/80 transition-all duration-300">
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white">
                <Mail className="size-6" />
              </div>
              <div className="flex flex-col gap-0.5">
                <CardTitle className="text-lg font-semibold text-themeTextWhite">Email Us</CardTitle>
                <CardDescription className="text-themeTextGrey text-sm">support@naveo.live</CardDescription>
              </div>
            </Card>

            <Card className="p-6 bg-[#121212] border border-zinc-800/80 rounded-2xl flex gap-4 items-center shadow-lg hover:border-zinc-700/80 transition-all duration-300">
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white">
                <Phone className="size-6" />
              </div>
              <div className="flex flex-col gap-0.5">
                <CardTitle className="text-lg font-semibold text-themeTextWhite">Call Us</CardTitle>
                <CardDescription className="text-themeTextGrey text-sm">+91 9121952232</CardDescription>
              </div>
            </Card>

            <Card className="p-6 bg-[#121212] border border-zinc-800/80 rounded-2xl flex gap-4 items-center shadow-lg hover:border-zinc-700/80 transition-all duration-300">
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white">
                <MapPin className="size-6" />
              </div>
              <div className="flex flex-col gap-0.5">
                <CardTitle className="text-lg font-semibold text-themeTextWhite">Our HQ</CardTitle>
                <CardDescription className="text-themeTextGrey text-sm">Chennai, Tamilnadu</CardDescription>
              </div>
            </Card>
          </div>

          <div className="p-6 bg-zinc-950/40 border border-themeGrey rounded-xl flex flex-col gap-2">
            <p className="text-sm text-themeTextWhite font-medium">Looking for Instant Help?</p>
            <p className="text-xs text-themeTextGrey leading-relaxed">
              Explore our dashboard once logged in to access interactive documentation, system guidelines, and community forums.
            </p>
          </div>
        </div>

        {/* Contact Form */}
        <Card className="p-8 w-full lg:w-7/12 bg-[#121212] border border-zinc-800/80 rounded-2xl flex flex-col gap-6 shadow-lg hover:border-zinc-700/80 transition-all duration-300">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name" className="text-themeTextWhite text-sm font-medium">Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="bg-zinc-900 border-zinc-800 text-white rounded-xl placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-zinc-700"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-themeTextWhite text-sm font-medium">Email <span className="text-red-500">*</span></Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  className="bg-zinc-900 border-zinc-800 text-white rounded-xl placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-zinc-700"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="subject" className="text-themeTextWhite text-sm font-medium">Subject</Label>
              <Input
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="How can we help you?"
                className="bg-zinc-900 border-zinc-800 text-white rounded-xl placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-zinc-700"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="message" className="text-themeTextWhite text-sm font-medium">Message <span className="text-red-500">*</span></Label>
              <Textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Write your message here..."
                rows={5}
                className="bg-zinc-900 border-zinc-800 text-white rounded-xl placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-zinc-700 resize-none"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-2xl bg-white text-black hover:bg-zinc-200 transition-all font-semibold flex gap-2 items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin size-5" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="size-5" />
                  Send Message
                </>
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
