import { serverEnv } from "@/server/config/env"

type McpClientConfig = {
  baseUrl: string
  token?: string
  timeoutMs?: number
}

export type McpPingResult = {
  ok: boolean
  status?: number
  latencyMs?: number
  error?: string
}

export class McpClient {
  private readonly baseUrl: string
  private readonly token?: string
  private readonly timeoutMs: number

  constructor(cfg?: Partial<McpClientConfig>) {
    const baseUrl = cfg?.baseUrl ?? serverEnv.MCP_ENDPOINT
    if (!baseUrl) throw new Error("MCP_ENDPOINT is not configured")
    this.baseUrl = baseUrl.replace(/\/$/, "")
    this.token = cfg?.token ?? serverEnv.MCP_AUTH_TOKEN
    this.timeoutMs = cfg?.timeoutMs ?? 4000
  }

  private buildHeaders() {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`
    return headers
  }

  private async request(path: string, init?: RequestInit) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const headers = new Headers(this.buildHeaders())
      if (init?.headers) {
        new Headers(init.headers).forEach((value, key) => headers.set(key, value))
      }
      const res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
        cache: "no-store",
      })
      return res
    } finally {
      clearTimeout(timer)
    }
  }

  // Minimal liveness check against MCP. Tries `/health` first, falls back to `/db/ping`.
  async ping(): Promise<McpPingResult> {
    const start = Date.now()
    try {
      let res = await this.request("/health", { method: "GET" })
      if (!res.ok && res.status === 404) {
        // Try alternative path
        res = await this.request("/db/ping", { method: "GET" })
      }

      const latency = Date.now() - start
      return { ok: res.ok, status: res.status, latencyMs: latency }
    } catch (e: unknown) {
      const latency = Date.now() - start
      const message = e instanceof Error ? e.message : String(e)
      return { ok: false, error: message, latencyMs: latency }
    }
  }
}

export function getMcpClient() {
  return new McpClient()
}
