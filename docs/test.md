1. 取引登録でアカウントの選択内容が表示されない
2. 取引登録画面で以下のエラーが発生する
{
    "code": "SYSTEM_ERROR",
    "message": "[object Object]"
}
↓
次は以下のエラーが発生する
{
    "code": "SYSTEM_ERROR",
    "message": "null value in column \"created_by\" of relation \"transactions\" violates not-null constraint",
    "details": {
        "code": "23502",
        "details": "Failing row contains (28f9f5cf-4ca8-445a-8677-58a91d108a84, f5ea04c5-12b2-4975-aef4-19e2b430c5d1, expense, 2025-09-12, 1200, c8abf238-e4b4-41ff-aa77-b05a6e04c4c1, 5a5974ed-f0a6-40cf-bed4-a7ebde176139, test, test, null, null, 2025-09-12 01:26:43.812593+00, 2025-09-12 01:26:43.812593+00).",
        "hint": null,
        "message": "null value in column \"created_by\" of relation \"transactions\" violates not-null constraint"
    }
}
3. 以下で500エラーが発生している
http://localhost:3000/api/reports/daily-totals?month=2025-09
{
    "code": "SYSTEM_ERROR",
    "message": "unauthenticated",
    "details": {
        "code": "28000",
        "details": null,
        "hint": null,
        "message": "unauthenticated"
    }
}
↓
次は以下のエラーが発生しております。
{
    "code": "SYSTEM_ERROR",
    "message": "invalid input syntax for type date: \"2025-09\"",
    "details": {
        "code": "22007",
        "details": null,
        "hint": null,
        "message": "invalid input syntax for type date: \"2025-09\""
    }
}
4. カレンダー画面
    - 登録したデータがあるのに、カレンダーで支出や収入の数値が表示されていない。
5. 明細モーダル
    - 支出を登録したのに「+」になっている
    - 支出を登録したのに未分類になっている
    - 支出元や、場所などの登録した時の詳細情報がない 

## 新規機能
- アカウントに名前とアイコンを設定できるようにする
設定からアカウント設定にて、名前とアイコンをを設定できるようにする
パスワードの再設定もここから設定できるようにする
設定なしの場合は、"ななし"と出す
- 設定のメンバー承認
現在はIDが表示されているが、名前を表示する
- 明細
各明細の上部にアイコンと名前を表示する
- 初期登録時
名前とアイコンを設定できるようにする
※名前に関しては必須にする
- 既存ユーザへのアプローチ
まだ名前が未設定の場合は、ログイン時にversionがアップしたことと、待望の機能が追加されましたみたいな形で祝福された感じでメッセージを表示した上で、設定方法を記載の上、設定ページに飛ばす形でお願いします