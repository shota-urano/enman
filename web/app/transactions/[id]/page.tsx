"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import RequireAuth from "@/components/auth/RequireAuth";
import AppHeader from "@/components/AppHeader";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";

type Tx = {
  id: string;
  kind: "income" | "expense";
  occurred_on: string;
  amount: number;
  category_id: string;
  account_id: string;
  place?: string | null;
  place_id?: string | null;
  memory_flag?: boolean;
  place_name?: string | null;
  place_formatted_address?: string | null;
  memo?: string | null;
  created_by: string;
  creator?: {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
  };
};

export default function TransactionDetailPage() {
  return (
    <RequireAuth>
      <TransactionDetailScreen />
    </RequireAuth>
  );
}

function TransactionDetailScreen() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [tx, setTx] = useState<Tx | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!params?.id) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/transactions/${params.id}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`取引の取得に失敗しました (status: ${res.status})`);
        const data = (await res.json()) as Tx;
        setTx(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params?.id]);

  const title = tx
    ? `${tx.kind === "expense" ? "支出" : "収入"} ¥${tx.amount.toLocaleString()}`
    : "明細";
  const creatorName = tx?.creator?.display_name?.trim() ? tx.creator.display_name : "ななし";

  return (
    <main className="page-container pb-28">
      <AppHeader
        title={title}
        left={
          <Button variant="ghost" className="h-9 px-3" onClick={() => router.back()}>
            戻る
          </Button>
        }
      />

      <div className="mx-auto w-full max-w-[720px] px-4 py-3 space-y-3">
        {loading && (
          <Card>
            <CardBody>
              <div className="space-y-2">
                <div className="h-5 w-1/3 bg-gray-200 rounded-md animate-pulse" />
                <div className="h-4 w-1/2 bg-gray-200 rounded-md animate-pulse" />
                <div className="h-4 w-2/3 bg-gray-200 rounded-md animate-pulse" />
              </div>
            </CardBody>
          </Card>
        )}
        {error && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
            明細の取得に失敗しました。
          </div>
        )}
        {!loading && !error && tx && (
          <Card>
            <CardBody className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-3">
                <UserAvatar name={creatorName} imageUrl={tx.creator?.avatar_url ?? null} size="md" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{creatorName}</div>
                  <div className="text-xs text-muted-foreground">登録者</div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">日付</div>
              <div className="text-base">{tx.occurred_on}</div>

              <div className="text-sm text-muted-foreground">金額</div>
              <div className={`text-xl font-semibold ${tx.kind === "expense" ? "text-red-600" : "text-emerald-600"}`}>
                {tx.kind === "expense" ? "-" : "+"}
                {tx.amount.toLocaleString()}
              </div>

              <div className="text-sm text-muted-foreground">カテゴリID</div>
              <div className="text-base">{tx.category_id}</div>

              <div className="text-sm text-muted-foreground">アカウントID</div>
              <div className="text-base">{tx.account_id}</div>

              {(tx.place || tx.place_formatted_address) && (
                <>
                  <div className="text-sm text-muted-foreground">場所</div>
                  <div className="text-base font-medium">{tx.place ?? tx.place_name ?? "名称未設定"}</div>
                  {tx.place_formatted_address && (
                    <div className="text-xs text-muted-foreground mt-1">{tx.place_formatted_address}</div>
                  )}
                  {tx.memory_flag && (
                    <div className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                      思い出マップ登録済み
                    </div>
                  )}
                </>
              )}

              {tx.memo && (
                <>
                  <div className="text-sm text-muted-foreground">メモ</div>
                  <div className="text-base whitespace-pre-wrap">{tx.memo}</div>
                </>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </main>
  );
}

