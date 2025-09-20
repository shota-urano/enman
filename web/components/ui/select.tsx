"use client"
import * as React from "react"
import { cn } from "@/lib/utils"

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  children?: React.ReactNode
  className?: string
  placeholder?: string
  disabled?: boolean
  options?: SelectOption[]
  variant?: 'default' | 'neumorphic'
  appearance?: 'solid' | 'inset'
}

export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ className, children, value, defaultValue, onChange, placeholder = "選択してください", disabled = false, options = [], variant = 'default', appearance = 'solid', ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const [selectedValue, setSelectedValue] = React.useState(value ?? defaultValue ?? "")
    const selectRef = React.useRef<HTMLDivElement>(null)

    // children からオプションを抽出する関数
    const extractOptionsFromChildren = React.useMemo(() => {
      const extractedOptions: SelectOption[] = []
      
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child) && child.type === 'option') {
          const el = child as React.ReactElement<any>
          extractedOptions.push({
            value: String(el.props.value || ""),
            label: String(el.props.children || "")
          })
        }
      })
      
      return extractedOptions
    }, [children])

    const allOptions = options.length > 0 ? options : extractOptionsFromChildren
    const selectedOption = allOptions.find(option => option.value === selectedValue)

    const handleSelect = (optionValue: string) => {
      setSelectedValue(optionValue)
      onChange?.(optionValue)
      setIsOpen(false)
    }

    const handleToggle = () => {
      if (!disabled) {
        setIsOpen(!isOpen)
      }
    }

    // クリック外でメニューを閉じる
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
          setIsOpen(false)
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // ESCキーでメニューを閉じる
    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setIsOpen(false)
        }
      }

      if (isOpen) {
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
      }
    }, [isOpen])

    // 外部からのvalue変更に対応
    React.useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(value)
      }
    }, [value])

    return (
      <div ref={selectRef} className={cn("relative", className)} {...props}>
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={cn(
            // Base layout
            "flex h-12 w-full items-center justify-between px-4 py-3 text-sm font-medium",
            // Variants
            variant === 'neumorphic'
              ? cn(
                  appearance === 'inset'
                    ? cn(
                        "rounded-2xl bg-transparent text-foreground",
                        "border-0 shadow-none transition-all duration-200 ease-in-out",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                        "disabled:cursor-not-allowed disabled:opacity-60",
                      )
                    : cn(
                        "rounded-2xl bg-card text-foreground",
                        "border-0 shadow-neumorphic-soft transition-all duration-200 ease-in-out",
                        "hover:shadow-neumorphic-hover active:shadow-neumorphic-pressed",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                        "disabled:cursor-not-allowed disabled:opacity-60",
                      ),
              )
              : cn(
                  "rounded-2xl bg-card text-foreground",
                  "border border-border/60 shadow-sm",
                  "bg-gradient-to-b from-card to-card/95",
                  "transition-all duration-200 ease-in-out",
                  "hover:border-border hover:shadow-md hover:bg-gradient-to-b hover:from-card hover:to-muted/20",
                  "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:border-ring",
                  "focus-visible:shadow-lg focus-visible:shadow-ring/10",
                  "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-sm",
                  isOpen && "border-ring shadow-lg shadow-ring/10 bg-gradient-to-b from-card to-muted/20",
                )
          )}
        >
          <span className={cn(
            "truncate text-left",
            !selectedOption && "text-muted-foreground"
          )}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          
          <svg
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {/* Modern dropdown menu */}
        {isOpen && (
          <div className={cn(
            "absolute z-50 w-full mt-2 py-2 bg-card rounded-2xl",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200",
            variant === 'neumorphic'
              ? cn("shadow-neumorphic-soft border-0 backdrop-blur-sm bg-card/95")
              : cn("border border-border/60 shadow-xl backdrop-blur-sm bg-card/95 border-border/40")
          )}>
            <div className="max-h-60 overflow-auto">
              {allOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "w-full px-4 py-3 text-left text-sm transition-all duration-150",
                    variant === 'neumorphic'
                      ? cn(
                          "bg-card hover:shadow-neumorphic-soft hover:bg-muted/40",
                          "focus-visible:outline-none focus-visible:shadow-neumorphic-soft",
                        )
                      : cn(
                          "hover:bg-muted/60 hover:text-foreground",
                          "focus-visible:outline-none focus-visible:bg-muted/60",
                        ),
                    "first:rounded-t-xl last:rounded-b-xl",
                    option.value === selectedValue && (variant === 'neumorphic'
                      ? "bg-primary/10 text-foreground font-medium"
                      : "bg-primary/10 text-foreground font-medium")
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  },
)

Select.displayName = "Select"

export default Select

