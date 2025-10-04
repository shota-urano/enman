import { z } from 'zod'

const avatarSchema = z.union([
  z.string().trim().max(512, 'アイコンパスが長すぎます'),
  z.null(),
])

const optionalAvatarSchema = avatarSchema.optional()

export const profileUpdateSchema = z
  .object({
    display_name: z
      .string()
      .trim()
      .min(1, '名前を入力してください')
      .max(64, '名前は64文字以内で入力してください')
      .optional(),
    avatar_path: optionalAvatarSchema,
  })
  .refine((data) => data.display_name !== undefined || data.avatar_path !== undefined, {
    message: '更新する項目を指定してください',
    path: ['display_name'],
  })

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
