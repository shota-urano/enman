import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/server/utils/auth'
import { normalizeError, toErrorBody, badRequest } from '@/server/utils/errors'
import { profilesRepository } from '@/server/repositories/profilesRepository'
import { createSupabaseAdmin } from '@/server/clients/supabase'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

function resolveExtension(file: File): string {
  const name = file.name || ''
  const byName = name.includes('.') ? name.split('.').pop() ?? '' : ''
  const normalized = (byName || '').trim().toLowerCase()
  if (normalized) return normalized
  const type = file.type.toLowerCase()
  if (type.includes('png')) return 'png'
  if (type.includes('jpeg')) return 'jpg'
  if (type.includes('jpg')) return 'jpg'
  if (type.includes('webp')) return 'webp'
  if (type.includes('gif')) return 'gif'
  return 'png'
}

function isSupportedMime(type: string): boolean {
  return ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(type)
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      throw badRequest('画像ファイルを指定してください')
    }
    if (file.size === 0) {
      throw badRequest('空のファイルはアップロードできません')
    }
    if (file.size > MAX_FILE_SIZE) {
      throw badRequest('画像サイズは 5MB 以下にしてください')
    }
    if (!isSupportedMime(file.type)) {
      throw badRequest('対応していない画像形式です (png/jpeg/webp/gif)')
    }

    const existing = await profilesRepository.ensure(session.userId)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const ext = resolveExtension(file)
    const objectPath = `${session.userId}/${Date.now()}.${ext}`

    const supabase = createSupabaseAdmin()
    const uploadResult = await supabase.storage
      .from(profilesRepository.BUCKET_ID)
      .upload(objectPath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
      })

    if (uploadResult.error) {
      console.error('avatar upload failed', uploadResult.error)
      throw badRequest('画像のアップロードに失敗しました')
    }

    if (existing.avatar_path && existing.avatar_path !== objectPath) {
      await supabase.storage
        .from(profilesRepository.BUCKET_ID)
        .remove([existing.avatar_path])
        .catch((err) => {
          console.warn('failed to remove previous avatar', err)
        })
    }

    const updated = await profilesRepository.upsert(session.userId, {
      avatar_path: objectPath,
    })

    return NextResponse.json({
      avatar_url: updated.avatar_url,
      avatar_path: updated.avatar_path,
    })
  } catch (e: unknown) {
    const err = normalizeError(e)
    return NextResponse.json(toErrorBody(err), { status: err.status })
  }
}
