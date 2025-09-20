"use client"
import * as React from "react"
import { cn } from "@/lib/utils"

export type CardProps = React.HTMLAttributes<HTMLDivElement>

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border-0 bg-card text-foreground shadow-neumorphic",
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
      className={cn("p-4 text-[13px] text-muted-foreground border-b", className)}
      {...props}
    />
  ),
)
CardHeader.displayName = "CardHeader"

export const CardBody = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-4", className)} {...props} />
  ),
)
CardBody.displayName = "CardBody"

export default Card

