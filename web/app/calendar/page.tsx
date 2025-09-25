"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import AppHeader from "@/components/AppHeader";
import TransactionEditDialog from "@/components/TransactionEditDialog";
import ConfirmDialog from "@/components/ConfirmDialog";

type DailyTotalsItem = {
  date: string; // YYYY-MM-DD
  income_total: number;
  expense_total: number;
  net_total: number;
};

type PendingConfirmItem = {
  day: string; // YYYY-MM-DD
  pending_count: number;
};

type PendingConfirmDetailItem = {
  id: string;
  name: string;
  expected_amount: number;
  billing_day: number;
  occurred_on: string;
};

type TxItem = {
  id: string;
  date: string;
  amount: number;
  type: "income" | "expense";
  category_id?: string;
  account_id?: string;
  category_name?: string;
  account_name?: string;
  place?: string;
  memo?: string;
};

type CommentItem = {
  id: string;
  transaction_id: string;
  body: string;
  created_by: string;
  created_at: string;
};

type ReactionItem = {
  id: string;
  transaction_id: string;
  emoji: string;
  user_id: string;
  created_at: string;
};

function formatMonthKey(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  return `${y}-${m}`;
}

function getCalendarMatrix(base: Date) {
  const year = base.getFullYear();
  const month = base.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0:Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  // leading nulls
  for (let i = 0; i < startDay; i++) cells.push(null);
  // actual days
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  // trailing to fill 6x7 grid
  while (cells.length % 7 !== 0) cells.push(null);
  if (cells.length < 42) {
    while (cells.length < 42) cells.push(null);
  }
  // chunk into weeks
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export default function CalendarPage() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [data, setData] = useState<DailyTotalsItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingConfirmItem[] | null>(null);

  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [txList, setTxList] = useState<TxItem[] | null>(null);
  const [pendingList, setPendingList] = useState<PendingConfirmDetailItem[] | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, CommentItem[]>>({});
  const [reactionsMap, setReactionsMap] = useState<Record<string, ReactionItem[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingTx, setEditingTx] = useState<TxItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TxItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const monthKey = useMemo(() => formatMonthKey(currentMonth), [currentMonth]);

  useEffect(() => {
    let aborted = false;
    setLoading(true);
    setError(null);
    setData(null);
    const totalsPromise = fetch(`/api/reports/daily-totals?month=${monthKey}`)
      .then(async (r) => {
        if (!r.ok) throw await r.json();
        return r.json();
      })
      .then((json) => {
        if (aborted) return;
        const rows: unknown[] = Array.isArray(json) ? json : [];
        const normalized: DailyTotalsItem[] = rows
          .map((it: unknown) => {
            const o = (it ?? {}) as Record<string, unknown>;
            const date =
              typeof o.date === "string"
                ? o.date
                : typeof o.day === "string"
                  ? o.day
                  : undefined;
            const income =
              typeof o.income_total === "number"
                ? (o.income_total as number)
                : typeof o.income === "number"
                  ? (o.income as number)
                  : 0;
            const expense =
              typeof o.expense_total === "number"
                ? (o.expense_total as number)
                : typeof o.expense === "number"
                  ? (o.expense as number)
                  : 0;
            const net = typeof o.net_total === "number" ? (o.net_total as number) : income - expense;
            if (!date) return null;
            return { date, income_total: income, expense_total: expense, net_total: net } satisfies DailyTotalsItem;
          })
          .filter((v): v is DailyTotalsItem => !!v);
        setData(normalized);
      })
      .catch((e) => {
        if (aborted) return;
        const msg = typeof e?.message === "string" ? e.message : "データ取得に失敗しました";
        setError(msg);
      });

    const pendingPromise = fetch(`/api/reports/pending-confirms?month=${monthKey}`)
      .then(async (r) => {
        if (!r.ok) throw await r.json();
        return r.json();
      })
      .then((json) => {
        if (aborted) return;
        const rows: unknown[] = Array.isArray(json) ? json : [];
        const normalized: PendingConfirmItem[] = rows
          .map((it: unknown) => {
            const o = (it ?? {}) as Record<string, unknown>;
            const day = typeof o.day === "string" ? o.day : undefined;
            const pending_count = typeof o.pending_count === "number" ? o.pending_count : Number(o.pending_count ?? 0);
            if (!day) return null;
            return { day, pending_count } satisfies PendingConfirmItem;
          })
          .filter((v): v is PendingConfirmItem => !!v);
        setPending(normalized);
      })
      .catch(() => {
        if (aborted) return;
        // pendingは非致命、無視
        setPending([]);
      });

    Promise.allSettled([totalsPromise, pendingPromise])
      .finally(() => {
        if (!aborted) setLoading(false);
      });
    return () => {
      aborted = true;
    };
  }, [monthKey, refreshKey]);

  const totalsByDate = useMemo(() => {
    const map = new Map<string, DailyTotalsItem>();
    (data ?? []).forEach((it) => map.set(it.date, it));
    return map;
  }, [data]);

  const pendingByDate = useMemo(() => {
    const map = new Map<string, number>();
    (pending ?? []).forEach((it) => map.set(it.day, it.pending_count));
    return map;
  }, [pending]);

  const weeks = useMemo(() => getCalendarMatrix(currentMonth), [currentMonth]);

  // 月の合計データを計算
  const monthlySummary = useMemo(() => {
    if (!data) return { totalIncome: 0, totalExpense: 0, netTotal: 0 };
    
    const totalIncome = data.reduce((sum, item) => sum + item.income_total, 0);
    const totalExpense = data.reduce((sum, item) => sum + item.expense_total, 0);
    const netTotal = totalIncome - totalExpense;
    
    return { totalIncome, totalExpense, netTotal };
  }, [data]);

  function prevMonth() {
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function nextMonth() {
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  const openDetail = useCallback((dateStr: string) => {
    setDetailDate(dateStr);
    setTxLoading(true);
    setTxError(null);
    setTxList(null);
    setPendingList(null);
    setCommentsMap({});
    setReactionsMap({});
    const txPromise = fetch(`/api/transactions?date=${dateStr}`)
      .then(async (r) => {
        if (!r.ok) throw await r.json();
        return r.json();
      })
      .then(async (json) => {
        const list = json as TxItem[];
        setTxList(list);
        // Fetch comments and reactions per transaction (simple fan-out)
        await Promise.all(
          list.map(async (tx) => {
            try {
              const [cRes, rRes] = await Promise.all([
                fetch(`/api/comments?transaction_id=${tx.id}`),
                fetch(`/api/reactions?transaction_id=${tx.id}`),
              ]);
              const cJson = cRes.ok ? await cRes.json() : [];
              const rJson = rRes.ok ? await rRes.json() : [];
              setCommentsMap((m) => ({ ...m, [tx.id]: cJson as CommentItem[] }));
              setReactionsMap((m) => ({ ...m, [tx.id]: rJson as ReactionItem[] }));
            } catch {
              // ignore per-tx fetch errors; UI remains without extras
            }
          })
        );
      })
      .catch((e) => {
        const msg = typeof e?.message === "string" ? e.message : "明細取得に失敗しました";
        setTxError(msg);
      });

    const pendingPromise = fetch(`/api/reports/pending-confirms/day?date=${dateStr}`)
      .then(async (r) => (r.ok ? r.json() : []))
      .then((json) => {
        setPendingList(Array.isArray(json) ? (json as PendingConfirmDetailItem[]) : []);
      })
      .catch(() => setPendingList([]));

    Promise.allSettled([txPromise, pendingPromise]).finally(() => setTxLoading(false));
  }, []);

  const refreshAfterMutation = useCallback(() => {
    setRefreshKey((k) => k + 1);
    if (detailDate) {
      openDetail(detailDate);
    }
  }, [detailDate, openDetail]);

  async function addComment(txId: string) {
    const body = (commentInputs[txId] ?? "").trim();
    if (!body) return;
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: txId, body }),
      });
      if (!res.ok) throw await res.json();
      const created = (await res.json()) as CommentItem;
      setCommentsMap((m) => ({ ...m, [txId]: [...(m[txId] ?? []), created] }));
      setCommentInputs((ci) => ({ ...ci, [txId]: '' }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'コメント追加に失敗しました';
      alert(msg);
    }
  }

  async function deleteComment(txId: string, commentId: string) {
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw await res.json();
      setCommentsMap((m) => ({ ...m, [txId]: (m[txId] ?? []).filter((c) => c.id !== commentId) }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'コメント削除に失敗しました';
      alert(msg);
    }
  }

  const performDelete = useCallback(async (tx: TxItem) => {
    try {
      const res = await fetch(`/api/transactions/${tx.id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const payload: unknown = await res.json().catch(() => null);
        let message = '取引の削除に失敗しました';
        if (payload && typeof payload === 'object' && 'message' in payload) {
          const m = (payload as { message?: unknown }).message;
          if (typeof m === 'string') message = m;
        }
        throw new Error(message);
      }
      setTxList((list) => (list ?? []).filter((item) => item.id !== tx.id));
      setCommentsMap((map) => {
        const next = { ...map };
        delete next[tx.id];
        return next;
      });
      setReactionsMap((map) => {
        const next = { ...map };
        delete next[tx.id];
        return next;
      });
      refreshAfterMutation();
      setDeleteTarget(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '取引の削除に失敗しました';
      alert(msg);
    }
  }, [refreshAfterMutation]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await performDelete(deleteTarget);
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, performDelete]);

  function groupReactions(list: ReactionItem[]) {
    const map = new Map<string, number>();
    for (const r of list) map.set(r.emoji, (map.get(r.emoji) ?? 0) + 1);
    return Array.from(map.entries()).map(([emoji, count]) => ({ emoji, count }));
  }

  async function toggleReaction(txId: string, emoji: string) {
    try {
      const res = await fetch('/api/reactions/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: txId, emoji }),
      });
      if (!res.ok) throw await res.json();
      // Refresh list after toggle
      const listRes = await fetch(`/api/reactions?transaction_id=${txId}`);
      if (listRes.ok) {
        const rJson = (await listRes.json()) as ReactionItem[];
        setReactionsMap((m) => ({ ...m, [txId]: rJson }));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'リアクション更新に失敗しました';
      alert(msg);
    }
  }

  const monthTitle = `${currentMonth.getFullYear()}年 ${currentMonth.getMonth() + 1}月`;
  const deleteDescription = useMemo(() => {
    if (!deleteTarget) return undefined;
    const label = deleteTarget.type === 'expense' ? '支出' : '収入';
    return `${deleteTarget.date} の${label} ¥${deleteTarget.amount.toLocaleString()}を削除します。この操作は取り消せません。`;
  }, [deleteTarget]);

  const navButtonClass =
    "h-10 w-10 rounded-full p-0 text-base font-semibold shadow-neumorphic-soft hover:shadow-neumorphic-hover";
  const chipButtonClass =
    "h-8 rounded-full bg-white/80 px-3 text-xs font-medium text-foreground shadow-neumorphic-soft transition-all hover:shadow-neumorphic-hover";

  return (
    <div>
      <AppHeader
        title={monthTitle}
        left={
          <Button aria-label="前の月" className={navButtonClass} onClick={prevMonth}>
            <span className="text-lg leading-none">&lt;</span>
          </Button>
        }
        right={
          <Button aria-label="次の月" className={navButtonClass} onClick={nextMonth}>
            <span className="text-lg leading-none">&gt;</span>
          </Button>
        }
      />
      <main className="mx-auto min-h-[calc(100dvh-140px)] max-w-5xl px-4 pb-28 pt-4 md:px-8">

      {loading && (
        <div className="rounded-[28px] border border-white/50 bg-white/80 px-5 py-4 text-sm text-muted-foreground shadow-neumorphic-soft">
          読み込み中...
        </div>
      )}
      {error && (
        <div className="rounded-[28px] border border-white/50 bg-gradient-to-br from-[rgba(255,228,232,1)] via-[rgba(255,210,217,0.94)] to-[rgba(242,139,148,0.9)] px-5 py-4 text-sm text-foreground shadow-neumorphic-soft">
          {error}
        </div>
      )}
      {!loading && !error && (
        <div>
          {/* 月間サマリー */}
          <div className="mb-6 rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-neumorphic">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">残高</span>
                <span
                  className="text-2xl font-semibold sm:text-3xl"
                  style={{ color: monthlySummary.netTotal >= 0 ? 'var(--success)' : 'var(--destructive)' }}
                >
                  {monthlySummary.netTotal >= 0 ? '+' : ''}
                  {monthlySummary.netTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">収入</span>
                <span className="text-2xl font-semibold text-[color:var(--success)] sm:text-3xl">
                  +{monthlySummary.totalIncome.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">支出</span>
                <span className="text-2xl font-semibold text-[color:var(--destructive)] sm:text-3xl">
                  -{monthlySummary.totalExpense.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs text-muted-foreground">
            {["日","月","火","水","木","金","土"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-3 rounded-[36px] border border-white/60 bg-white/85 p-6 shadow-neumorphic">
            {weeks.flat().map((cell, idx) => {
              if (!cell) return <div key={idx} className="h-16 sm:h-20"/>;
              const yyyy = cell.getFullYear();
              const mm = `${cell.getMonth() + 1}`.padStart(2, "0");
              const dd = `${cell.getDate()}`.padStart(2, "0");
              const key = `${yyyy}-${mm}-${dd}`;
              const t = totalsByDate.get(key);
              const hasData = !!t && (t.income_total > 0 || t.expense_total > 0);
              const isToday = new Date().toDateString() === cell.toDateString();
              const pendingCount = pendingByDate.get(key) ?? 0;
              
              const canInteract = hasData || pendingCount > 0;
              const dayContent = isToday || canInteract
                ? (
                    <span
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-[26px] text-sm font-semibold transition-all duration-200 sm:h-14 sm:w-14 sm:text-base",
                        isToday
                          ? "bg-gradient-to-br from-[rgba(255,163,179,1)] via-[rgba(255,143,162,0.95)] to-[rgba(255,120,148,0.9)] text-white shadow-neumorphic-hover"
                          : hasData
                            ? "bg-white/85 text-foreground shadow-neumorphic-soft hover:shadow-neumorphic-hover"
                            : "bg-white/70 text-muted-foreground shadow-neumorphic-soft hover:shadow-neumorphic-hover",
                      )}
                    >
                      {cell.getDate()}
                    </span>
                  )
                : (
                    <span className="text-xs font-medium text-muted-foreground sm:text-sm">
                      {cell.getDate()}
                    </span>
                  );

              const Wrapper: React.ElementType = canInteract || isToday ? "button" : "div";

              return (
                <Wrapper
                  key={idx}
                  type={Wrapper === "button" ? "button" : undefined}
                  disabled={Wrapper === "button" && !canInteract ? true : undefined}
                  className={cn(
                    "relative flex h-20 flex-col items-center justify-start rounded-[30px] border border-transparent p-2 transition-all duration-200 sm:h-24",
                    canInteract || isToday
                      ? "cursor-pointer hover:border-white/60 hover:bg-white/60 hover:shadow-neumorphic-soft"
                      : "cursor-default border-none",
                  )}
                  onClick={Wrapper === "button" ? () => {
                    if (!canInteract) return;
                    if (hasData) openDetail(key);
                    else router.push(`/notifications?date=${key}`);
                  } : undefined}
                >
                  {dayContent}

                  {pendingCount > 0 && (
                    <span className="absolute right-3 top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-[rgba(255,163,179,1)] to-[rgba(255,120,148,0.9)] px-2 text-[10px] font-semibold text-white shadow-neumorphic-soft">
                      {pendingCount}
                    </span>
                  )}

                  {hasData && (
                    <div className="mt-2 text-[10px] font-medium text-center sm:text-xs" style={{ color: (t?.net_total ?? 0) >= 0 ? 'var(--success)' : 'var(--destructive)' }}>
                      {(t?.net_total ?? 0) >= 0 ? '+' : ''}{(t?.net_total ?? 0).toLocaleString()}
                    </div>
                  )}
                </Wrapper>
              );
            })}
          </div>
          {(!data || data.length === 0) && (
            <div className="mt-4 rounded-[28px] border border-white/50 bg-white/80 px-5 py-4 text-sm text-muted-foreground shadow-neumorphic-soft">
              データがありません
            </div>
          )}
        </div>
      )}

      <Sheet open={!!detailDate} onOpenChange={(o) => !o && setDetailDate(null)}>
        <SheetContent className="h-[85vh] sm:h-[70vh] overflow-hidden px-0">
          <SheetHeader className="text-base font-semibold text-foreground">
            {detailDate} の明細
          </SheetHeader>
          <div className="flex-1 overflow-auto px-5 pb-6">
          {txLoading && (
            <div className="rounded-[24px] border border-white/50 bg-white/75 px-4 py-3 text-sm text-muted-foreground shadow-neumorphic-soft">
              読み込み中...
            </div>
          )}
          {txError && (
            <div className="rounded-[24px] border border-white/50 bg-gradient-to-br from-[rgba(255,228,232,1)] via-[rgba(255,210,217,0.94)] to-[rgba(242,139,148,0.9)] px-4 py-3 text-sm text-foreground shadow-neumorphic-soft">
              {txError}
            </div>
          )}
          {!txLoading && !txError && (
            <div className="space-y-2">
              {/* Pending confirmations */}
              {(pendingList ?? []).length > 0 && (
                <Card className="p-3">
                  <div className="text-sm font-medium mb-2">要確認のサブスク</div>
                  <div className="space-y-2">
                    {(pendingList ?? []).map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{p.name}</div>
                          <div className="text-xs text-muted-foreground">予定額: ¥{p.expected_amount.toLocaleString()} ・ 請求日: {p.billing_day}日</div>
                        </div>
                        <a className="ml-3" href={`/notifications?date=${detailDate ?? ''}`}>
                          <Button size="sm" className="h-8">今すぐ確認</Button>
                        </a>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {(txList ?? []).length === 0 && (
                <div className="text-sm text-muted-foreground">明細はありません</div>
              )}
              {(txList ?? []).map((tx) => (
                <Card key={tx.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{tx.category_name ?? "(未分類)"}</div>
                      {(tx.account_name || tx.place) && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {tx.account_name && <span>支出元: {tx.account_name}</span>}
                          {tx.account_name && tx.place && <span> ・ </span>}
                          {tx.place && <span>場所: {tx.place}</span>}
                        </div>
                      )}
                      {tx.memo && <div className="text-xs text-muted-foreground mt-1">{tx.memo}</div>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-sm" style={{ color: tx.type === "expense" ? 'var(--destructive)' : 'var(--success)' }}>
                        {tx.type === "expense" ? "-" : "+"}{tx.amount}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className={cn(chipButtonClass, "px-3")}
                          onClick={() => setEditingTx(tx)}
                        >
                          編集
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={cn(chipButtonClass, "px-3 text-[color:var(--destructive)]")}
                          onClick={() => setDeleteTarget(tx)}
                        >
                          削除
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Reactions */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="text-xs text-muted-foreground">リアクション:</div>
                    {(groupReactions(reactionsMap[tx.id] ?? [])).map((r) => (
                      <span key={r.emoji} className="text-sm">{r.emoji} {r.count}</span>
                    ))}
                    <div className="ml-auto flex gap-1">
                      {['👍','❤️','🎉'].map((e) => (
                        <Button
                          key={e}
                          size="sm"
                          variant="ghost"
                          className={cn(chipButtonClass, "px-3")}
                          onClick={() => toggleReaction(tx.id, e)}
                        >
                          {e}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Comments */}
                  <div className="mt-3">
                    <div className="text-xs font-medium mb-1">コメント</div>
                    <div className="space-y-1 max-h-40 overflow-auto">
                      {(commentsMap[tx.id] ?? []).map((c) => (
                        <div key={c.id} className="text-xs flex items-start gap-2">
                          <div className="flex-1">
                            <div className="text-muted-foreground">{new Date(c.created_at).toLocaleString()}</div>
                            <div>{c.body}</div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={cn(chipButtonClass, "px-3 text-[color:var(--destructive)]")}
                            onClick={() => deleteComment(tx.id, c.id)}
                          >
                            削除
                          </Button>
                        </div>
                      ))}
                      {(commentsMap[tx.id] ?? []).length === 0 && (
                        <div className="text-xs text-muted-foreground">コメントはありません</div>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        placeholder="コメントを入力..."
                        value={commentInputs[tx.id] ?? ''}
                        onChange={(e) => setCommentInputs((ci) => ({ ...ci, [tx.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            addComment(tx.id);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        className="h-10 rounded-full bg-gradient-to-br from-[rgba(255,163,179,1)] via-[rgba(255,143,162,0.95)] to-[rgba(255,120,148,0.9)] px-4 text-white shadow-neumorphic-soft"
                        onClick={() => addComment(tx.id)}
                      >
                        投稿
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          </div>
        </SheetContent>
      </Sheet>
      <TransactionEditDialog
        open={!!editingTx}
        transaction={
          editingTx
            ? {
                id: editingTx.id,
                date: editingTx.date,
                type: editingTx.type,
                amount: editingTx.amount,
                category_id: editingTx.category_id ?? null,
                account_id: editingTx.account_id ?? null,
                place: editingTx.place ?? null,
                memo: editingTx.memo ?? null,
              }
            : null
        }
        onOpenChange={(open) => {
          if (!open) setEditingTx(null);
        }}
        onUpdated={refreshAfterMutation}
        onDeleted={() => {
          refreshAfterMutation();
          setEditingTx(null);
        }}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="取引を削除しますか？"
        description={deleteDescription}
        confirmText={deleteLoading ? '削除中…' : '削除する'}
        cancelText="キャンセル"
        destructive
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (deleteLoading) return;
          setDeleteTarget(null);
        }}
      />
      </main>
    </div>
  );
}
