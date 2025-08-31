import { NextResponse } from "next/server"
import { serverEnv } from "@/server/config/env"

export async function GET() {
  const now = new Date().toISOString()
  // Only expose non-sensitive status fields
  const status = {
    ok: true,
    time: now,
    mcpConfigured: Boolean(serverEnv.MCP_ENDPOINT),
    supabaseClientConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  }
  return NextResponse.json(status)
}

