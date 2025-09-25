"use client"
import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-12 w-full rounded-[999px] bg-gradient-to-br from-white via-[rgba(255,255,255,0.95)] to-[rgba(223,228,240,0.92)] px-5 text-base sm:text-sm",
          "border border-transparent text-foreground placeholder:text-muted-foreground shadow-inner focus:border-ring/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      />
    )
  },
)

Input.displayName = "Input"

export default Input

