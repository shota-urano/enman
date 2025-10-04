"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import RequireAuth from "@/components/auth/RequireAuth";
import AppHeader from "@/components/AppHeader";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, MessageCircle, Heart, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { REACTION_PRESETS, REACTION_SUGGESTIONS, MAX_CUSTOM_REACTION_LENGTH, countEmojiUnits } from "@/lib/reactions";
import UserAvatar from "@/components/UserAvatar";
import { DEFAULT_PROFILE_NAME } from "@/lib/profile";

type Notification = {
  id: string;
  type: "subscription_reminder" | "comment" | "reaction";
  payload: Record<string, unknown>;
  read: boolean;
  created_at: string;
};

type DetailTx = {
  id: string;
  date: string;
  amount: number;
  type: "income" | "expense";
  category_id: string;
  account_id: string;
  category_name?: string;
  account_name?: string;
  place?: string;
  memo?: string;
  created_by?: string;
  creator?: {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
  };
};

type CommentItem = {
  id: string;
  transaction_id: string;
  body: string;
  created_by: string;
  created_at: string;
  author: {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
  };
};

type ReactionItem = {
  id: string;
  transaction_id: string;
  emoji: string;
  user_id: string;
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
    <RequireAuth>
      <NotificationsScreen />
    </RequireAuth>
  );
}

function NotificationsScreen() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md rounded-[24px] border border-white/60 bg-white/75 px-6 py-4 text-center text-sm text-muted-foreground shadow-neumorphic-soft">
          読み込み中...
        </div>
      }
    >
      <NotificationsContent />
    </Suspense>
  );
}

function NotificationsContent() {
  const sp = useSearchParams();
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
  const [detailTarget, setDetailTarget] = useState<{ nId: string; txId: string; commentId?: string } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailTx, setDetailTx] = useState<DetailTx | null>(null);
  const [detailComments, setDetailComments] = useState<CommentItem[]>([]);
  const [detailReactions, setDetailReactions] = useState<ReactionItem[]>([]);
  const [detailCommentValue, setDetailCommentValue] = useState("");
  const [detailCommentBusy, setDetailCommentBusy] = useState(false);

  const selectedDate = sp?.get("date"); // YYYY-MM-DD (optional, from calendar)

  const load = async (opts?: { unread?: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const q = opts?.unread ?? onlyUnread ? "?read=false" : "";
      const res = await fetch(`/api/notifications${q}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`通知の取得に失敗しました (status: ${res.status})`);
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
      if (!res.ok) throw new Error('通知の既読更新に失敗しました');
      // Update local state
      setList((prev) => prev.map((x) => (x.id === id ? { ...x, read: true } : x)));
    } catch {
      // ignore for now; could surface toast later
    }
  };

  const closeDetail = () => {
    setDetailTarget(null);
    setDetailLoading(false);
    setDetailError(null);
    setDetailTx(null);
    setDetailComments([]);
    setDetailReactions([]);
    setDetailCommentValue("");
    setDetailCommentBusy(false);
  };

  const refreshDetailReactions = async (txId: string) => {
    try {
      const res = await fetch(`/api/reactions?transaction_id=${txId}`);
      if (res.ok) {
        const json = (await res.json()) as ReactionItem[];
        setDetailReactions(json);
      }
    } catch {
      // ignore gracefully
    }
  };

  const openDetail = async (notification: Notification, txId: string) => {
    const commentId = typeof notification.payload?.["comment_id"] === "string"
      ? String(notification.payload?.["comment_id"])
      : undefined;
    setDetailTarget({ nId: notification.id, txId, commentId });
    setDetailLoading(true);
    setDetailError(null);
    setDetailTx(null);
    setDetailComments([]);
    setDetailReactions([]);
    setDetailCommentValue("");
    setDetailCommentBusy(false);
    if (!notification.read) {
      void markRead(notification.id);
    }
    try {
      const baseRes = await fetch(`/api/transactions/${txId}`, { cache: "no-store" });
      if (!baseRes.ok) throw new Error('取引情報の取得に失敗しました');
      type BaseTx = {
        id: string;
        kind: "income" | "expense";
        occurred_on: string;
        amount: number;
        category_id: string;
        account_id: string;
        created_by: string;
        creator?: {
          user_id: string;
          display_name: string;
          avatar_url: string | null;
        };
        place?: string | null;
        memo?: string | null;
      };
      const base = (await baseRes.json()) as BaseTx;
      let shaped: DetailTx = {
        id: base.id,
        date: base.occurred_on,
        amount: base.amount,
        type: base.kind,
        category_id: base.category_id,
        account_id: base.account_id,
        created_by: base.created_by,
        creator: base.creator,
        place: base.place ?? undefined,
        memo: base.memo ?? undefined,
      };

      const [detailRes, commentsRes, reactionsRes] = await Promise.all([
        fetch(`/api/transactions?date=${encodeURIComponent(base.occurred_on)}`),
        fetch(`/api/comments?transaction_id=${txId}`),
        fetch(`/api/reactions?transaction_id=${txId}`),
      ]);

      if (detailRes.ok) {
        try {
          const list = (await detailRes.json()) as DetailTx[];
          const match = Array.isArray(list) ? list.find((item) => item.id === base.id) : undefined;
          if (match) {
            shaped = { ...shaped, ...match };
          }
        } catch {
          // ignore shaping errors and keep fallback data
        }
      }

      if (commentsRes.ok) {
        try {
          const comments = (await commentsRes.json()) as CommentItem[];
          setDetailComments(Array.isArray(comments) ? comments : []);
        } catch {
          setDetailComments([]);
        }
      } else {
        setDetailComments([]);
      }

      if (reactionsRes.ok) {
        try {
          const reactions = (await reactionsRes.json()) as ReactionItem[];
          setDetailReactions(Array.isArray(reactions) ? reactions : []);
        } catch {
          setDetailReactions([]);
        }
      } else {
        setDetailReactions([]);
      }

      if (!shaped.creator) {
        shaped = {
          ...shaped,
          creator: {
            user_id: shaped.created_by ?? base.created_by,
            display_name: DEFAULT_PROFILE_NAME,
            avatar_url: null,
          },
        };
      }

      setDetailTx(shaped);
    } catch (e: unknown) {
      setDetailError(e instanceof Error ? e.message : '明細の取得に失敗しました');
    } finally {
      setDetailLoading(false);
    }
  };

  const submitDetailComment = async () => {
    if (!detailTarget) return;
    const body = detailCommentValue.trim();
    if (!body) return;
    setDetailCommentBusy(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: detailTarget.txId, body }),
      });
      if (!res.ok) throw new Error('コメントの投稿に失敗しました');
      const created = (await res.json()) as CommentItem;
      setDetailComments((prev) => [...prev, created]);
      setDetailCommentValue('');
      show('コメントを投稿しました', 'success');
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'コメントの投稿に失敗しました', 'error');
    } finally {
      setDetailCommentBusy(false);
    }
  };

  const toggleDetailReaction = async (emoji: string): Promise<boolean> => {
    if (!detailTarget) return false;
    try {
      const res = await fetch('/api/reactions/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: detailTarget.txId, emoji }),
      });
      if (!res.ok) {
        let message = 'リアクション更新に失敗しました';
        try {
          const body = await res.json();
          if (body && typeof body === 'object' && typeof (body as { message?: unknown }).message === 'string') {
            message = (body as { message: string }).message;
          }
        } catch {
          // ignore json parse error
        }
        throw new Error(message);
      }
      await refreshDetailReactions(detailTarget.txId);
      return true;
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'リアクション更新に失敗しました', 'error');
      return false;
    }
  };

  const hasItems = filtered.length > 0;

  return (
    <main className="mx-auto max-w-4xl px-4 pb-28 pt-6 space-y-4 md:px-6">
      <AppHeader title="通知" />

      <div className="space-y-4">
        {error && (
          <div
            role="alert"
            className="flex items-center justify-between rounded-[24px] border border-white/60 bg-gradient-to-br from-[rgba(255,228,232,1)] via-[rgba(255,210,217,0.94)] to-[rgba(242,139,148,0.9)] px-4 py-3 text-sm text-foreground shadow-neumorphic-soft"
          >
            <span>通知の取得に失敗しました。再試行してください。</span>
            <Button
              size="sm"
              className="rounded-full bg-white/75 px-4 text-sm font-semibold text-foreground shadow-neumorphic-soft hover:shadow-neumorphic-hover"
              onClick={() => load()}
            >
              再試行
            </Button>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-full border border-white/60 bg-white/70 p-1 shadow-neumorphic-soft">
            <button
              className={cn(
                "rounded-full px-3 py-1.5 text-sm transition-all",
                onlyUnread
                  ? "bg-gradient-to-br from-white via-[rgba(255,255,255,0.94)] to-[rgba(226,231,242,0.9)] text-foreground shadow-neumorphic-soft"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setOnlyUnread(true)}
              aria-pressed={onlyUnread}
            >
              未読のみ
            </button>
            <button
              className={cn(
                "rounded-full px-3 py-1.5 text-sm transition-all",
                !onlyUnread
                  ? "bg-gradient-to-br from-white via-[rgba(255,255,255,0.94)] to-[rgba(226,231,242,0.9)] text-foreground shadow-neumorphic-soft"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setOnlyUnread(false)}
              aria-pressed={!onlyUnread}
            >
              すべて
            </button>
          </div>

          <Button
            size="sm"
            className="rounded-full bg-gradient-to-br from-[rgba(255,163,179,1)] via-[rgba(255,143,162,0.95)] to-[rgba(255,120,148,0.9)] px-4 text-sm text-white shadow-neumorphic-soft"
            onClick={() => load()}
            disabled={loading}
          >
            更新
          </Button>
        </div>

        <Card>
          <CardBody className="divide-y divide-white/50 p-0">
            {loading ? (
              <ul className="divide-y">
                {Array.from({ length: 6 }).map((_, i) => (
                  <li key={i} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="size-10 rounded-full bg-white/70 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/2 rounded-md bg-white/70 animate-pulse" />
                        <div className="h-3 w-2/3 rounded-md bg-white/70 animate-pulse" />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : hasItems ? (
              <ul>
                {filtered.map((n) => {
                  const meta = kindMeta(n);
                  return (
                    <li
                      key={n.id}
                      className="cursor-pointer px-4 py-3 transition-all hover:bg-white/60 hover:shadow-neumorphic-soft"
                      onClick={async () => {
                        if (confirmBusy) return;
                        // Navigate to detail based on type/payload
                        if (n.type === "comment" || n.type === "reaction") {
                          const txId = String(n.payload?.["transaction_id"] ?? "");
                          if (txId) {
                            await openDetail(n, txId);
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
                            "flex size-10 items-center justify-center rounded-full border border-white/60 shadow-neumorphic-soft",
                            n.read
                              ? "bg-white/70 text-muted-foreground"
                              : "bg-gradient-to-br from-[rgba(255,163,179,1)] via-[rgba(255,143,162,0.95)] to-[rgba(255,120,148,0.9)] text-white",
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
                            <Button
                              size="sm"
                              className="rounded-full bg-white/80 px-4 text-sm text-foreground shadow-neumorphic-soft hover:shadow-neumorphic-hover"
                              onClick={(e) => {
                                e.stopPropagation();
                                void markRead(n.id);
                              }}
                            >
                              既読にする
                            </Button>
                          </div>
                        )}
                        {n.type === "subscription_reminder" && !n.read && (
                          <div className="shrink-0 flex items-center gap-2">
                            <Button
                              size="sm"
                              className="rounded-full bg-white/80 px-4 text-sm text-foreground shadow-neumorphic-soft hover:shadow-neumorphic-hover"
                              onClick={(e) => {
                                e.stopPropagation();
                                void markRead(n.id);
                              }}
                              disabled={confirmBusy}
                            >
                              既読
                            </Button>
                            <Button
                              size="sm"
                              className={
                                processed.has(n.id)
                                  ? "rounded-full bg-muted/70 px-4 text-sm text-muted-foreground shadow-inner"
                                  : "rounded-full bg-gradient-to-br from-[rgba(255,163,179,1)] via-[rgba(255,143,162,0.95)] to-[rgba(255,120,148,0.9)] px-4 text-sm text-white shadow-neumorphic-soft"
                              }
                              disabled={processed.has(n.id) || (confirm?.nId === n.id && confirmBusy)}
                              onClick={(e) => {
                                e.stopPropagation();
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
              <div className="grid place-items-center gap-3 rounded-[32px] border border-white/60 bg-white/75 px-8 py-10 text-center shadow-neumorphic-soft">
                <div className="grid size-12 place-items-center rounded-full bg-white/80 text-muted-foreground shadow-neumorphic-soft">
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
              if (!res.ok) throw new Error('支払いの登録に失敗しました');
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
        <CommentDetailDialog
          open={!!detailTarget}
          onClose={closeDetail}
          loading={detailLoading}
          error={detailError}
          tx={detailTx}
          comments={detailComments}
          reactions={detailReactions}
          commentValue={detailCommentValue}
          onCommentChange={setDetailCommentValue}
          onSubmitComment={submitDetailComment}
          commentBusy={detailCommentBusy}
          onToggleReaction={toggleDetailReaction}
          highlightCommentId={detailTarget?.commentId}
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

function CommentDetailDialog(props: {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  tx: DetailTx | null;
  reactions: ReactionItem[];
  comments: CommentItem[];
  highlightCommentId?: string;
  commentValue: string;
  onCommentChange: (v: string) => void;
  onSubmitComment: () => void;
  commentBusy?: boolean;
  onToggleReaction: (emoji: string) => Promise<boolean>;
}) {
  const { loading, error, tx, reactions, comments, commentValue, commentBusy } = props;
  const reactionSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of reactions ?? []) {
      map.set(r.emoji, (map.get(r.emoji) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([emoji, count]) => ({ emoji, count }));
  }, [reactions]);
  const chipButtonClass =
    "h-8 rounded-full bg-white/80 px-3 text-xs font-medium text-foreground shadow-neumorphic-soft transition-all hover:shadow-neumorphic-hover";
  const canSubmit = commentValue.trim().length > 0 && !commentBusy && !loading;
  const [customEmojiActive, setCustomEmojiActive] = useState(false);
  const [customEmojiValue, setCustomEmojiValue] = useState("");
  const [customEmojiError, setCustomEmojiError] = useState<string | null>(null);
  const [customEmojiBusy, setCustomEmojiBusy] = useState(false);
  const trimmedCustomEmoji = customEmojiValue.trim();
  const canSubmitCustomEmoji = trimmedCustomEmoji.length > 0 && !customEmojiBusy && !loading;
  const presetSet = useMemo(() => new Set<string>(REACTION_PRESETS), []);
  const suggestionOptions = useMemo(
    () => REACTION_SUGGESTIONS.filter((emoji) => !presetSet.has(emoji)),
    [presetSet],
  );

  const creatorName = tx?.creator?.display_name?.trim()
    ? tx.creator.display_name.trim()
    : DEFAULT_PROFILE_NAME;
  const creatorAvatar = tx?.creator?.avatar_url ?? null;

  const closeCustomEmoji = () => {
    setCustomEmojiActive(false);
    setCustomEmojiValue('');
    setCustomEmojiError(null);
    setCustomEmojiBusy(false);
  };

  const submitCustomEmoji = async (valueOverride?: string) => {
    const rawValue = valueOverride ?? customEmojiValue;
    const value = rawValue.trim();
    if (!value) {
      setCustomEmojiError('絵文字を入力してください');
      return;
    }
    if (countEmojiUnits(value) > MAX_CUSTOM_REACTION_LENGTH) {
      setCustomEmojiError(`絵文字は最大${MAX_CUSTOM_REACTION_LENGTH}文字まで入力できます`);
      return;
    }
    setCustomEmojiError(null);
    setCustomEmojiBusy(true);
    let ok = false;
    try {
      ok = await props.onToggleReaction(value);
    } finally {
      setCustomEmojiBusy(false);
    }
    if (ok) {
      closeCustomEmoji();
    } else {
      setCustomEmojiError('リアクションの更新に失敗しました');
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={(o) => !o && props.onClose()}>
      <DialogContent className="max-w-2xl rounded-2xl">
        <DialogHeader className="text-base font-semibold">通知詳細</DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto space-y-3 pr-1">
          {loading && (
            <Card>
              <CardBody className="space-y-2">
                <div className="h-4 w-1/2 rounded-md bg-white/70 animate-pulse" />
                <div className="h-4 w-2/3 rounded-md bg-white/70 animate-pulse" />
                <div className="h-20 rounded-md bg-white/70 animate-pulse" />
              </CardBody>
            </Card>
          )}
          {!loading && error && (
            <div className="rounded-[24px] border border-white/60 bg-gradient-to-br from-[rgba(255,228,232,1)] via-[rgba(255,210,217,0.94)] to-[rgba(242,139,148,0.9)] px-4 py-3 text-sm text-foreground shadow-neumorphic-soft">
              {error}
            </div>
          )}
          {!loading && !error && tx && (
            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <UserAvatar name={creatorName} imageUrl={creatorAvatar} size="sm" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{creatorName}</div>
                  <div className="text-[10px] text-muted-foreground">登録者</div>
                </div>
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{tx.category_name ?? "(未分類)"}</div>
                  <div className="text-xs text-muted-foreground mt-1">日付: {tx.date}</div>
                  {(tx.account_name || tx.place) && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {tx.account_name && <span>支出元: {tx.account_name}</span>}
                      {tx.account_name && tx.place && <span> ・ </span>}
                      {tx.place && <span>場所: {tx.place}</span>}
                    </div>
                  )}
                  {tx.memo && (
                    <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{tx.memo}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="text-sm" style={{ color: tx.type === "expense" ? 'var(--destructive)' : 'var(--success)' }}>
                    {tx.type === "expense" ? "-" : "+"}{tx.amount.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <div className="text-xs text-muted-foreground">リアクション:</div>
                {reactionSummary.length > 0 ? (
                  reactionSummary.map((r) => (
                    <span key={r.emoji} className="text-sm">{r.emoji} {r.count}</span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">なし</span>
                )}
                <div className="ml-auto flex gap-1">
                  {REACTION_PRESETS.map((emoji) => (
                    <Button
                      key={emoji}
                      size="sm"
                      variant="ghost"
                      className={chipButtonClass}
                      disabled={loading || customEmojiBusy}
                      onClick={() => {
                        void props.onToggleReaction(emoji);
                      }}
                    >
                      {emoji}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    className={chipButtonClass}
                    disabled={loading || customEmojiBusy}
                    onClick={() => {
                      if (customEmojiActive) closeCustomEmoji();
                      else {
                        setCustomEmojiActive(true);
                        setCustomEmojiValue('');
                        setCustomEmojiError(null);
                      }
                    }}
                    aria-label="他の絵文字でリアクション"
                  >
                    ＋
                  </Button>
                </div>
              </div>

              {customEmojiActive && (
                <div className="mt-2 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={customEmojiValue}
                      onChange={(e) => {
                        setCustomEmojiValue(e.target.value);
                        if (customEmojiError) setCustomEmojiError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && canSubmitCustomEmoji) {
                          e.preventDefault();
                          void submitCustomEmoji();
                        }
                      }}
                      disabled={customEmojiBusy || loading}
                      placeholder="例: 👇"
                      className="h-9 w-24"
                      inputMode="text"
                    />
                    <Button
                      size="sm"
                      className="px-4"
                      disabled={!canSubmitCustomEmoji}
                      onClick={() => {
                        void submitCustomEmoji();
                      }}
                    >
                      追加
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={customEmojiBusy}
                      onClick={closeCustomEmoji}
                    >
                      キャンセル
                    </Button>
                  </div>
                  {customEmojiError && (
                    <div className="text-xs text-[color:var(--destructive)]">{customEmojiError}</div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {`スマホの絵文字キーボードから好きな絵文字を入力できます（最大${MAX_CUSTOM_REACTION_LENGTH}文字）。`}
                  </div>
                  {suggestionOptions.length > 0 && (
                    <div className="pt-1">
                      <div className="text-xs text-muted-foreground mb-1">おすすめの絵文字</div>
                      <div className="flex flex-wrap gap-1">
                        {suggestionOptions.map((emoji) => (
                          <Button
                            key={emoji}
                            size="sm"
                            variant="ghost"
                            className={chipButtonClass}
                            disabled={customEmojiBusy || loading}
                            onClick={() => {
                              void submitCustomEmoji(emoji);
                            }}
                          >
                            {emoji}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3">
                <div className="text-xs font-medium mb-1">コメント</div>
                <div className="space-y-1.5 max-h-48 overflow-auto">
                  {comments.map((c) => {
                    const highlight = props.highlightCommentId === c.id;
                    const authorName = c.author?.display_name?.trim() ? c.author.display_name.trim() : DEFAULT_PROFILE_NAME;
                    const authorAvatar = c.author?.avatar_url ?? null;
                    return (
                      <div
                        key={c.id}
                        className={cn(
                          "flex items-start gap-2 rounded-md bg-white/80 px-2 py-1",
                          highlight ? "ring-1 ring-[rgba(255,120,148,0.45)]" : ""
                        )}
                      >
                        <UserAvatar name={authorName} imageUrl={authorAvatar} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium truncate">{authorName}</span>
                            <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                          </div>
                          <div className="mt-1 text-xs whitespace-pre-wrap">{c.body}</div>
                        </div>
                      </div>
                    );
                  })}
                  {comments.length === 0 && (
                    <div className="text-xs text-muted-foreground">コメントはありません</div>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    placeholder="コメントを入力..."
                    value={commentValue}
                    onChange={(e) => props.onCommentChange(e.target.value)}
                    disabled={commentBusy || loading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (canSubmit) props.onSubmitComment();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-10 rounded-full bg-gradient-to-br from-[rgba(255,163,179,1)] via-[rgba(255,143,162,0.95)] to-[rgba(255,120,148,0.9)] px-4 text-white shadow-neumorphic-soft"
                    disabled={!canSubmit}
                    onClick={() => props.onSubmitComment()}
                  >
                    投稿
                  </Button>
                </div>
              </div>
            </Card>
          )}
          {!loading && !error && !tx && (
            <div className="rounded-[24px] border border-white/60 bg-white/80 px-4 py-3 text-sm text-muted-foreground shadow-neumorphic-soft">
              取引の詳細を取得できませんでした。
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
