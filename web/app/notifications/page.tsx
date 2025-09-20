"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, MessageCircle, Heart, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type Notification = {
  id: string;
  type: "subscription_reminder" | "comment" | "reaction";
  payload: Record<string, unknown>;
  read: boolean;
  created_at: string;
};

function formatRelative(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s前`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}時間前`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}日前`;
  // Fallback YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function kindMeta(n: Notification) {
  switch (n.type) {
    case "subscription_reminder":
      return { icon: <Bell className="size-5" />, title: "サブスク確認のリマインド" };
    case "comment":
      return { icon: <MessageCircle className="size-5" />, title: "コメントが追加されました" };
    case "reaction":
      return { icon: <Heart className="size-5" />, title: "リアクションがありました" };
    default:
      return { icon: <Bell className="size-5" />, title: "通知" };
  }
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<div className="p-6">読み込み中...</div>}>
      <NotificationsContent />
    </Suspense>
  );
}

function NotificationsContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const { show } = useToast();
  const [onlyUnread, setOnlyUnread] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<Notification[]>([]);
  const [confirm, setConfirm] = useState<{ nId: string; subId: string; amount: number; date?: string } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmChecking, setConfirmChecking] = useState(false);
  const [confirmAlready, setConfirmAlready] = useState(false);
  const [processed, setProcessed] = useState<Set<string>>(() => new Set());

  const selectedDate = sp?.get("date"); // YYYY-MM-DD (optional, from calendar)

  const load = async (opts?: { unread?: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const q = opts?.unread ?? onlyUnread ? "?read=false" : "";
      const res = await fetch(`/api/notifications${q}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`failed: ${res.status}`);
      const data = (await res.json()) as Notification[];
      setList(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyUnread]);

  const filtered = useMemo(() => {
    if (!selectedDate) return list;
    // If date is specified, narrow down by same day in payload if available
    return list.filter((n) => {
      const p = n.payload || {};
      const occurred = typeof p["occurred_on"] === "string" ? (p["occurred_on"] as string) : undefined;
      const day = typeof p["day"] === "string" ? (p["day"] as string) : undefined;
      return occurred === selectedDate || day === selectedDate;
    });
  }, [list, selectedDate]);

  const markRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      if (!res.ok) throw new Error("mark read failed");
      // Update local state
      setList((prev) => prev.map((x) => (x.id === id ? { ...x, read: true } : x)));
    } catch {
      // ignore for now; could surface toast later
    }
  };

  const hasItems = filtered.length > 0;

  return (
    <main className="page-container pb-28">
      <AppHeader title="通知" />

      <div className="mx-auto w-full max-w-[720px] px-4 py-3 space-y-3">
        {error && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm flex items-center justify-between">
            <span>通知の取得に失敗しました。再試行してください。</span>
            <Button size="sm" variant="destructive" onClick={() => load()}>
              再試行
            </Button>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-full border bg-card p-1">
            <button
              className={cn(
                "px-3 py-1.5 text-sm rounded-full",
                onlyUnread ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
              onClick={() => setOnlyUnread(true)}
              aria-pressed={onlyUnread}
            >
              未読のみ
            </button>
            <button
              className={cn(
                "px-3 py-1.5 text-sm rounded-full",
                !onlyUnread ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
              onClick={() => setOnlyUnread(false)}
              aria-pressed={!onlyUnread}
            >
              すべて
            </button>
          </div>

          <Button variant="secondary" size="sm" onClick={() => load()} disabled={loading}>
            更新
          </Button>
        </div>

        <Card>
          <CardBody className="p-0">
            {loading ? (
              <ul className="divide-y">
                {Array.from({ length: 6 }).map((_, i) => (
                  <li key={i} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="size-10 rounded-full bg-gray-200 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/2 bg-gray-200 rounded-md animate-pulse" />
                        <div className="h-3 w-2/3 bg-gray-200 rounded-md animate-pulse" />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : hasItems ? (
              <ul className="divide-y">
                {filtered.map((n) => {
                  const meta = kindMeta(n);
                  return (
                    <li
                      key={n.id}
                      className="p-4 cursor-pointer hover:bg-accent/40"
                      onClick={async () => {
                        if (confirmBusy) return;
                        // Navigate to detail based on type/payload
                        if (n.type === "comment" || n.type === "reaction") {
                          const txId = String(n.payload?.["transaction_id"] ?? "");
                          if (txId) {
                            // Best-effort mark as read, then navigate
                            if (!n.read) {
                              try { await fetch(`/api/notifications/${n.id}/read`, { method: "POST" }); } catch {}
                            }
                            router.push(`/transactions/${txId}`);
                            return;
                          }
                        }
                        if (n.type === "subscription_reminder") {
                          const subId = String(n.payload?.["subscription_id"] ?? "");
                          const amt = Number(n.payload?.["expected_amount"] ?? 0);
                          if (subId && !processed.has(n.id)) {
                            const date = typeof n.payload?.["occurred_on"] === 'string'
                              ? String(n.payload?.["occurred_on"]) : (typeof n.payload?.["day"] === 'string' ? String(n.payload?.["day"]) : undefined)
                            setConfirm({ nId: n.id, subId, amount: Number.isFinite(amt) && amt > 0 ? amt : 0, date });
                            setConfirmBusy(false);
                            if (date) {
                              setConfirmChecking(true);
                              setConfirmAlready(false);
                              fetch(`/api/subscriptions/${subId}/status?date=${encodeURIComponent(date)}`)
                                .then(async (r) => r.ok ? r.json() : Promise.reject())
                                .then((j) => setConfirmAlready(!!j?.confirmed))
                                .catch(() => setConfirmAlready(false))
                                .finally(() => setConfirmChecking(false))
                            }
                          }
                          return;
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "flex size-10 items-center justify-center rounded-full border",
                            n.read ? "bg-background" : "bg-primary/10 border-primary/30",
                          )}
                          aria-hidden
                        >
                          {meta.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={cn("text-sm", n.read ? "text-foreground" : "font-semibold")}>{meta.title}</p>
                            {!n.read && (
                              <span className="inline-block size-2 rounded-full bg-primary" aria-label="未読" />
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground truncate">
                            {n.type === "subscription_reminder" && "サブスクの予定が近づいています。明細を確認してください。"}
                            {n.type === "comment" && "取引にコメントが追加されました。"}
                            {n.type === "reaction" && "取引にリアクションがありました。"}
                          </p>
                          <div className="mt-2 text-xs text-muted-foreground">{formatRelative(n.created_at)}</div>
                        </div>
                        {!n.read && n.type !== "subscription_reminder" && (
                          <div className="shrink-0">
                            <Button size="sm" variant="secondary" onClick={() => markRead(n.id)}>
                              既読にする
                            </Button>
                          </div>
                        )}
                        {n.type === "subscription_reminder" && !n.read && (
                          <div className="shrink-0 flex items-center gap-2">
                            <Button size="sm" variant="secondary" onClick={() => markRead(n.id)} disabled={confirmBusy}>
                              既読
                            </Button>
                            <Button
                              size="sm"
                              disabled={processed.has(n.id) || (confirm?.nId === n.id && confirmBusy)}
                              onClick={() => {
                                const subId = String(n.payload?.["subscription_id"] ?? "");
                                const amt = Number(n.payload?.["expected_amount"] ?? 0);
                                if (subId && !processed.has(n.id)) {
                                  const date = typeof n.payload?.["occurred_on"] === 'string'
                                    ? String(n.payload?.["occurred_on"]) : (typeof n.payload?.["day"] === 'string' ? String(n.payload?.["day"]) : undefined)
                                  setConfirm({ nId: n.id, subId, amount: Number.isFinite(amt) && amt > 0 ? amt : 0, date });
                                  setConfirmBusy(false);
                                  if (date) {
                                    setConfirmChecking(true);
                                    setConfirmAlready(false);
                                    fetch(`/api/subscriptions/${subId}/status?date=${encodeURIComponent(date)}`)
                                      .then(async (r) => r.ok ? r.json() : Promise.reject())
                                      .then((j) => setConfirmAlready(!!j?.confirmed))
                                      .catch(() => setConfirmAlready(false))
                                      .finally(() => setConfirmChecking(false))
                                  }
                                }
                              }}
                            >
                              {processed.has(n.id) ? '済み' : '確認'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-8 grid place-items-center text-center gap-3">
                <div className="size-12 rounded-full bg-gray-100 text-gray-500 grid place-items-center">
                  <Inbox className="size-6" />
                </div>
                <div className="text-sm font-medium">通知はありません</div>
                <div className="text-xs text-muted-foreground">新しいアクティビティがあるとここに表示されます。</div>
              </div>
            )}
          </CardBody>
        </Card>
        <ConfirmDialog
          open={!!confirm}
          amount={confirm?.amount ?? 0}
          setAmount={(n) => confirm && setConfirm({ ...confirm, amount: n })}
          onClose={() => setConfirm(null)}
          busy={confirmBusy || confirmChecking}
          already={confirmAlready}
          onConfirm={async (amount?: number) => {
            if (!confirm) return;
            try {
              setConfirmBusy(true);
              // Double-check status just before confirming
              try {
                const qs = confirm.date ? `?date=${encodeURIComponent(confirm.date)}` : ''
                const st = await fetch(`/api/subscriptions/${confirm.subId}/status${qs}`, { cache: 'no-store' })
                if (st.ok) {
                  const j = await st.json()
                  if (j?.confirmed) {
                    setConfirmAlready(true)
                    show('この月の支払いは既に登録されています', 'info')
                    return
                  }
                }
              } catch {
                // ignore status errors; fall through to attempt confirm
              }
              const res = await fetch(`/api/subscriptions/${confirm.subId}/confirm`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(amount ? { amount } : {}),
              });
              if (!res.ok) throw new Error("confirm failed");
              // Mark notification as read
              try { await fetch(`/api/notifications/${confirm.nId}/read`, { method: "POST" }); } catch {}
              show("支払いを登録しました", "success");
              setProcessed((prev) => new Set(prev).add(confirm.nId));
              setConfirm(null);
              // Refresh list to reflect unread count
              await load();
            } catch {
              show("支払いの登録に失敗しました", "error");
            } finally {
              setConfirmBusy(false);
            }
          }}
        />
      </div>
    </main>
  );
}

function ConfirmDialog(props: {
  open: boolean;
  amount: number;
  onClose: () => void;
  onConfirm: (amount?: number) => void;
  setAmount: (n: number) => void;
  busy?: boolean;
  already?: boolean;
}) {
  return (
    <Dialog open={props.open} onOpenChange={(o) => !o && props.onClose()}>
      <DialogContent className="rounded-xl">
        <DialogHeader className="text-base font-semibold">支払い確認</DialogHeader>
        <div className="p-4 space-y-3">
          {props.already ? (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              この月の支払いは既に登録されています。
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">実際の支払い金額を入力してください（未入力で予定額のまま）。</div>
          )}
          <div className="space-y-1">
            <label className="text-sm">支払い金額</label>
            <div className="relative">
              <Input
                type="number"
                value={Number.isFinite(props.amount) ? props.amount : 0}
                onChange={(e) => props.setAmount(Number(e.target.value || 0))}
                className="pr-10"
                disabled={props.busy || props.already}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">円</span>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={props.onClose} disabled={props.busy}>キャンセル</Button>
            <Button onClick={() => props.onConfirm(Number.isFinite(props.amount) && props.amount > 0 ? props.amount : undefined)} disabled={props.busy || props.already}>
              {props.already ? '登録済み' : (props.busy ? '確認中…' : '支払いを確認')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
