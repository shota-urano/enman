"use client"

type GoogleMaps = any

let loaderPromise: Promise<GoogleMaps> | null = null

export async function loadGoogleMaps(): Promise<GoogleMaps> {
  if (typeof window === "undefined") {
    throw new Error("Google Maps はブラウザ環境でのみ利用できます")
  }

  const anyWindow = window as typeof window & { google?: { maps?: GoogleMaps } }

  if (anyWindow.google?.maps) {
    return anyWindow.google.maps
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY が設定されていません")
  }

  if (!loaderPromise) {
    loaderPromise = new Promise<GoogleMaps>((resolve, reject) => {
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
