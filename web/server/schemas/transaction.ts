import { z } from 'zod'

const placeIdSchema = z.string().min(1, 'place_id は空文字列にできません')
const sessionTokenSchema = z.string().min(1, 'place_session_token は空文字列にできません')
const optionalTextSchema = z.union([z.string(), z.null()]).optional()

export const txCreateSchema = z
  .object({
    kind: z.enum(['income', 'expense']),
    occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    amount: z.number().int().min(0),
    category_id: z.string().uuid(),
    account_id: z.string().uuid(),
    place: optionalTextSchema,
    memo: optionalTextSchema,
    place_id: placeIdSchema.optional(),
    place_session_token: sessionTokenSchema.optional(),
    memory_flag: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.place_session_token && !val.place_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['place_session_token'],
        message: 'place_id が未指定の状態で place_session_token を送信することはできません',
      })
    }
    if (val.memory_flag === true && !val.place_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['memory_flag'],
        message: '思い出マップに登録する場合は place_id を指定してください',
      })
    }
  })

export const txUpdateSchema = z
  .object({
    kind: z.enum(['income', 'expense']).optional(),
    occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    amount: z.number().int().min(0).optional(),
    category_id: z.string().uuid().optional(),
    account_id: z.string().uuid().optional(),
    place: optionalTextSchema,
    memo: optionalTextSchema,
    place_id: z.union([placeIdSchema, z.null()]).optional(),
    place_session_token: sessionTokenSchema.optional(),
    memory_flag: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.place_session_token && (!val.place_id || val.place_id === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['place_session_token'],
        message: 'place_id を更新しない場合は place_session_token を送信できません',
      })
    }
    if (val.memory_flag === true && val.place_id === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['memory_flag'],
        message: 'place_id を削除する場合は思い出マップ登録を false にしてください',
      })
    }
  })

export type TxCreateInput = z.infer<typeof txCreateSchema>
export type TxUpdateInput = z.infer<typeof txUpdateSchema>
