バックエンド詳細設計

アーキテクチャ詳細
- ランタイム: Next.js 14（App Router, Edge/Node runtimes）
- データアクセス: サーバ内API（/api/*）→ MCP → Supabase（PostgREST/RPC）
- 認証: Supabase Auth（クライアント維持）。サーバ側はセッション検証＋householdスコープ検証を二重化
- エラーモデル: ValidationError, DomainError, NotFoundError, SystemError に正規化
- ロギング: 重要イベント（作成/更新/削除）をサーバログへ簡易記録

ディレクトリ構成
- `app/api/*` APIハンドラ（REST相当）
- `server/schemas/*` Zodスキーマ（入力/出力）
- `server/repositories/*` DBアクセス（Supabase SDK; MCP委譲）
- `server/services/*` ドメインロジック（ビジネスルール）
- `server/utils/*` エラー/ガード/型ユーティリティ
- `server/clients/mcpClient.ts` MCPクライアント（Supabase委譲）

モジュール構成
- Auth/Household: セッション検証、所属世帯の解決
- Master: Categories/Accounts CRUD
- Transaction: 登録/更新/削除、日別/月次取得
- Reaction: Comments/Reactions CRUD + 通知
- Subscription: 定義CRUD、前日通知、当月確定登録
- Notification: 取得/既読

依存関係
- `zod`（入力検証）、`@supabase/supabase-js`（SDK）、`uuid`、`date-fns`、`ts-pattern`

クラス設計
TransactionService

責務: 取引の作成/更新/削除、取得、集計（RPC呼び出し）
属性:

repository: TransactionRepository - 取引テーブル操作
notifier: NotificationService - 通知発火（コメント/スタンプ時）


メソッド:

create(input: CreateTxInput, session: Session): Promise<Transaction> - 入力検証→メンバーシップ検証→INSERT→返却
update(id: string, input: UpdateTxInput, session: Session): Promise<Transaction> - RLS下でUPDATE、後勝ち
remove(id: string, session: Session): Promise<void> - RLS下でDELETE、関連の整合性はDBに委譲
listByMonth(householdId: string, month: string, kind?: 'income'|'expense'): Promise<Transaction[]> - 期間/種別フィルタ
getDailyTotals(householdId: string, month: string): Promise<DailyTotal[]> - RPC get_daily_totals を呼出


依存関係: HouseholdService, TransactionRepository, RpcRepository

SubscriptionService

責務: サブスク定義の管理と当月確定登録
属性:

repository: SubscriptionRepository - subscriptions CRUD
txRepository: TransactionRepository - 確定登録で transactions へ書込み


メソッド:

confirmForCurrentMonth(id: string, amount?: number, session: Session): Promise<Transaction> - 定義読込→金額確定→当月分をINSERT（RPC/サーバ側検証）
list(householdId: string): Promise<Subscription[]> - 一覧


依存関係: SubscriptionRepository, TransactionRepository

CommentService

責務: コメント作成/削除と通知連動
属性:

repository: CommentRepository - comments テーブル
notifier: NotificationService - 通知作成


メソッド:

create(input: CreateCommentInput, session: Session): Promise<Comment> - RLS下でINSERT→通知
remove(id: string, session: Session): Promise<void> - RLS下でDELETE


依存関係: CommentRepository, NotificationService

ReactionService

責務: スタンプ（絵文字リアクション）付与/取消（1ユーザー1件制約）
属性:

repository: ReactionRepository
notifier: NotificationService


メソッド:

toggle(input: ToggleReactionInput, session: Session): Promise<Reaction> - 既存確認→insert or delete→通知


依存関係: ReactionRepository, NotificationService

処理フロー詳細
取引登録処理

入力検証: Zod（種別/日付/金額>=0/カテゴリ/アカウント）
ビジネスロジック: household_id スコープ整合性（session.user ∈ household_members）
データアクセス: transactions へ INSERT（created_by=auth.uid()に一致）
出力処理: 作成行を返却
エラーハンドリング: ValidationError/NotFoundError/SystemError


サンプル実装（APIハンドラ抜粋, TypeScript）
```ts
// app/api/transactions/route.ts (POST)
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession, assertHouseholdMember } from '@/server/utils/auth'
import { transactionService } from '@/server/services'

const schema = z.object({
  kind: z.enum(['income','expense']),
  occurred_on: z.string().date().or(z.string()),
  amount: z.number().int().min(0),
  category_id: z.string().uuid(),
  account_id: z.string().uuid(),
  place: z.string().optional(),
  memo: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    const body = await req.json()
    const input = schema.parse(body)
    await assertHouseholdMember(session)
    const tx = await transactionService.create(input, session)
    return NextResponse.json(tx, { status: 201 })
  } catch (e: any) {
    const status = e.name === 'ZodError' ? 400
      : e.name === 'ValidationError' ? 422
      : e.name === 'NotFoundError' ? 404
      : 500
    return NextResponse.json({ error: e.message, code: e.name }, { status })
  }
}
```

データアクセス層
Repository パターン
- 単純CRUDは Repository、複合/集計は RPC（SQL関数）へ委譲

ORM設定
- ORMは使用せず Supabase SDK を薄いラッパで利用

トランザクション管理
- 複数テーブル一貫性が必要な操作は RPC（`LANGUAGE plpgsql`）へ移譲して原子性を確保

Repositoryサンプル
```ts
// server/repositories/transactionRepository.ts
import { db } from '@/server/clients/mcpClient'

export class TransactionRepository {
  async insert(household_id: string, input: any, user_id: string) {
    const { data, error } = await db
      .from('transactions')
      .insert({
        ...input,
        household_id,
        created_by: user_id,
        updated_by: user_id,
      })
      .select('*')
      .single()
    if (error) throw error
    return data
  }

  async listByMonth(household_id: string, month: string, kind?: 'income'|'expense') {
    const from = `${month}-01`
    const to = `${month}-31`
    let q = db.from('transactions')
      .select('*')
      .eq('household_id', household_id)
      .gte('occurred_on', from)
      .lte('occurred_on', to)
      .order('occurred_on', { ascending: true })
    if (kind) q = q.eq('kind', kind)
    const { data, error } = await q
    if (error) throw error
    return data
  }
}
```

サブスク当月確定（RPC）
```sql
-- RPC: confirm_subscription_tx
create or replace function public.confirm_subscription_tx(_household uuid, _subscription uuid, _amount int, _occurred_on date, _user uuid)
returns table(id uuid)
language plpgsql security definer as $$
declare
  v_sub record;
begin
  select * into v_sub from subscriptions
    where id=_subscription and household_id=_household;
  if not found then
    raise exception 'subscription not found' using errcode='NO_DATA_FOUND';
  end if;
  insert into transactions(id, household_id, kind, occurred_on, amount, category_id, account_id, memo, created_by, updated_by)
  values (gen_random_uuid(), _household, 'expense', _occurred_on, _amount, v_sub.category_id, v_sub.account_id, v_sub.name, _user, _user)
  returning transactions.id into id;
  return next;
end; $$;
```

エラーハンドリング
- ValidationError: Zodで検出（400/422）
- NotFoundError: household不一致や対象なし（404）
- SystemError: DB/ネットワーク障害（500）

トレーサビリティ
- A1: /auth, /households 系のAPIとHouseholdService
- A2, A5, A6, A7: TransactionService（登録/取得/RPC集計/性能）
- A3: CommentService/ReactionService + NotificationService
- A4: SubscriptionService + confirm_subscription_tx RPC + EdgeFunction
- A8: クライアント下書き（フロント実装）
- A9: RLS（セキュリティ詳細設計参照）

