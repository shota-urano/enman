UIコンポーネント詳細仕様（20250831_v1.0）

デザイントークン/前提
- フレームワーク: React + TypeScript, Tailwind CSS, shadcn/ui, lucide-react, framer-motion
- カラー: --color-primary: #5B8DEF, --color-primary-600: #4B78CB, --color-surface: #FAFAFA, --color-border: #E2E8F0, --color-gray-500: #64748B, --color-error: #EF4444, --color-success: #10B981
- 半径/影: --radius-sm: 6px, --radius-md: 10px, --shadow-sm: 0 1px 2px rgba(0,0,0,0.06), --shadow-md: 0 8px 24px rgba(0,0,0,0.08)
- フォント: 基本 14px/20px, 見出し 16–20px, 日本語Noto Sans系を想定

共通規約
- フォーカス: outline: 2px solid color-mix(in srgb, var(--color-primary) 70%, white), outline-offset: 2px
- 無効状態: opacity: 0.5; cursor: not-allowed; pointer-events: none
- アイコン: lucide-react を24px基準で使用

基本コンポーネント

- ボタン
  - Primary Button
    サイズ: height: 40px, padding: 0 16px
    カラー: background: var(--color-primary); color: #ffffff
    フォント: font-size: 14px; font-weight: 600; letter-spacing: .2px
    ボーダー: border-radius: var(--radius-sm)
    ホバー: background: var(--color-primary-600); transition: background-color .2s ease
    ディセーブル: opacity: .5; cursor: not-allowed
    HTML構造（JSX）:
    <button className="btn btn-primary">保存</button>
    CSS/Tailwind例:
    .btn{ @apply inline-flex items-center justify-center gap-2 whitespace-nowrap select-none; }
    .btn-primary{ @apply h-10 px-4 rounded-md text-white bg-[#5B8DEF] hover:bg-[#4B78CB] disabled:opacity-50 disabled:pointer-events-none shadow-sm; }
    バリエーション: .btn-outline, .btn-ghost, .btn-danger(bg-[#EF4444])

- インプット
  - Text Input
    サイズ: height: 40px; padding: 0 12px
    ボーダー: 1px solid var(--color-border); focus時 border-color: var(--color-primary); ring-2
    フォント: 14px; placeholder: color: #94A3B8
    エラー状態: border-color: var(--color-error)
    HTML構造（JSX）:
    <label className="form-field">
      <span className="form-label">金額</span>
      <input type="text" className="input input-text" placeholder="0" inputMode="numeric" />
      <p className="form-error">必須項目です</p>
    </label>
    CSS/Tailwind例:
    .form-label{@apply mb-1 text-[13px] text-gray-600;}
    .input{ @apply w-full h-10 px-3 rounded-md border border-[#E2E8F0] bg-white text-gray-900 placeholder:text-gray-400; }
    .input:focus{ @apply outline-none ring-2 ring-[#5B8DEF] border-[#5B8DEF]; }
    .form-error{@apply mt-1 text-[12px] text-[#EF4444];}

  - Select（カテゴリ等）
    仕様: shadcn/ui Select を使用。高さ40px、メニュー最大高さ 300px、検索なし
    HTML構造（概念）:
    <Select>
      <SelectTrigger className="h-10" />
      <SelectContent className="max-h-[300px]" />
    </Select>

  - Date Picker
    仕様: 日付入力は日次・月次で Calendar コンポーネントを使用
    構造:
    <Popover>
      <PopoverTrigger asChild>
        <button className="btn btn-outline h-10">2025-08-31</button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Calendar mode="single" />
      </PopoverContent>
    </Popover>

  - トグル/スイッチ
    仕様: 高さ20px、つまみ16px、アニメーション .2s ease-in-out

  - トースト（通知）
    仕様: 画面上部からスライドダウン。role="status"。自動消失2.5s、フォーカス時は停止
    構造:
    <ToastProvider>
      <ToastViewport className="fixed top-4 inset-x-0 mx-auto w-full max-w-sm" />
    </ToastProvider>

複合コンポーネント

- ナビゲーション（フッタ固定 LumaBar）
  依存: framer-motion, lucide-react
  役割: Home / Search(将来) / Alerts / Profile / Saved(将来) / Settings
  HTML構造（JSX）:
  <nav className="luma-bar" aria-label="メインナビゲーション">
    <LumaBar />
  </nav>
  スタイル要件:
  .luma-bar{ @apply fixed bottom-6 left-1/2 -translate-x-1/2 z-50; }
  内部ボタンは 56px 円形タップ領域（w-14 h-14）

- カード
  用途: 月サマリー、リストの枠
  構造:
  <div className="card">
    <div className="card-header">今月のサマリー</div>
    <div className="card-body">・・・</div>
  </div>
  CSS/Tailwind例:
  .card{@apply rounded-lg border border-[#E2E8F0] bg-white shadow-sm;}
  .card-header{@apply p-4 text-[13px] text-gray-600 border-b;}
  .card-body{@apply p-4;}

- モーダル（明細詳細）
  仕様: shadcn/ui Dialog 準拠。幅: 360–420px（モバイルは全幅 Sheet でも可）
  構造:
  <Dialog>
    <DialogTrigger asChild><button className="btn btn-outline">詳細</button></DialogTrigger>
    <DialogContent className="rounded-xl p-0">
      <DialogHeader className="p-4">明細</DialogHeader>
      <div className="p-4">…</div>
    </DialogContent>
  </Dialog>

- フォーム（取引登録）
  3タップ目標。フィールド: 種別(セグメント), 金額(数値), 日付, カテゴリ, アカウント, （支出のみ）場所, メモ
  構造例:
  <form className="space-y-4" aria-label="取引登録フォーム">
    <SegmentedControl className="h-10" items={["支出","収入"]} />
    <div className="grid grid-cols-2 gap-3">
      <input className="input input-text" placeholder="金額" inputMode="numeric" />
      <DatePicker />
    </div>
    <Select name="category" />
    <Select name="account" />
    <input className="input input-text" placeholder="場所（任意）" />
    <textarea className="input h-24 p-3" placeholder="メモ（任意）" />
    <button className="btn btn-primary w-full">保存</button>
  </form>

補助コンポーネント
- バッジ: 高さ 24px, 角丸 md, 色バリエーション（カテゴリ）
- スケルトン: @apply animate-pulse bg-gray-200 rounded-md
- タグ: 丸角 12px, 内側にアイコン可

状態/バリアント規約
- data-[state=open], aria-pressed, aria-current を活用。無効/読み込み中は .is-loading（スピナー16px）
- エンプティ: アイコン+説明文+主要CTA（btn-primary）を中央寄せ

