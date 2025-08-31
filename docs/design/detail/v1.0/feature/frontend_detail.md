コンポーネント設計
TransactionForm
- Props: 
    ```javascript
    interface TransactionFormProps {
        defaultKind?: 'income' | 'expense';
        defaultDate?: string; // YYYY-MM-DD
        onSaved?: (tx: Transaction) => void;
    }
    ```
- State管理:
    ```javascript
    interface TransactionFormState {
        kind: 'income' | 'expense';
        amount: number | '';
        occurredOn: string; // YYYY-MM-DD
        categoryId: string | null;
        accountId: string | null;
        place?: string;
        memo?: string;
        loading: boolean;
        error: string | null;
    }
    ```
ライフサイクル: 初回マウント時にローカル下書き（localStorage key: `draft:tx`）を復元。各入力変更から500msで自動保存。
レンダリング条件: `loading`時は保存ボタンを無効化、`error`があればフォーム下にアラート表示。

CalendarMonthView
- Props:
    ```javascript
    interface CalendarMonthViewProps {
      month: string; // YYYY-MM
      onSelectDay: (date: string) => void;
    }
    ```
- State管理:
    ```javascript
    interface CalendarMonthState {
      totals: DailyTotal[]; // RPC get_daily_totalsの結果
      loading: boolean;
      error: string | null;
    }
    ```
ライフサイクル: `month`変更時に `/api/reports/daily-totals?month=YYYY-MM` をfetch。
レンダリング条件: ローディング時はセルスケルトン、エラー時は再試行ボタン。

DailyDetailModal
- Props:
    ```javascript
    interface DailyDetailModalProps { date: string; onClose: () => void; }
    ```
- State管理:
    ```javascript
    interface DailyDetailState {
      transactions: Transaction[];
      loading: boolean;
      error: string | null;
    }
    ```
ライフサイクル: `date`受領時に `/api/transactions?date=YYYY-MM-DD` をfetch。
レンダリング条件: 空の場合はエンプティ表示＋[取引を追加] CTA。

SubscriptionList
- Props:
    ```javascript
    interface SubscriptionListProps { onEdit: (sub: Subscription) => void }
    ```
- State管理:
    ```javascript
    interface SubscriptionListState {
      items: Subscription[];
      loading: boolean;
      error: string | null;
    }
    ```
ライフサイクル: マウント時に `/api/subscriptions` をfetch。
レンダリング条件: 通知からの遷移時は直近の対象をハイライト。

状態管理設計
Global State

Store構成: Zustand を採用（軽量/MVP適合）
```ts
// store/index.ts
import { create } from 'zustand'

type AuthState = { user: User | null, householdId: string | null }
type TxState = {
  month: string,
  transactions: Transaction[],
  loadMonth: (m: string) => Promise<void>,
}
type UiState = { toast: { type: 'success'|'error', message: string } | null }

export const useAuth = create<AuthState>(() => ({ user: null, householdId: null }))
export const useTx = create<TxState>((set,get) => ({
  month: '',
  transactions: [],
  async loadMonth(m){
    const res = await fetch(`/api/transactions?month=${m}`)
    const data = await res.json()
    set({ month: m, transactions: data })
  }
}))
export const useUi = create<UiState>(() => ({ toast: null }))
```

Action定義: `loadMonth(m)`, `createTx(input)`, `confirmSubscription(id, amount)` などは slice 内に実装。副作用は API 経由。
Selector定義: `selectDayTotals(date)`, `selectSumByCategory(month)` をメモ化して提供。

ルーティング設計
URL設計

/: ホーム（月カレンダー） - 月切替/日タップで明細表示
/tx/new - 取引登録フォーム
/tx/:id - 明細詳細（モーダル/ページ）
/subs - サブスク一覧/編集
/reports - 月次サマリー
/settings - 設定
/auth, /setup - 認証/初回セットアップ

ガード処理

認証ガード: middlewareで未ログインは`/auth`へ。初回セットアップ未完了時は`/setup`へ遷移。
権限ガード: household_idが未解決/不一致の場合はエラー画面へ（RLSの前段）

画面/コンポーネントのテスタビリティ
- フォーム: Zodスキーマを共有し、`zodResolver`でユニットテスト可能
- ルックアップ: Storeをモックして表示ロジックのスナップショットテスト
- RPC表示: `/api/reports/daily-totals` のモックレスポンスでP95/P99描画を測定

トレーサビリティ
- A2, A5, A6, A7: カレンダー/サマリー/保存の応答性と集計描画
- A3: 明細詳細でコメント/スタンプ、上部トースト
- A4: 通知→確定登録のフロー（通知ハイライト/確定API）
- A8: 下書き自動保存（500ms以内）
- UI要件: トースト上部表示・futuristic-nav設置（既存 UI 詳細設計準拠）

