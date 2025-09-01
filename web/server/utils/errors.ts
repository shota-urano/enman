export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'SYSTEM_ERROR'

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly status: number
  readonly details?: unknown

  constructor(code: AppErrorCode, message: string, status: number, details?: unknown) {
    super(message)
    this.code = code
    this.status = status
    this.details = details
  }
}

export function badRequest(message: string, details?: unknown) {
  return new AppError('VALIDATION_ERROR', message, 400, details)
}

export function unauthorized(message = 'Unauthorized') {
  return new AppError('UNAUTHORIZED', message, 401)
}

export function forbidden(message = 'Forbidden') {
  return new AppError('FORBIDDEN', message, 403)
}

export function notFound(message = 'Not Found') {
  return new AppError('NOT_FOUND', message, 404)
}

export function conflict(message = 'Conflict', details?: unknown) {
  return new AppError('CONFLICT', message, 409, details)
}

export function systemError(message = 'System Error', details?: unknown) {
  return new AppError('SYSTEM_ERROR', message, 500, details)
}

export function normalizeError(e: unknown): AppError {
  if (e instanceof AppError) return e
  // Surface PostgREST or Supabase errors where possible
  const message = e instanceof Error ? e.message : String(e)
  return systemError(message)
}

export function toErrorBody(e: AppError) {
  return { code: e.code, message: e.message, details: e.details }
}

