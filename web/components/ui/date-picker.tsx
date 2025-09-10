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
          "flex h-9 w-full rounded-md bg-background px-3 py-2 text-sm",
          "border border-input placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    )
  },
)

DatePicker.displayName = "DatePicker"

export default DatePicker

