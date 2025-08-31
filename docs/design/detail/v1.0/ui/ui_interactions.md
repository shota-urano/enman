インタラクション詳細設計（20250831_v1.0）

マウス/ポインタ操作
- クリック
  - ボタン（.btn, .btn-primary）: onClickで即時フィードバック（スピナー .is-loading）。成功: 上部トースト2.5s
  - カレンダー日セル: シングルクリックで日別明細（Dialog or Sheet）を開く
  - 行（サブスク/リスト）: クリックで編集モーダル
- ダブルクリック
  - 対応: デスクトップのみ表形式セルで編集開始（後方互換）。モバイルは非対応
- 右クリック
  - 非対応（ブラウザ標準）。必要に応じて行アクションは「…」メニューで提供

ホバー操作（デスクトップ）
- ボタン: 色を10–15%暗く。shadow-sm→md（transition .2s）
- リンク: underline-offset-2, text-primary hover:underline
- カード: shadow-sm→shadow-md, translateY(-1px)
- LumaBarアイコン: whileHover={{ scale: 1.2 }}（framer-motion）

キーボード操作
- ショートカット
  - Ctrl+S / Cmd+S: フォーム送信（preventDefault, バリデーション後保存）
  - Ctrl+Z / Cmd+Z: 直前の入力を1手戻す（対応可能範囲で）
  - Esc: モーダル/ポップオーバーを閉じる
  - Enter: 主要アクション（フォーカスがテキストの場合は改行でなく送信にバインドしない）
- フォーカス管理
  - Tab順序: ヘッダー→メイン内フォーム要素→フッタナビ→隠し要素の順
  - フォーカス表示: outline 2px（primary）, outline-offset 2px。LumaBarアイコンは:focus-visibleでリング
  - トースト: role="status"、フォーカス移動は行わない（操作不要のため）

タッチ操作（モバイル）
- ジェスチャー
  - スワイプ（リスト行）: 左へスワイプで削除/編集アクション表示（距離40px以上で確定）
  - ピンチ: グラフでズーム（将来対応）。現時点では非対応
  - ロングタップ: コンテキストアクションを表示（3点メニューと同等）
- タップ領域
  - 主要アイコン/ボタン: 最低 44×44pt（LumaBarは 56×56）

アニメーション/トランジション
- duration: 0.2s, 0.3s, 0.5s を使い分け
- easing: ease-in-out 基本、UI基幹移動は cubic-bezier(0.22, 1, 0.36, 1)（エモーショナル）
- 対象プロパティ: opacity, transform, color, box-shadow
- コンポーネント別
  - モーダル: opacity 0→1, translateY(8→0) 0.2s
  - ポップオーバー: scale 0.98→1, opacity 0→1 0.15s
  - トースト: top -16→top 16, opacity 0→1 0.25s（入場）。逆で退場
  - LumaBar: active-indicator を framer-motion の spring で移動（stiffness: 500, damping: 30）

押下/読み込み状態
- .is-loading を付与し内部にスピナー(16px)。ボタン幅は固定しレイアウトジャンプ回避

エラーハンドリング
- 送信失敗時: トースト variant=destructive + エラーフィールドにスクロール＆フォーカス
- ネットワーク失敗: 再試行ボタン、指数バックオフ 0.5/1/2s（設計）

