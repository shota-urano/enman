"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  loadGoogleMaps,
  type GoogleInfoWindow,
  type GoogleMap,
  type GoogleMarker,
  type GoogleMapsApi,
  type GoogleMapsEventListener,
} from "@/lib/googleMapsLoader"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type MemoryPoint = {
  id: string
  date: string
  amount: number
  kind: "income" | "expense"
  category_id: string
  memo: string | null
  place_id: string | null
  place_label: string | null
  place_name: string | null
  formatted_address: string | null
  lat: number
  lng: number
}

type Filters = {
  from: string
  to: string
}

const DEFAULT_CENTER = { lat: 35.6809591, lng: 139.7673068 } // 東京駅付近

export default function MemoryMapView() {
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<GoogleMap | null>(null)
  const mapsRef = useRef<GoogleMapsApi | null>(null)
  const markersRef = useRef<Map<string, GoogleMarker>>(new Map())
  const infoWindowRef = useRef<GoogleInfoWindow | null>(null)
  const idleListenerRef = useRef<GoogleMapsEventListener | null>(null)
  const fetchTimeoutRef = useRef<number | null>(null)
  const lastQueryRef = useRef<string | null>(null)
  const hasFitRef = useRef(false)

  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [points, setPoints] = useState<MemoryPoint[]>([])
  const [filters, setFilters] = useState<Filters>({ from: "", to: "" })

  // Lazy initialise map when section enters viewport
  useEffect(() => {
    if (!sectionRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting)
        if (isVisible) {
          setReady(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  const buildInfoContent = useCallback((point: MemoryPoint) => {
    const container = document.createElement("div")
    container.style.maxWidth = "220px"

    const title = document.createElement("div")
    title.textContent = point.place_label ?? point.place_name ?? "名称未設定"
    title.style.fontWeight = "600"
    title.style.marginBottom = "4px"
    container.appendChild(title)

    if (point.formatted_address) {
      const address = document.createElement("div")
      address.textContent = point.formatted_address
      address.style.fontSize = "12px"
      address.style.color = "#4b5563"
      address.style.marginBottom = "6px"
      container.appendChild(address)
    }

    const meta = document.createElement("div")
    meta.style.fontSize = "12px"
    meta.style.color = "#6b7280"
    meta.innerText = `${point.date} / ¥${point.amount.toLocaleString()}`
    container.appendChild(meta)

    if (point.memo) {
      const memo = document.createElement("div")
      memo.style.marginTop = "6px"
      memo.style.fontSize = "12px"
      memo.style.whiteSpace = "pre-wrap"
      memo.textContent = point.memo
      container.appendChild(memo)
    }

    return container
  }, [])

  const showInfoWindow = useCallback(
    (point: MemoryPoint) => {
      const map = mapRef.current
      const infoWindow = infoWindowRef.current
      if (!map || !infoWindow) return
      const marker = markersRef.current.get(point.id)
      if (!marker) return
      infoWindow.setContent(buildInfoContent(point))
      infoWindow.open(map, marker)
    },
    [buildInfoContent],
  )

  const updateMarkers = useCallback(
    (maps: GoogleMapsApi, map: GoogleMap, list: MemoryPoint[]) => {
      const markers = markersRef.current
      const incomingIds = new Set(list.map((p) => p.id))

      // Remove stale markers
      markers.forEach((marker, id) => {
        if (!incomingIds.has(id)) {
          marker.setMap(null)
          markers.delete(id)
        }
      })

      // Upsert markers
      list.forEach((point) => {
        let marker = markers.get(point.id)
        if (!marker) {
          marker = new maps.Marker({
            map,
            position: { lat: point.lat, lng: point.lng },
            title: point.place_label ?? point.place_name ?? undefined,
          })
          marker.addListener("click", () => showInfoWindow(point))
          markers.set(point.id, marker)
        } else if (marker.getMap() === null) {
          marker.setMap(map)
        }
        marker.set("memoryPoint", point)
      })
    },
    [showInfoWindow],
  )

  const fetchData = useCallback(async () => {
    const map = mapRef.current
    const maps = mapsRef.current
    if (!map || !maps) return

    const bounds = map.getBounds()
    if (!bounds) return
    const ne = bounds.getNorthEast()
    const sw = bounds.getSouthWest()
    const params = new URLSearchParams()
    params.set("bbox", `${sw.lng()},${sw.lat()},${ne.lng()},${ne.lat()}`)
    if (filters.from) params.set("from", filters.from)
    if (filters.to) params.set("to", filters.to)

    const query = params.toString()
    if (query === lastQueryRef.current) return
    lastQueryRef.current = query

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/memories?${query}`, { cache: "no-store" })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const json = (await res.json()) as MemoryPoint[] | unknown
      const list = Array.isArray(json)
        ? json.filter((it): it is MemoryPoint => typeof (it as MemoryPoint).lat === "number" && typeof (it as MemoryPoint).lng === "number")
        : []

      setPoints(list)
      updateMarkers(maps, map, list)

      if (!hasFitRef.current && list.length > 0) {
        const fitBounds = new maps.LatLngBounds()
        list.forEach((p) => fitBounds.extend({ lat: p.lat, lng: p.lng }))
        map.fitBounds(fitBounds, 64)
        hasFitRef.current = true
      }
    } catch (err: unknown) {
      console.error("Failed to load memories", err)
      setError("思い出マップの取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [filters.from, filters.to, updateMarkers])

  const scheduleFetch = useCallback(() => {
    if (fetchTimeoutRef.current) {
      window.clearTimeout(fetchTimeoutRef.current)
    }
    fetchTimeoutRef.current = window.setTimeout(() => {
      fetchData()
    }, 300)
  }, [fetchData])

  // Initialise map
  useEffect(() => {
    const container = mapContainerRef.current
    if (!ready || mapRef.current || !container) return
    let canceled = false

    loadGoogleMaps()
      .then((maps) => {
        if (canceled) return
        mapsRef.current = maps
        const map = new maps.Map(container, {
          center: DEFAULT_CENTER,
          zoom: 5,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        })
        mapRef.current = map
        infoWindowRef.current = new maps.InfoWindow()

        idleListenerRef.current = maps.event.addListener(map, "idle", () => scheduleFetch())
        maps.event.addListenerOnce(map, "idle", () => fetchData())
      })
      .catch((err) => {
        console.error("Google Maps initialisation failed", err)
        setError(err instanceof Error ? err.message : "Google Maps の読み込みに失敗しました")
      })

    return () => {
      canceled = true
    }
  }, [fetchData, ready, scheduleFetch])

  useEffect(() => {
    const markers = markersRef.current
    return () => {
      if (idleListenerRef.current) {
        idleListenerRef.current.remove()
        idleListenerRef.current = null
      }
      if (fetchTimeoutRef.current) {
        window.clearTimeout(fetchTimeoutRef.current)
      }
      infoWindowRef.current = null
      mapRef.current = null
      mapsRef.current = null
      markers.forEach((marker) => marker.setMap(null))
      markers.clear()
    }
  }, [])

  // Re-fetch when filters change (if map already ready)
  useEffect(() => {
    if (!mapRef.current) return
    lastQueryRef.current = null
    fetchData()
  }, [fetchData])

  const sortedPoints = useMemo(() => {
    return [...points].sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))
  }, [points])

  return (
    <div ref={sectionRef} className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pb-24 pt-6 md:px-8">
      <Card className="overflow-hidden rounded-[36px] border border-white/60 bg-white/70 shadow-neumorphic">
        <CardHeader className="flex flex-col gap-2 border-b border-white/50 bg-white/60 px-8 py-6">
          <h1 className="text-xl font-semibold text-foreground">思い出マップ</h1>
          <p className="text-sm text-muted-foreground">
            思い出として残した取引を地図で振り返りましょう。地図が表示された状態でドラッグ／ズームすると自動で再検索します。
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">開始日</label>
              <Input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">終了日</label>
              <Input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="relative h-[420px] w-full overflow-hidden">
            <div ref={mapContainerRef} className="h-full w-full" />
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                <span className="text-sm text-muted-foreground">地図を読み込み中です…</span>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">登録済みの思い出</h2>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => {
              lastQueryRef.current = null
              fetchData()
            }}
          >
            再読み込み
          </Button>
          {loading && <span className="text-xs text-muted-foreground">更新中…</span>}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!error && sortedPoints.length === 0 && (
        <div className="rounded-3xl border border-dashed border-muted px-6 py-10 text-center text-sm text-muted-foreground">
          表示中の条件に一致する思い出がまだありません。取引登録で「思い出マップに登録する」をオンにしてみましょう。
        </div>
      )}

      <div className="grid gap-4">
        {sortedPoints.map((point) => (
          <Card
            key={point.id}
            className="rounded-[28px] border border-white/60 bg-white/70 shadow-neumorphic hover:shadow-neumorphic-hover"
          >
            <CardBody className="flex flex-col gap-2 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {point.place_label ?? point.place_name ?? "名称未設定"}
                  </div>
                  {point.formatted_address && (
                    <div className="text-xs text-muted-foreground mt-1">{point.formatted_address}</div>
                  )}
                </div>
                <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  {point.date} / ¥{point.amount.toLocaleString()}
                </div>
              </div>
              {point.memo && (
                <div className="text-xs text-muted-foreground whitespace-pre-wrap">{point.memo}</div>
              )}
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => showInfoWindow(point)}
                >
                  地図で見る
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}
