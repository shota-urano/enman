"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";

type DailyTotalsItem = {
  date: string; // YYYY-MM-DD
  income_total: number;
  expense_total: number;
  net_total: number;
};

type TxItem = {
  id: string;
  date: string;
  amount: number;
  type: "income" | "expense";
  category_name?: string;
  memo?: string;
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
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [data, setData] = useState<DailyTotalsItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [txList, setTxList] = useState<TxItem[] | null>(null);

  const monthKey = useMemo(() => formatMonthKey(currentMonth), [currentMonth]);

  useEffect(() => {
    let aborted = false;
    setLoading(true);
    setError(null);
    setData(null);
    fetch(`/api/reports/daily-totals?month=${monthKey}`)
      .then(async (r) => {
        if (!r.ok) throw await r.json();
        return r.json();
      })
      .then((json) => {
        if (!aborted) setData(json as DailyTotalsItem[]);
      })
      .catch((e) => {
        if (aborted) return;
        const msg = typeof e?.message === "string" ? e.message : "データ取得に失敗しました";
        setError(msg);
      })
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

  const weeks = useMemo(() => getCalendarMatrix(currentMonth), [currentMonth]);

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
    fetch(`/api/transactions?date=${dateStr}`)
      .then(async (r) => {
        if (!r.ok) throw await r.json();
        return r.json();
      })
      .then((json) => setTxList(json as TxItem[]))
      .catch((e) => {
        const msg = typeof e?.message === "string" ? e.message : "明細取得に失敗しました";
        setTxError(msg);
      })
      .finally(() => setTxLoading(false));
  }

  const monthTitle = `${currentMonth.getFullYear()}年 ${currentMonth.getMonth() + 1}月`;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" className="border px-3" onClick={prevMonth}>&lt;</Button>
        <h1 className="text-xl font-semibold">{monthTitle}</h1>
        <Button variant="ghost" className="border px-3" onClick={nextMonth}>&gt;</Button>
      </div>

      {loading && (
        <Card className="p-6 text-sm text-muted-foreground">読み込み中...</Card>
      )}
      {error && (
        <Card className="p-6 text-sm text-red-500">{error}</Card>
      )}
      {!loading && !error && (
        <div>
          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs text-muted-foreground">
            {["日","月","火","水","木","金","土"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weeks.flat().map((cell, idx) => {
              if (!cell) return <div key={idx} className="h-24"/>;
              const yyyy = cell.getFullYear();
              const mm = `${cell.getMonth() + 1}`.padStart(2, "0");
              const dd = `${cell.getDate()}`.padStart(2, "0");
              const key = `${yyyy}-${mm}-${dd}`;
              const t = totalsByDate.get(key);
              const expense = t?.expense_total ?? 0;
              const income = t?.income_total ?? 0;
              return (
                <Card key={idx} className="h-24 p-2 cursor-pointer hover:ring-2 hover:ring-primary/40"
                  onClick={() => openDetail(key)}>
                  <div className="flex items-start justify-between">
                    <div className="text-xs text-muted-foreground">{cell.getDate()}</div>
                    {t && (
                      <span className={`text-[10px] font-medium ${t.net_total < 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {t.net_total}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="text-[10px] text-red-600">支出 {expense}</div>
                    <div className="text-[10px] text-emerald-600">収入 {income}</div>
                  </div>
                </Card>
              );
            })}
          </div>
          {(!data || data.length === 0) && (
            <Card className="p-6 mt-4 text-sm text-muted-foreground">データがありません</Card>
          )}
        </div>
      )}

      <Dialog open={!!detailDate} onOpenChange={(o) => !o && setDetailDate(null)}>
        <DialogContent>
          <DialogHeader>
            {detailDate} の明細
          </DialogHeader>
          {txLoading && (
            <div className="text-sm text-muted-foreground">読み込み中...</div>
          )}
          {txError && (
            <div className="text-sm text-red-500">{txError}</div>
          )}
          {!txLoading && !txError && (
            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {(txList ?? []).length === 0 && (
                <div className="text-sm text-muted-foreground">明細はありません</div>
              )}
              {(txList ?? []).map((tx) => (
                <Card key={tx.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{tx.category_name ?? "(未分類)"}</div>
                    <div className={`text-sm ${tx.type === "expense" ? "text-red-600" : "text-emerald-700"}`}>
                      {tx.type === "expense" ? "-" : "+"}{tx.amount}
                    </div>
                  </div>
                  {tx.memo && <div className="text-xs text-muted-foreground mt-1">{tx.memo}</div>}
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
