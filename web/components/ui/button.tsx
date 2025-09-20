"use client"
import * as React from "react"
import { cn } from "@/lib/utils"

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "destructive" | "ghost" | "link"
  size?: "sm" | "md" | "lg"
}

const variantClass: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-primary text-primary-foreground hover:shadow-neumorphic-hover active:shadow-neumorphic-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none shadow-neumorphic-soft",
  secondary:
    "bg-secondary text-secondary-foreground hover:shadow-neumorphic-hover active:shadow-neumorphic-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none shadow-neumorphic-soft",
  destructive:
    "bg-destructive text-foreground hover:shadow-neumorphic-hover active:shadow-neumorphic-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--destructive)]/50 disabled:opacity-50 disabled:pointer-events-none shadow-neumorphic-soft",
  ghost:
    "bg-transparent hover:bg-accent text-foreground disabled:opacity-50 disabled:pointer-events-none",
  link: "bg-transparent underline underline-offset-4 text-primary hover:opacity-80",
}

const sizeClass: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 px-3 text-sm rounded-xl",
  md: "h-10 px-4 text-sm rounded-xl",
  lg: "h-11 px-5 text-base rounded-2xl",
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap transition-colors",
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

