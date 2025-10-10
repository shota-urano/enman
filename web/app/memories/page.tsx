import RequireAuth from "@/components/auth/RequireAuth"
import MemoryMapView from "@/components/memory-map/MemoryMapView"

export default function MemoriesPage() {
  return (
    <RequireAuth>
      <MemoryMapView />
    </RequireAuth>
  )
}

