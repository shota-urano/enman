"use client"

export type GoogleLatLngLiteral = { lat: number; lng: number }

export type GoogleLatLngAccessor = { lat(): number; lng(): number }

export type GoogleLatLngBounds = {
  extend(latLng: GoogleLatLngLiteral): void
  getNorthEast(): GoogleLatLngAccessor
  getSouthWest(): GoogleLatLngAccessor
}

export type GoogleMapsEventListener = { remove(): void }

export type GoogleMapsEventNamespace = {
  addListener(instance: unknown, eventName: string, handler: () => void): GoogleMapsEventListener
  addListenerOnce(instance: unknown, eventName: string, handler: () => void): GoogleMapsEventListener
}

export type GoogleMap = {
  getBounds(): GoogleLatLngBounds | null
  fitBounds(bounds: GoogleLatLngBounds, padding?: number): void
}

export type GoogleMarker = {
  setMap(map: GoogleMap | null): void
  getMap(): GoogleMap | null
  addListener(eventName: string, handler: () => void): GoogleMapsEventListener
  set(property: string, value: unknown): void
}

export type GoogleInfoWindow = {
  setContent(content: string | Node): void
  open(map: GoogleMap, anchor?: GoogleMarker): void
}

export type GoogleMapsApi = {
  Map: new (
    element: HTMLElement,
    options: {
      center: GoogleLatLngLiteral
      zoom: number
      mapTypeControl?: boolean
      streetViewControl?: boolean
      fullscreenControl?: boolean
    },
  ) => GoogleMap
  Marker: new (options: { map?: GoogleMap; position: GoogleLatLngLiteral; title?: string }) => GoogleMarker
  InfoWindow: new (options?: { content?: string | Node }) => GoogleInfoWindow
  LatLngBounds: new () => GoogleLatLngBounds
  event: GoogleMapsEventNamespace
}

let loaderPromise: Promise<GoogleMapsApi> | null = null

export async function loadGoogleMaps(): Promise<GoogleMapsApi> {
  if (typeof window === "undefined") {
    throw new Error("Google Maps はブラウザ環境でのみ利用できます")
  }

  const anyWindow = window as typeof window & { google?: { maps?: GoogleMapsApi } }

  if (anyWindow.google?.maps) {
    return anyWindow.google.maps
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY が設定されていません")
  }

  if (!loaderPromise) {
    loaderPromise = new Promise<GoogleMapsApi>((resolve, reject) => {
      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&libraries=maps,marker,places`
      script.async = true
      script.defer = true
      script.onload = () => {
        if (anyWindow.google?.maps) {
          resolve(anyWindow.google.maps)
        } else {
          reject(new Error("Google Maps API の読み込みに失敗しました"))
        }
      }
      script.onerror = () => reject(new Error("Google Maps API の読み込みに失敗しました"))
      document.head.appendChild(script)
    })
  }

  return loaderPromise
}
