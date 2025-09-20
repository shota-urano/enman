"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import AppHeader from "@/components/AppHeader";

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
          .map((it: any) => {
            const date: string | undefined = it?.date ?? it?.day;
            const income = typeof it?.income_total === 'number'
              ? it.income_total
              : typeof it?.income === 'number'
                ? it.income
                : 0;
            const expense = typeof it?.expense_total === 'number'
              ? it.expense_total
              : typeof it?.expense === 'number'
                ? it.expense
                : 0;
            const net = typeof it?.net_total === 'number'
              ? it.net_total
              : (income - expense);
            if (!date) return null;
            return { date, income_total: income, expense_total: expense, net_total: net } as DailyTotalsItem;
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
          .map((it: any) => ({ day: it?.day, pending_count: Number(it?.pending_count ?? 0) }))
          .filter((v): v is PendingConfirmItem => !!v.day);
        setPending(normalized);
      })
      .catch((_e) => {
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
  }, [monthKey]);

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

  function openDetail(dateStr: string) {
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
            } catch (_e) {
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
  }

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

  return (
    <div>
      <AppHeader
        title={monthTitle}
        left={<Button aria-label="前の月" variant="ghost" className="h-9 px-3" onClick={prevMonth}>&lt;</Button>}
        right={<Button aria-label="次の月" variant="ghost" className="h-9 px-3" onClick={nextMonth}>&gt;</Button>}
      />
      <div className="p-4 md:p-6 max-w-5xl mx-auto bg-gray-100 min-h-screen">

      {loading && (
        <div className="p-6 text-sm text-gray-600 bg-gray-100 rounded-2xl shadow-inner">読み込み中...</div>
      )}
      {error && (
        <div className="p-6 text-sm text-red-600 bg-gray-100 rounded-2xl shadow-inner">{error}</div>
      )}
      {!loading && !error && (
        <div>
          {/* 月間サマリー - 表形式 */}
          <div className="mb-6 bg-gray-100 rounded-3xl p-6 shadow-neumorphic">
            <div className="grid grid-cols-3 gap-4 text-center">
              {/* タイトル行 */}
              <div className="text-sm text-gray-500">今月のサマリー</div>
              <div className="text-sm text-gray-500">収入</div>
              <div className="text-sm text-gray-500">支出</div>
              
              {/* データ行 */}
              <div className={`text-2xl sm:text-3xl font-bold ${
                monthlySummary.netTotal >= 0 ? 'text-green-600' : 'text-red-500'
              }`}>
                {monthlySummary.netTotal.toLocaleString()}
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-green-600">
                +{monthlySummary.totalIncome.toLocaleString()}
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-red-500">
                -{monthlySummary.totalExpense.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs text-muted-foreground">
            {["日","月","火","水","木","金","土"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-3 bg-gray-100 rounded-3xl p-6 shadow-neumorphic">
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
              
              return (
                <div key={idx} 
                  className="h-16 sm:h-20 relative cursor-pointer transition-all duration-300 flex flex-col items-center justify-center p-2"
                  onClick={() => {
                    if (hasData) {
                      openDetail(key)
                    } else if (pendingCount > 0) {
                      router.push(`/notifications?date=${key}`)
                    }
                  }}>
                  
                  {/* 日付 - ニューモルフィック背景付き */}
                  <div className="relative flex flex-col items-center">
                    <div className={`
                      w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm sm:text-base font-medium transition-all duration-300
                      ${isToday 
                        ? 'bg-gray-100 text-blue-600 shadow-neumorphic-pressed' 
                        : hasData 
                          ? 'bg-gray-100 text-gray-700 shadow-neumorphic hover:shadow-neumorphic-hover' 
                          : cell.getMonth() !== currentMonth.getMonth()
                            ? 'text-gray-400 bg-gray-100'
                            : 'text-gray-600 bg-gray-100 hover:shadow-neumorphic-soft'
                      }
                    `}>
                      {cell.getDate()}
                    </div>
                    
                    {/* 収支インジケーター */}
                    {hasData && !isToday && (
                      <div className="mt-1 flex flex-col items-center">
                        {/* 小さい丸 */}
                        <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                          (t?.net_total ?? 0) < 0 ? 'bg-red-400' : 'bg-green-400'
                        }`} />
                        {/* トータル収支 */}
                        <div className="text-[9px] sm:text-[10px] font-medium text-center leading-none mt-0.5">
                          <div className={`${
                            (t?.net_total ?? 0) < 0 ? 'text-red-500' : 'text-green-500'
                          }`}>
                            {(t?.net_total ?? 0) >= 0 ? '+' : ''}{(t?.net_total ?? 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* 今日の日付の場合の収支表示 */}
                    {hasData && isToday && (
                      <div className="mt-1 flex flex-col items-center">
                        <div className="text-[9px] sm:text-[10px] font-medium text-center leading-none">
                          <div className={`${
                            (t?.net_total ?? 0) < 0 ? 'text-red-500' : 'text-green-500'
                          }`}>
                            {(t?.net_total ?? 0) >= 0 ? '+' : ''}{(t?.net_total ?? 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* 要確認インジケータ */}
                    {pendingCount > 0 && (
                      <div className="mt-1 text-[9px] sm:text-[10px] text-amber-600 font-medium">
                        要確認{pendingCount > 1 ? ` ×${pendingCount}` : ''}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {(!data || data.length === 0) && (
            <div className="p-6 mt-4 text-sm text-gray-600 bg-gray-100 rounded-2xl shadow-inner">データがありません</div>
          )}
        </div>
      )}

      <Sheet open={!!detailDate} onOpenChange={(o) => !o && setDetailDate(null)}>
        <SheetContent className="h-[85vh] sm:h-[70vh] overflow-hidden flex flex-col">
          <SheetHeader className="text-lg font-semibold">
            {detailDate} の明細
          </SheetHeader>
          <div className="flex-1 overflow-auto px-4 pb-4">
          {txLoading && (
            <div className="text-sm text-muted-foreground">読み込み中...</div>
          )}
          {txError && (
            <div className="text-sm text-red-500">{txError}</div>
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
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{tx.category_name ?? "(未分類)"}</div>
                    <div className="text-sm" style={{ color: tx.type === "expense" ? 'var(--destructive)' : 'var(--success)' }}>
                      {tx.type === "expense" ? "-" : "+"}{tx.amount}
                    </div>
                  </div>
                  {(tx.account_name || tx.place) && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {tx.account_name && <span>支出元: {tx.account_name}</span>}
                      {tx.account_name && tx.place && <span> ・ </span>}
                      {tx.place && <span>場所: {tx.place}</span>}
                    </div>
                  )}
                  {tx.memo && <div className="text-xs text-muted-foreground mt-1">{tx.memo}</div>}

                  {/* Reactions */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="text-xs text-muted-foreground">リアクション:</div>
                    {(groupReactions(reactionsMap[tx.id] ?? [])).map((r) => (
                      <span key={r.emoji} className="text-sm">{r.emoji} {r.count}</span>
                    ))}
                    <div className="ml-auto flex gap-1">
                      {['👍','❤️','🎉'].map((e) => (
                        <Button key={e} size="sm" variant="ghost" className="h-7 px-2 border"
                          onClick={() => toggleReaction(tx.id, e)}>
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
                          <Button size="sm" variant="ghost" className="h-7 px-2 border"
                            onClick={() => deleteComment(tx.id, c.id)}>
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
                      <Button size="sm" className="h-9" onClick={() => addComment(tx.id)}>投稿</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          </div>
        </SheetContent>
      </Sheet>
      </div>
    </div>
  );
}
