// Server-only environment loader (do not import in client components)
// Centralizes mapping/validation of server-side env vars

function get(name: string, required = false): string | undefined {
  const v = process.env[name]
  if (required && !v) {
    // Throwing here makes missing envs obvious during server start/tests
    throw new Error(`必須の環境変数が未設定です: ${name}`)
  }
  return v
}

export const serverEnv = {
  SUPABASE_URL: get("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE: get("SUPABASE_SERVICE_ROLE"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: get("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  GOOGLE_MAPS_API_KEY: get("GOOGLE_MAPS_API_KEY"),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: get("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"),
  MCP_ENDPOINT: get("MCP_ENDPOINT"),
  MCP_AUTH_TOKEN: get("MCP_AUTH_TOKEN"),
  INVITE_SECRET: get("INVITE_SECRET"),
}

export type ServerEnv = typeof serverEnv

