"use client";
import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/auth/RequireAuth";
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
  return (
    <RequireAuth>
      <ReportsScreen />
    </RequireAuth>
  );
}

function ReportsScreen() {
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

  const navButtonClass =
    "h-10 w-10 rounded-full p-0 text-base font-semibold shadow-neumorphic-soft hover:shadow-neumorphic-hover";

  return (
    <div>
      <AppHeader
        title={`月次サマリー ${monthKey}`}
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
      <main className="mx-auto max-w-6xl space-y-6 px-4 pb-24 pt-6 md:px-8">

      {loading && (
        <Card className="rounded-[28px] border border-white/60 bg-white/75 p-6 text-sm text-muted-foreground shadow-neumorphic-soft">
          読み込み中...
        </Card>
      )}
      {error && (
        <Card className="rounded-[28px] border border-white/60 bg-gradient-to-br from-[rgba(255,228,232,1)] via-[rgba(255,210,217,0.94)] to-[rgba(242,139,148,0.9)] p-6 text-sm text-foreground shadow-neumorphic-soft">
          {error}
        </Card>
      )}

      {!loading && !error && (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pie (Expense composition) */}
            <Card className="space-y-4 p-6">
              <div className="rounded-[24px] border border-white/40 bg-white/60 px-4 py-2 text-sm font-medium text-muted-foreground">
                支出カテゴリ内訳（円グラフ）
              </div>
              <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
                <div
                  className="w-48 h-48 rounded-full shadow-neumorphic"
                  style={pieStyle}
                  aria-label="Expense pie chart"
                />
                <div className="flex-1 space-y-1 text-xs">
                  {expenseTotals.length === 0 && (
                    <div className="text-muted-foreground">データがありません</div>
                  )}
                  {expenseTotals.map((t, i) => (
                    <div
                      key={t.category_id}
                      className={`flex items-center gap-2 rounded-[20px] px-3 py-2 transition-all duration-200 ${
                        hoverCatId === t.category_id
                          ? "bg-white/70 font-semibold shadow-neumorphic-soft"
                          : "hover:bg-white/60 hover:shadow-neumorphic-soft"
                      }`}
                      onMouseEnter={() => setHoverCatId(t.category_id)}
                      onMouseLeave={() => setHoverCatId((id) => (id === t.category_id ? null : id))}
                    >
                      <span
                        className="inline-block h-3 w-3 rounded-sm shadow-neumorphic-soft"
                        style={{ background: chartColors[i % chartColors.length] }}
                      />
                      <span className="max-w-[200px] truncate">{t.name}</span>
                      <span className="ml-auto font-mono tabular-nums">{t.expense}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Bars (Category totals) */}
            <Card className="space-y-4 p-6">
              <div className="rounded-[24px] border border-white/40 bg-white/60 px-4 py-2 text-sm font-medium text-muted-foreground">
                カテゴリ別金額（棒グラフ）
              </div>
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
                      <div className="w-40 truncate text-xs" title={t.name}>{t.name}</div>
                      <div className="h-4 flex-1 rounded-full bg-white/60 shadow-inner">
                        <div
                          className={`h-4 rounded-full transition-all shadow-neumorphic-soft ${
                            highlighted ? "scale-[1.03] shadow-neumorphic-hover" : "hover:shadow-neumorphic"
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
          <Card className="space-y-4 p-6">
            <div className="rounded-[24px] border border-white/40 bg-white/60 px-4 py-2 text-sm font-medium text-muted-foreground">
              カテゴリ別サマリー
            </div>
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
      </main>
    </div>
  );
}

