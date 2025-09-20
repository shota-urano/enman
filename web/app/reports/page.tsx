"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";

type Category = {
  id: string;
  name: string;
  type: "income" | "expense" | "both";
  sort_order: number;
};

type Tx = {
  id: string;
  kind: "income" | "expense";
  occurred_on: string; // YYYY-MM-DD
  amount: number;
  category_id: string;
  account_id: string;
  place?: string | null;
  memo?: string | null;
};

function formatMonthKey(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  return `${y}-${m}`;
}

function useMonthlyData(month: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);

  useEffect(() => {
    let aborted = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch("/api/categories", { cache: "no-store" }).then(async (r) => {
        if (!r.ok) throw await r.json();
        return (await r.json()) as Category[];
      }),
      fetch(`/api/transactions?month=${month}`, { cache: "no-store" }).then(async (r) => {
        if (!r.ok) throw await r.json();
        return (await r.json()) as Tx[];
      }),
    ])
      .then(([cats, txs]) => {
        if (aborted) return;
        setCategories(cats);
        setTxs(txs);
      })
      .catch((e) => {
        if (aborted) return;
        const msg = typeof e?.message === "string" ? e.message : "データ取得に失敗しました";
        setError(msg);
      })
      .finally(() => !aborted && setLoading(false));
    return () => {
      aborted = true;
    };
  }, [month]);

  return { loading, error, categories, txs };
}

type CatTotal = {
  category_id: string;
  name: string;
  income: number;
  expense: number;
};

function buildTotals(categories: Category[], txs: Tx[]): CatTotal[] {
  const byId = new Map<string, CatTotal>();
  for (const c of categories) {
    byId.set(c.id, { category_id: c.id, name: c.name, income: 0, expense: 0 });
  }
  for (const t of txs) {
    const row = byId.get(t.category_id);
    if (!row) continue;
    if (t.kind === "income") row.income += t.amount;
    else row.expense += t.amount;
  }
  return Array.from(byId.values());
}

// Build a conic-gradient string for a pie chart of expense totals.
function buildPieGradient(totals: CatTotal[], colors: string[]): string {
  const sums = totals.map((t) => Math.max(0, t.expense));
  const grand = sums.reduce((a, b) => a + b, 0);
  if (grand <= 0) return "conic-gradient(#e5e7eb 0 360deg)"; // gray

  let acc = 0;
  const stops: string[] = [];
  totals.forEach((t, i) => {
    const val = Math.max(0, t.expense);
    if (val === 0) return;
    const start = (acc / grand) * 360;
    const end = ((acc + val) / grand) * 360;
    const color = colors[i % colors.length];
    stops.push(`${color} ${start}deg ${end}deg`);
    acc += val;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export default function ReportsPage() {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const monthKey = useMemo(() => formatMonthKey(currentMonth), [currentMonth]);
  const { loading, error, categories, txs } = useMonthlyData(monthKey);
  const [hoverCatId, setHoverCatId] = useState<string | null>(null);

  const totals = useMemo(() => buildTotals(categories, txs), [categories, txs]);

  const expenseTotals = useMemo(
    () => totals.filter((t) => t.expense > 0).sort((a, b) => b.expense - a.expense),
    [totals]
  );
  const incomeTotals = useMemo(
    () => totals.filter((t) => t.income > 0).sort((a, b) => b.income - a.income),
    [totals]
  );

  const chartColors = useMemo(
    () => [
      "var(--color-chart-1)",
      "var(--color-chart-2)",
      "var(--color-chart-3)",
      "var(--color-chart-4)",
      "var(--color-chart-5)",
    ],
    []
  );

  const pieStyle = useMemo(
    () => ({ background: buildPieGradient(expenseTotals, chartColors) }),
    [expenseTotals, chartColors]
  );

  function prevMonth() {
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function nextMonth() {
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  return (
    <div>
      <AppHeader
        title={`月次サマリー ${monthKey}`}
        left={<Button aria-label="前の月" variant="ghost" className="h-9 px-3" onClick={prevMonth}>&lt;</Button>}
        right={<Button aria-label="次の月" variant="ghost" className="h-9 px-3" onClick={nextMonth}>&gt;</Button>}
      />
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 shadow-inner rounded-xl bg-background/50">

      {loading && <Card className="p-6 text-sm text-muted-foreground">読み込み中...</Card>}
      {error && <Card className="p-6 text-sm text-red-500">{error}</Card>}

      {!loading && !error && (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pie (Expense composition) */}
            <Card className="p-4">
              <div className="text-sm font-medium mb-3 p-2 rounded-lg shadow-neumorphic-soft bg-card/30">支出カテゴリ内訳（円グラフ）</div>
              <div className="flex items-center gap-6">
                <div
                  className="w-48 h-48 rounded-full shadow-neumorphic"
                  style={pieStyle}
                  aria-label="Expense pie chart"
                />
                <div className="text-xs space-y-1">
                  {expenseTotals.length === 0 && (
                    <div className="text-muted-foreground">データがありません</div>
                  )}
                  {expenseTotals.map((t, i) => (
                    <div
                      key={t.category_id}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-all duration-200 ${
                        hoverCatId === t.category_id 
                          ? "font-semibold shadow-neumorphic-soft bg-card/50" 
                          : "hover:shadow-neumorphic-soft hover:bg-card/30"
                      }`}
                      onMouseEnter={() => setHoverCatId(t.category_id)}
                      onMouseLeave={() => setHoverCatId((id) => (id === t.category_id ? null : id))}
                    >
                      <span 
                        className="inline-block w-3 h-3 rounded-sm shadow-neumorphic-soft" 
                        style={{ background: chartColors[i % chartColors.length] }} 
                      />
                      <span className="truncate max-w-[200px]">{t.name}</span>
                      <span className="ml-auto tabular-nums font-mono">{t.expense}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Bars (Category totals) */}
            <Card className="p-4">
              <div className="text-sm font-medium mb-3 p-2 rounded-lg shadow-neumorphic-soft bg-card/30">カテゴリ別金額（棒グラフ）</div>
              <div className="space-y-2">
                {expenseTotals.length === 0 && incomeTotals.length === 0 && (
                  <div className="text-xs text-muted-foreground">データがありません</div>
                )}
                {[...expenseTotals, ...incomeTotals].map((t, i) => {
                  const max = Math.max(
                    1,
                    ...expenseTotals.map((x) => x.expense),
                    ...incomeTotals.map((x) => x.income)
                  );
                  const val = t.expense > 0 ? t.expense : t.income;
                  const pct = Math.round((val / max) * 100);
                  const color = t.expense > 0 ? "var(--destructive)" : "var(--success)"; // pastel error/success
                  const highlighted = hoverCatId === t.category_id;
                  return (
                    <div key={`${t.category_id}-${i}`} className="flex items-center gap-2">
                      <div className="w-40 text-xs truncate" title={t.name}>{t.name}</div>
                      <div className="flex-1 h-4 bg-muted rounded shadow-inner">
                        <div
                          className={`h-4 rounded transition-all shadow-neumorphic-soft ${
                            highlighted ? "shadow-neumorphic-hover scale-105" : "hover:shadow-neumorphic"
                          }`}
                          style={{ width: `${pct}%`, background: color }}
                          onMouseEnter={() => setHoverCatId(t.category_id)}
                          onMouseLeave={() => setHoverCatId((id) => (id === t.category_id ? null : id))}
                        />
                      </div>
                      <div className="w-20 text-right text-xs tabular-nums">{val}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Table */}
          <Card className="p-4">
            <div className="text-sm font-medium mb-3 p-2 rounded-lg shadow-neumorphic-soft bg-card/30">カテゴリ別サマリー</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr className="shadow-neumorphic-soft rounded-lg overflow-hidden">
                    <th className="py-3 pr-2 px-3 bg-card rounded-l-lg">カテゴリ</th>
                    <th className="py-3 pr-2 px-3 bg-card text-right">収入</th>
                    <th className="py-3 pr-2 px-3 bg-card text-right">支出</th>
                    <th className="py-3 pr-2 px-3 bg-card text-right rounded-r-lg">差分</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-xs text-muted-foreground">
                        データがありません
                      </td>
                    </tr>
                  )}
                  {totals
                    .filter((t) => t.income > 0 || t.expense > 0)
                    .sort((a, b) => (b.income + b.expense) - (a.income + a.expense))
                    .map((t, i) => {
                      const diff = t.income - t.expense;
                      const highlighted = hoverCatId === t.category_id;
                      return (
                        <tr
                          key={t.category_id}
                          className={`${highlighted ? "shadow-neumorphic-soft bg-card" : "hover:shadow-neumorphic-soft hover:bg-card"} transition-all duration-200`}
                          onMouseEnter={() => setHoverCatId(t.category_id)}
                          onMouseLeave={() => setHoverCatId((id) => (id === t.category_id ? null : id))}
                        >
                          <td className="py-1 pr-2">
                            <div className="flex items-center gap-2">
                              <span 
                                className="inline-block w-3 h-3 rounded-sm shadow-neumorphic-soft" 
                                style={{ background: chartColors[i % chartColors.length] }} 
                              />
                              <span>{t.name}</span>
                            </div>
                          </td>
                          <td className="py-1 pr-2 text-right tabular-nums" style={{ color: 'var(--success)' }}>{t.income}</td>
                          <td className="py-1 pr-2 text-right tabular-nums" style={{ color: 'var(--destructive)' }}>{t.expense}</td>
                          <td className="py-1 pr-2 text-right tabular-nums" style={{ color: diff < 0 ? 'var(--destructive)' : 'var(--success)' }}>{diff}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
      </div>
    </div>
  );
}

