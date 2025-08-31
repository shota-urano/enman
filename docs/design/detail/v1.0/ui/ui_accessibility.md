アクセシビリティ詳細仕様（20250831_v1.0）

原則
- WCAG 2.2 AA 目標。色コントラスト 4.5:1 以上（本文）、3:1 以上（大きな文字/アイコン）
- キーボード完全操作可能（Tab/Shift+Tab/Esc/Enter/Space）
- SR（スクリーンリーダー）に意味が伝わるロール/ラベルを付与

フォーカス/キーボード
- フォーカスリング: outline 2px var(--color-primary), offset 2px（:focus-visible）
- フォーカストラップ: Dialog/Popover/Sheet内で循環。Escで閉じる
- Tab順序: 視覚順に一致（ヘッダ→メイン→フッタ）。装飾リンクはtabindex="-1"

ロール/ARIA
- トースト: role="status" aria-live="polite"
- ナビ（LumaBar）: <nav aria-label="メインナビゲーション">、現在地は aria-current="page"
- アイコンボタン: aria-label を必須（例: aria-label="保存"）
- エラーメッセージ: role="alert"、関連inputに aria-describedby で紐付け

フォーム
- ラベル: <label for> と input id を対応。プレースホルダは説明の代替にしない
- 必須: aria-required="true"、視覚的に「必須」表示
- エラー: フィールド直下に文章で説明、色だけに依存しない
- 数値入力: inputMode="numeric"、pattern="[0-9]*"（IME対策）

見出し/ランドマーク
- h1: 画面タイトル、h2: セクション。ランドマーク main/nav/header/footer を適切に使用

アニメーション/動き
- prefers-reduced-motion 対応: 0.2s以下の短縮 or 無効化。LumaBar のアニメもspring→duration短縮

カラー/コントラスト
- プライマリ #5B8DEF 上の白文字は十分なコントラスト（AA）
- エラー #EF4444、成功 #10B981 も白文字でAAを満たすこと
- 薄い灰色テキスト (#94A3B8) は本文に使用しない（補助に限定）

トースト/通知
- role="status"、フォーカス移動なし。スクリーンリーダーが読み上げ完了できるよう最低2.5s表示

リスト/テーブル
- テーブルヘッダ <th scope="col">、行見出しがある場合は scope="row"
- 行の選択は aria-selected を利用

国際化/言語
- <html lang="ja"> を前提に文言は簡潔な日本語。数字/通貨の地域表記（¥, カンマ区切り）

