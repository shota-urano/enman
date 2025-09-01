// Server-only environment loader (do not import in client components)
// Centralizes mapping/validation of server-side env vars

function get(name: string, required = false): string | undefined {
  const v = process.env[name]
  if (required && !v) {
    // Throwing here makes missing envs obvious during server start/tests
    throw new Error(`Missing required env: ${name}`)
  }
  return v
}

export const serverEnv = {
  SUPABASE_URL: get("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE: get("SUPABASE_SERVICE_ROLE"),
  MCP_ENDPOINT: get("MCP_ENDPOINT"),
  MCP_AUTH_TOKEN: get("MCP_AUTH_TOKEN"),
  INVITE_SECRET: get("INVITE_SECRET"),
}

export type ServerEnv = typeof serverEnv

