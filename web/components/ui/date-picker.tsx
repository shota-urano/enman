"use client"
import * as React from "react"
import { cn } from "@/lib/utils"

export type DatePickerProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
>

/**
 * Minimal date picker using native <input type="date"> for zero dependency.
 * Can be swapped later for a richer calendar if needed.
 */
export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="date"
        className={cn(
          "flex h-12 w-full rounded-[999px] bg-gradient-to-br from-white via-[rgba(255,255,255,0.95)] to-[rgba(223,228,240,0.92)] px-5 text-sm",
          "border border-transparent text-foreground placeholder:text-muted-foreground shadow-inner focus:border-ring/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      />
    )
  },
)

DatePicker.displayName = "DatePicker"

export default DatePicker

