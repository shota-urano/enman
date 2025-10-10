"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const AUTOCOMPLETE_ENDPOINT = "https://places.googleapis.com/v1/places:autocomplete"
const FIELD_MASK = [
  "suggestions.placePrediction.placeId",
  "suggestions.placePrediction.structuredFormat.mainText.text",
  "suggestions.placePrediction.structuredFormat.secondaryText.text",
]

export type PlaceSelectorValue = {
  placeId: string | null
  sessionToken: string | null
  name: string
  formattedAddress: string
}

export function createEmptyPlaceValue(): PlaceSelectorValue {
  return {
    placeId: null,
    sessionToken: null,
    name: "",
    formattedAddress: "",
  }
}

type Suggestion = {
  placeId: string
  name: string
  address: string
}

type PlaceSelectorProps = {
  value: PlaceSelectorValue
  onChange: (value: PlaceSelectorValue) => void
  className?: string
}

export default function PlaceSelector({ value, onChange, className }: PlaceSelectorProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const activeSessionRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const disabled = !apiKey

  useEffect(() => {
    if (disabled) return
    if (!query.trim()) {
      setSuggestions([])
      setError(null)
      if (abortRef.current) {
        abortRef.current.abort()
        abortRef.current = null
      }
      return
    }
    if (query.trim().length < 2) {
      setSuggestions([])
      setError(null)
      return
    }

    const sessionToken = (() => {
      if (!activeSessionRef.current) activeSessionRef.current = crypto.randomUUID()
      return activeSessionRef.current
    })()

    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)

    const timeoutId = window.setTimeout(async () => {
      try {
        const res = await fetch(AUTOCOMPLETE_ENDPOINT, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey!,
            "X-Goog-FieldMask": FIELD_MASK.join(","),
          },
          body: JSON.stringify({
            input: query,
            languageCode: "ja",
            sessionToken,
          }),
        })

        if (!res.ok) {
          const text = await res.text().catch(() => "")
          throw new Error(text || `HTTP ${res.status}`)
        }

        const json = (await res.json()) as {
          suggestions?: Array<{
            placePrediction?: {
              placeId?: string
              structuredFormat?: {
                mainText?: { text?: string }
                secondaryText?: { text?: string }
              }
            }
          }>
        }

        const list =
          json.suggestions?.flatMap((s) => {
            const pred = s.placePrediction
            if (!pred?.placeId) return []
            const main = pred.structuredFormat?.mainText?.text ?? ""
            const secondary = pred.structuredFormat?.secondaryText?.text ?? ""
            return [
              {
                placeId: pred.placeId,
                name: main || secondary || pred.placeId,
                address: secondary,
              },
            ]
          }) ?? []

        setSuggestions(list.slice(0, 8))
      } catch (err: unknown) {
        if (controller.signal.aborted) return
        console.error("places autocomplete failed", err)
        setError("候補の取得に失敗しました")
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [apiKey, disabled, query])

  const handleSelect = useCallback(
    (suggestion: Suggestion) => {
      const committedToken = activeSessionRef.current
      activeSessionRef.current = null
      setSuggestions([])
      setQuery("")
      setError(null)
      onChange({
        placeId: suggestion.placeId,
        sessionToken: committedToken ?? crypto.randomUUID(),
        name: suggestion.name,
        formattedAddress: suggestion.address,
      })
    },
    [onChange],
  )

  const handleClear = useCallback(() => {
    activeSessionRef.current = null
    setSuggestions([])
    setQuery("")
    setError(null)
    onChange(createEmptyPlaceValue())
  }, [onChange])

  const selected = useMemo(() => Boolean(value.placeId), [value.placeId])

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <label className="text-sm font-medium text-muted-foreground">場所検索（Google）</label>
        <div className="relative mt-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={disabled ? "APIキーが未設定です" : "店名や住所を入力"}
            disabled={disabled}
            autoComplete="off"
          />
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">検索中…</span>
          )}
          {suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-muted bg-white shadow-lg">
              {suggestions.map((s) => (
                <li
                  key={s.placeId}
                  className="cursor-pointer px-4 py-2 hover:bg-muted/60"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelect(s)
                  }}
                >
                  <div className="text-sm font-medium text-foreground">{s.name}</div>
                  {s.address && <div className="text-xs text-muted-foreground mt-1">{s.address}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        {disabled && (
          <p className="mt-1 text-xs text-muted-foreground">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY を設定すると候補検索が有効になります
          </p>
        )}
      </div>

      {selected && (
        <div className="rounded-2xl border border-muted bg-muted/40 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-muted-foreground">選択中の場所</div>
            <Button type="button" variant="ghost" size="sm" onClick={handleClear} className="text-xs px-3">
              クリア
            </Button>
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">名称</label>
              <Input
                className="mt-1"
                value={value.name}
                onChange={(e) =>
                  onChange({
                    ...value,
                    name: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">住所</label>
              <Input
                className="mt-1"
                value={value.formattedAddress}
                onChange={(e) =>
                  onChange({
                    ...value,
                    formattedAddress: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

