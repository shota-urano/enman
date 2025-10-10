# 思い出マップ機能 仕様書（別テーブル構成版）

## 🎯 目的

- 取引登録フォームに「場所」入力（**名前 or 住所**）と「**思い出マップに登録**」チェックを追加・改善する。  
- 思い出マップ画面に、チェック済みの取引の**場所ピン**をまとめて表示する。  
- 場所情報を別テーブル（`places`）として正規化し、再利用・課金削減・検索性能向上を図る。
- lumabarにボタンを追加する

---

## 💰 重要な課金ポリシー（実装で必ず順守）

- **候補表示**は `Places Autocomplete (New)` を使用。  
  候補の取得は無料、**確定時にだけ** `Place Details (New)` を **1回** 呼ぶ（課金対象）。  
  セッション連携（`sessionToken`）を正しく実装する。  
  *(参考: Google for Developers)*

- **思い出マップ**は `Maps JavaScript API (Dynamic Maps)` を使用。  
  マップ読み込み **1回ごとに課金**されるため、**遅延ロード**と**画面内表示時のみ初期化**を徹底する。  
  *(参考: Google for Developers)*

- **一覧/詳細のサムネ**に `Static Maps` を使う場合は、**画像生成ごとに課金**。  
  必要な画面に限定し、キャッシュヘッダで無駄生成を防ぐ。  
  *(参考: Google for Developers)*

- **2025/03/01以降**は、`SKU` ごとの **無料使用上限（free usage caps）** に基づく。  
  価格表（SKU）に依存するため、金額は出さず、**APIコール数を最小化する設計**を組み込む。  
  *(参考: Google for Developers)*

---

## 🧱 データモデル構成

### 🗺️ `places` テーブル（新規）

| フィールド名 | 型 | 説明 |
|---------------|----|------|
| `place_id` | string (PK) | GoogleのPlace ID（正規化キー） |
| `name` | string | 店舗名・施設名 |
| `formatted_address` | string | 住所表記 |
| `lat` | number | 緯度 |
| `lng` | number | 経度 |
| `source` | string | 由来（例: `"google_places_new"`） |
| `last_verified_at` | datetime | 最終取得日時（再取得制御に使用） |

> 同一 `place_id` は1レコードのみ。  
> `lat` / `lng` に空間インデックスを貼る（PostGIS なら GIST、MySQL なら SPATIAL）。  
> 重複呼び出しを防ぎ、課金削減を実現。

---

### 💰 `transactions` テーブル（既存に追記）

| フィールド名 | 型 | 説明 |
|---------------|----|------|
| `id` | bigint (PK) | 取引ID |
| `type` | enum('income','expense') | 収支種別 |
| `date` | datetime | 取引日 |
| `amount` | decimal | 金額 |
| `category` | string | カテゴリ |
| `place_id` | string (FK → places.place_id) | 関連場所 |
| `memory_flag` | boolean | 「思い出マップに登録」チェック（デフォルト: false） |

> `place_id` に外部キー制約を設定。  
> `memory_flag` は思い出マップ表示制御に使用。  
> 一般の家計簿データは `place_id` 未設定でも動作可能。

---

## 🧭 取引登録フォーム（フロント）

- 「場所」入力欄に `Places Autocomplete (New)` を組み込み。  
  - `fields: ['place_id','geometry','name','formatted_address']` の最小構成。

- `sessionToken` を **入力開始〜確定まで維持**。  
  ユーザーが候補を選択した瞬間に `place_id` と座標を確定し、  
  **1回のみ `Place Details (New)` を呼ぶ（課金）**。  
  候補を眺めるだけでは課金しない。  
  *(参考: Google for Developers)*

- 確定後はフォームに `name` と `formatted_address` を表示（編集可）。

- 「**思い出マップに登録**」チェックボックスを追加（**デフォルトOFF**）。  
  送信時に `memoryFlag` を保存。

---

## 🧩 API（サーバー）

### `POST /api/transactions`
- ボディに `placeId` がある場合の挙動：
  1. **`places` テーブルに `place_id` が存在するか確認**
     - 既存 → 再利用（**Place Details 呼ばない**）
     - 未登録 → **`Place Details (New)` を1回呼ぶ（課金）**
  2. 結果を `places` に `UPSERT`
  3. `transactions` に `place_id` と `memory_flag` を保存  

- すでに同じ `place_id` を持つ場合、編集時は再リクエスト禁止。  
  入力が変わった場合のみ再解決。

---

### `GET /api/memories?from&to&category&bbox`

- 条件：
  - `transactions.memory_flag = true`
  - `transactions.place_id IS NOT NULL`
- JOIN:
  ```sql
  SELECT
    t.id, t.date, t.amount, t.category,
    p.name, p.formatted_address,
    p.lat, p.lng
  FROM transactions t
  JOIN places p ON p.place_id = t.place_id
  WHERE t.memory_flag = TRUE
    AND t.date BETWEEN $1 AND $2
    AND p.lng BETWEEN $3 AND $5
    AND p.lat BETWEEN $4 AND $6;
