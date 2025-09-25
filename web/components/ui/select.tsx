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
  ({ className, children, value, defaultValue, onChange, placeholder = "選択してください", disabled = false, options = [], variant = 'default', appearance = 'solid' }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const [selectedValue, setSelectedValue] = React.useState(value ?? defaultValue ?? "")
    const selectRef = React.useRef<HTMLDivElement>(null)

    // children からオプションを抽出する関数
    type OptionElProps = { value?: string | number | readonly string[]; children?: React.ReactNode }
    const extractOptionsFromChildren = React.useMemo(() => {
      const extractedOptions: SelectOption[] = []
      
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child) && child.type === 'option') {
          const el = child as React.ReactElement<OptionElProps>
          extractedOptions.push({
            value: String((el.props as OptionElProps).value || ""),
            label: String((el.props as OptionElProps).children || "")
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
      <div
        ref={(node) => {
          selectRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref && typeof ref === 'object') (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
        }}
        className={cn("relative", className)}
      >
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={cn(
            // Base layout
            "flex h-12 w-full items-center justify-between px-5 text-sm font-medium tracking-wide",
            // Variants
            variant === 'neumorphic'
              ? cn(
                  appearance === 'inset'
                    ? cn(
                        "rounded-[30px] bg-gradient-to-br from-white/90 via-white/75 to-white/55 text-foreground",
                        "border border-white/40 shadow-inner transition-all duration-200 ease-in-out",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                        "disabled:cursor-not-allowed disabled:opacity-60",
                      )
                    : cn(
                        "rounded-[30px] bg-gradient-to-br from-white via-[rgba(255,255,255,0.94)] to-[rgba(223,228,240,0.92)] text-foreground",
                        "border border-transparent shadow-neumorphic-soft transition-all duration-200 ease-in-out",
                        "hover:shadow-neumorphic-hover hover:-translate-y-[1px] active:shadow-neumorphic-pressed",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                        "disabled:cursor-not-allowed disabled:opacity-60",
                      ),
              )
              : cn(
                  "rounded-[30px] bg-gradient-to-br from-white via-[rgba(255,255,255,0.94)] to-[rgba(226,231,242,0.9)] text-foreground",
                  "border border-white/60 shadow-neumorphic-soft transition-all duration-200 ease-in-out",
                  "hover:shadow-neumorphic-hover hover:-translate-y-[1px]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  isOpen && "shadow-neumorphic-hover",
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
          <div
            className={cn(
              "absolute z-50 mt-3 w-full rounded-[28px] border border-white/40 bg-white/85 backdrop-blur-md",
              "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200",
              variant === 'neumorphic'
                ? "shadow-neumorphic-soft"
                : "shadow-neumorphic-soft",
            )}
          >
            <div className="max-h-64 overflow-auto px-1 py-2">
              {allOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "w-full rounded-[24px] px-4 py-2.5 text-left text-sm transition-all duration-150",
                    "hover:bg-accent/50 hover:shadow-neumorphic-soft",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                    option.value === selectedValue && "bg-accent/70 font-medium text-foreground",
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

