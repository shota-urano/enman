import { NextResponse } from "next/server"
import { serverEnv } from "@/server/config/env"
import { getMcpClient } from "@/server/clients/mcpClient"

export async function GET() {
  const now = new Date().toISOString()
  let mcpReachable = false
  let mcpLatencyMs: number | undefined
  let mcpStatus: number | undefined

  if (serverEnv.MCP_ENDPOINT) {
    try {
      const client = getMcpClient()
      const r = await client.ping()
      mcpReachable = r.ok
      mcpLatencyMs = r.latencyMs
      mcpStatus = r.status
    } catch {
      mcpReachable = false
    }
  }
  // Only expose non-sensitive status fields
  const status = {
    ok: true,
    time: now,
    mcpConfigured: Boolean(serverEnv.MCP_ENDPOINT),
    mcpReachable,
    mcpStatus,
    mcpLatencyMs,
    supabaseClientConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  }
  return NextResponse.json(status)
}

