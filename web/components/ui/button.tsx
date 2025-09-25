"use client"
import * as React from "react"
import { cn } from "@/lib/utils"

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "destructive" | "ghost" | "link"
  size?: "sm" | "md" | "lg"
}

const variantClass: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-gradient-to-br from-white via-[rgba(255,255,255,0.92)] to-[rgba(255,239,243,0.9)] text-foreground shadow-neumorphic-soft hover:shadow-neumorphic-hover hover:-translate-y-[1px] active:shadow-neumorphic-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none",
  secondary:
    "bg-gradient-to-br from-white via-[rgba(255,255,255,0.94)] to-[rgba(221,228,240,0.92)] text-secondary-foreground shadow-neumorphic-soft hover:shadow-neumorphic-hover hover:-translate-y-[1px] active:shadow-neumorphic-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none",
  destructive:
    "bg-gradient-to-br from-[rgba(255,206,212,1)] via-[rgba(255,176,188,0.92)] to-[rgba(242,139,148,0.9)] text-white shadow-neumorphic-soft hover:shadow-neumorphic-hover hover:-translate-y-[1px] active:shadow-neumorphic-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--destructive)]/50 disabled:opacity-60 disabled:pointer-events-none",
  ghost:
    "bg-transparent text-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-50 disabled:pointer-events-none",
  link: "bg-transparent underline underline-offset-4 text-primary hover:opacity-80",
}

const sizeClass: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-9 px-4 text-[13px] rounded-[999px]",
  md: "h-11 px-6 text-sm md:text-[15px] rounded-[999px]",
  lg: "h-12 px-7 text-base rounded-[999px]",
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap font-medium tracking-wide transition-all duration-200",
          sizeClass[size],
          variantClass[variant],
          className,
        )}
        {...props}
      />
    )
  },
)

Button.displayName = "Button"

export default Button

