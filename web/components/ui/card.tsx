"use client"
import * as React from "react"
import { cn } from "@/lib/utils"

export type CardProps = React.HTMLAttributes<HTMLDivElement>

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[28px] border border-white/40 bg-card text-foreground shadow-neumorphic bg-surface-neumorphic",
        className,
      )}
      {...props}
    />
  ),
)
Card.displayName = "Card"

export const CardHeader = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-2 rounded-t-[28px] border-b border-white/50 bg-white/30 px-6 py-4 text-[13px] text-muted-foreground backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  ),
)
CardHeader.displayName = "CardHeader"

export const CardBody = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("px-6 py-5 text-sm text-foreground", className)}
      {...props}
    />
  ),
)
CardBody.displayName = "CardBody"

export default Card

