API詳細設計

設計方針
- クライアントはアプリ内API（/api/*, Next.js）を呼び出し、APIは MCP 経由で Supabase へアクセス。
- 入力検証は Zod。household スコープ検証を API 層で二重化（RLSと併用）。
- エラーは { code, message, details? } に正規化し、HTTP ステータスを付与。

共通仕様
- 認証: Supabase Auth セッション必須（Cookie/JWT）。ミドルウェアで検査。
- ヘッダ: `Content-Type: application/json`
- エラーコード: `VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN`, `UNAUTHORIZED`, `CONFLICT`, `SYSTEM_ERROR`

リソースエンドポイント

Households
- POST /api/households
  - Request: `{ name: string }`
  - Response: `201 { id: string, name: string }`
  - Errors: VALIDATION_ERROR, SYSTEM_ERROR

- GET /api/households/me
  - Response: `200 { household_id: string, role: 'owner'|'member' }`
  - Errors: UNAUTHORIZED, NOT_FOUND

Invites（論理）
- POST /api/households/invite
  - Request: `{ email?: string }` または `{ token: string }`
  - Response: `200 { token: string }`

- POST /api/households/join
  - Request: `{ token: string }`
  - Response: `200 { household_id: string }`

Masters
- GET /api/categories
- POST /api/categories
- PATCH /api/categories/:id

- GET /api/accounts
- POST /api/accounts
- PATCH /api/accounts/:id

Transactions
- GET /api/transactions?month=YYYY-MM&kind=income|expense
  - Response: `200 Transaction[]`
- GET /api/transactions?date=YYYY-MM-DD
  - Response: `200 Transaction[]`
- POST /api/transactions
  - Request:
    ```ts
    type CreateTxInput = {
      kind: 'income'|'expense'
      occurred_on: string // YYYY-MM-DD
      amount: number // >= 0, int
      category_id: string
      account_id: string
      place?: string
      memo?: string
    }
    ```
  - Response: `201 Transaction`
- PATCH /api/transactions/:id
  - Request: `Partial<CreateTxInput>`（kind/occurred_on/amount など）
  - Response: `200 Transaction`
- DELETE /api/transactions/:id
  - Response: `204`

Comments
- GET /api/comments?transaction_id=:id
- POST /api/comments
  - Request: `{ transaction_id: string, body: string }`
  - Response: `201 Comment`
- DELETE /api/comments/:id → `204`

Reactions
- GET /api/reactions?transaction_id=:id
- POST /api/reactions/toggle
  - Request: `{ transaction_id: string, emoji: string }`
  - Response: `200 Reaction`（追加/削除後の状態）

Subscriptions
- GET /api/subscriptions → `200 Subscription[]`
- POST /api/subscriptions → `201 Subscription`
- PATCH /api/subscriptions/:id → `200 Subscription`
- DELETE /api/subscriptions/:id → `204`
- POST /api/subscriptions/:id/confirm
  - Request: `{ amount?: number }`
  - Response: `201 Transaction`（当月分の確定登録結果）

Notifications
- GET /api/notifications?read=false
  - Response: `200 Notification[]`
- POST /api/notifications/:id/read → `204`

RPC（DB関数）委譲
- GET /api/reports/daily-totals?month=YYYY-MM
  - Response:
    ```ts
    type DailyTotal = { day: string, income: number, expense: number, diff: number }
    ```

型とスキーマ（抜粋）
```ts
// server/schemas/transaction.ts
import { z } from 'zod'

export const txCreateSchema = z.object({
  kind: z.enum(['income','expense']),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().int().min(0),
  category_id: z.string().uuid(),
  account_id: z.string().uuid(),
  place: z.string().optional(),
  memo: z.string().optional(),
})

export const txUpdateSchema = txCreateSchema.partial()
```

ハンドラ実装（サンプル）
```ts
// app/api/reports/daily-totals/route.ts (GET)
import { NextRequest, NextResponse } from 'next/server'
import { getSession, assertHouseholdMember } from '@/server/utils/auth'
import { rpc } from '@/server/repositories/rpcRepository'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    await assertHouseholdMember(session)
    const month = new URL(req.url).searchParams.get('month')
    if (!month) return NextResponse.json({ code:'VALIDATION_ERROR', message:'month is required' }, { status: 400 })
    const data = await rpc.getDailyTotals(session.householdId!, month)
    return NextResponse.json(data)
  } catch (e:any) {
    const status = e.code === 'PGRST116' ? 404 : 500
    return NextResponse.json({ code: e.code || 'SYSTEM_ERROR', message: e.message }, { status })
  }
}
```

DB呼出層（MCP/Supabase SDKラッパ）
```ts
// server/repositories/rpcRepository.ts
import { db } from '@/server/clients/mcpClient'

export const rpc = {
  async getDailyTotals(household: string, month: string){
    const { data, error } = await db.rpc('get_daily_totals', { _household: household, _month: month })
    if (error) throw error
    return data as { day: string, income: number, expense: number, diff: number }[]
  },
}
```

エラーハンドリング規約
- 400: VALIDATION_ERROR（Zod/必須不足/型不正）
- 401: UNAUTHORIZED（未ログイン）
- 403: FORBIDDEN（household 帰属不一致）
- 404: NOT_FOUND（対象なし）
- 409: CONFLICT（一意制約/リアクション重複）
- 422: ドメイン妥当性エラー（ビジネスルール違反）
- 500: SYSTEM_ERROR（SDK/ネットワーク/未知）

サンプル: 取引作成（cURL）
```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  -b 'sb:session=...' \
  -d '{
    "kind":"expense","occurred_on":"2025-09-01",
    "amount":1200,"category_id":"<uuid>","account_id":"<uuid>",
    "place":"スーパー","memo":"夕飯"
  }' \
  https://<host>/api/transactions
```

テスト観点
- 正常系: 各APIが仕様通りのステータス/ボディを返却
- 異常系: スキーマ不一致=400、他人世帯=403、未認証=401、存在しないID=404
- 並行: 連打時の二重送信防止（フロント）/一意制約409の表面化

トレーサビリティ
- 要件 A1: /auth, /households 系
- 要件 A2/A5/A6/A7: /transactions, /reports/daily-totals
- 要件 A3: /comments, /reactions, /notifications
- 要件 A4: /subscriptions, /subscriptions/:id/confirm
- 要件 A9: household 検証 + RLS 前提のAPI設計

