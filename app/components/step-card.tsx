'use client'

import { ReactNode } from "react"

interface StepCardProps {
  icon: ReactNode
  title: string
  description: string
}

export default function StepCard({ icon, title, description }: StepCardProps) {
  return (
    <div className="w-full max-w-[520px] rounded-3xl shadow-[0_8px_20px_rgba(0,0,0,0.08),0_-1px_3px_rgba(0,0,0,0.05)] p-8">
      {/* Icon */}
      <div className="mb-6">
        <div className="h-12 w-12 rounded-2xl bg-[#878787] flex items-center justify-center text-white">
          {icon}
        </div>
      </div>

      {/* Text */}
      <div className="space-y-3">
        <h3
          style={{
            fontFamily: "var(--font-inter), 'Inter', sans-serif",
            fontWeight: "700",
            fontSize: "18px",
            lineHeight: "22px",
            letterSpacing: "-0.69px",
            color: "#111827",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontFamily: "var(--font-inter), 'Inter', sans-serif",
            fontWeight: "400",
            fontSize: "16px",
            lineHeight: "24px",
            letterSpacing: "-0.69px",
            color: "#4B5563",
            maxWidth: "420px",
          }}
        >
          {description}
        </p>
      </div>
    </div>
  )
}