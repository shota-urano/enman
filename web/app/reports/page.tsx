"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
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

type Account = {
  id: string;
  name: string;
  type: "cash" | "bank" | "card" | "other";
  sort_order: number;
};

const PIE_RADIUS = 96;
const PIE_VIEWBOX = "-160 -138 320 284";
const LABEL_INSIDE_THRESHOLD = 0.12;

const currencyFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

function formatAmount(value: number) {
  return currencyFormatter.format(Math.round(value));
}

type PieSegment = {
  id: string;
  name: string;
  value: number;
  ratio: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  color: string;
  path: string;
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
  const [accounts, setAccounts] = useState<Account[]>([]);

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
      fetch("/api/accounts", { cache: "no-store" }).then(async (r) => {
        if (!r.ok) throw await r.json();
        return (await r.json()) as Account[];
      }),
    ])
      .then(([cats, txList, accs]) => {
        if (aborted) return;
        setCategories(cats);
        setTxs(txList);
        setAccounts(accs);
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

  return { loading, error, categories, txs, accounts };
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

function toRadians(angleDeg: number) {
  return (Math.PI / 180) * angleDeg;
}

function polarToCartesian(radius: number, angleDeg: number) {
  const rad = toRadians(angleDeg);
  return {
    x: Math.cos(rad) * radius,
    y: Math.sin(rad) * radius,
  };
}

type PieDatum = {
  id: string;
  name: string;
  value: number;
};

function buildPieSegments(data: PieDatum[], colors: string[]): PieSegment[] {
  const positive = data.filter((item) => item.value > 0);
  const grand = positive.reduce((sum, item) => sum + item.value, 0);
  if (grand <= 0) return [];

  const segments: PieSegment[] = [];
  let cursor = -90; // start from top

  positive.forEach((row, idx) => {
    const ratio = row.value / grand;
    const sweep = ratio * 360;
    const startAngle = cursor;
    const endAngle = cursor + sweep;

    const start = polarToCartesian(PIE_RADIUS, startAngle);
    const end = polarToCartesian(PIE_RADIUS, endAngle);
    const largeArc = sweep > 180 ? 1 : 0;
    const path = [
      "M 0 0",
      `L ${start.x.toFixed(3)} ${start.y.toFixed(3)}`,
      `A ${PIE_RADIUS} ${PIE_RADIUS} 0 ${largeArc} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`,
      "Z",
    ].join(" ");

    segments.push({
      id: row.id,
      name: row.name,
      value: row.value,
      ratio,
      startAngle,
      endAngle,
      midAngle: startAngle + sweep / 2,
      color: colors[idx % colors.length],
      path,
    });

    cursor = endAngle;
  });

  return segments;
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
  const { loading, error, categories, txs, accounts } = useMonthlyData(monthKey);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"expense" | "income" | "account">("expense");

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

  const accountTotals = useMemo(() => {
    const map = new Map<
      string,
      { accountId: string; name: string; type: Account["type"]; income: number; expense: number }
    >();
    for (const acc of accounts) {
      map.set(acc.id, {
        accountId: acc.id,
        name: acc.name,
        type: acc.type,
        income: 0,
        expense: 0,
      });
    }
    for (const tx of txs) {
      const row = map.get(tx.account_id);
      if (!row) continue;
      if (tx.kind === "income") row.income += tx.amount;
      else row.expense += tx.amount;
    }
    return Array.from(map.values())
      .filter((row) => row.income > 0 || row.expense > 0)
      .sort((a, b) => b.expense + b.income - (a.expense + a.income));
  }, [accounts, txs]);

  const pieData = useMemo<PieDatum[]>(() => {
    if (activeTab === "income") {
      return incomeTotals.map((t) => ({ id: t.category_id, name: t.name, value: t.income }));
    }
    if (activeTab === "account") {
      return accountTotals.map((row) => ({
        id: row.accountId,
        name: row.name,
        value: row.income + row.expense,
      }));
    }
    return expenseTotals.map((t) => ({ id: t.category_id, name: t.name, value: t.expense }));
  }, [activeTab, expenseTotals, incomeTotals, accountTotals]);

  const pieSegments = useMemo(() => buildPieSegments(pieData, chartColors), [pieData, chartColors]);

  useEffect(() => {
    setHoverId(null);
  }, [activeTab]);

  const tabItems: { id: "expense" | "income" | "account"; label: string }[] = [
    { id: "expense", label: "支出カテゴリ" },
    { id: "income", label: "収入カテゴリ" },
    { id: "account", label: "アカウント" },
  ];

  const chartTitle = useMemo(() => {
    switch (activeTab) {
      case "income":
        return "収入カテゴリ内訳（円グラフ）";
      case "account":
        return "アカウント内訳（円グラフ）";
      default:
        return "支出カテゴリ内訳（円グラフ）";
    }
  }, [activeTab]);

  const tableHeaders = useMemo(() => {
    if (activeTab === "expense") {
      return [
        { key: "name", label: "カテゴリ", align: "left" as const },
        { key: "expense", label: "支出", align: "right" as const },
      ];
    }
    if (activeTab === "income") {
      return [
        { key: "name", label: "カテゴリ", align: "left" as const },
        { key: "income", label: "収入", align: "right" as const },
      ];
    }
    return [
      { key: "name", label: "アカウント", align: "left" as const },
      { key: "income", label: "収入", align: "right" as const },
      { key: "expense", label: "支出", align: "right" as const },
    ];
  }, [activeTab]);

  const accountTypeLabel = (type: Account["type"]) => {
    switch (type) {
      case "cash":
        return "現金";
      case "bank":
        return "銀行";
      case "card":
        return "カード";
      default:
        return "その他";
    }
  };

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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="font-medium text-sm text-muted-foreground">
                表示対象
              </div>
              <div className="flex flex-wrap gap-2">
                {tabItems.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={clsx(
                      "rounded-full px-4 py-2 text-xs font-medium transition-all",
                      activeTab === tab.id
                        ? "bg-foreground text-background shadow-neumorphic-soft"
                        : "bg-white/70 text-muted-foreground hover:bg-white/80 hover:shadow-neumorphic-soft"
                    )}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 gap-6">
              {/* Pie (composition) */}
              <Card className="space-y-4 p-6">
                <div className="rounded-[24px] border border-white/40 bg-white/60 px-4 py-2 text-sm font-medium text-muted-foreground">
                  {chartTitle}
                </div>
                <div className="flex flex-col items-center justify-center">
                  <div className="relative flex aspect-square w-64 items-center justify-center pt-6 md:w-80 md:pt-10">
                    {pieSegments.length === 0 ? (
                      <div className="text-xs text-muted-foreground">データがありません</div>
                    ) : (
                      <svg
                        viewBox={PIE_VIEWBOX}
                        className="h-full w-full"
                        role="img"
                        aria-label={
                          activeTab === "income"
                            ? "収入カテゴリ内訳円グラフ"
                            : activeTab === "account"
                            ? "アカウント内訳円グラフ"
                            : "支出カテゴリ内訳円グラフ"
                        }
                      >
                        {pieSegments.map((segment) => {
                          const isHovered = hoverId === segment.id;
                          const fadeOthers = hoverId && hoverId !== segment.id;
                          const labelInside =
                            segment.ratio >= LABEL_INSIDE_THRESHOLD || segment.endAngle - segment.startAngle >= 36;
                          const innerPos = polarToCartesian(PIE_RADIUS * 0.55, segment.midAngle);
                          const connectorStart = polarToCartesian(PIE_RADIUS * 0.92, segment.midAngle);
                          const connectorEnd = polarToCartesian(PIE_RADIUS + 10, segment.midAngle);
                          const textPos = polarToCartesian(PIE_RADIUS + 32, segment.midAngle);
                          const textAnchor = textPos.x >= 0 ? "start" : "end";

                          return (
                            <g
                              key={segment.id}
                              className="cursor-pointer transition-transform"
                              onMouseEnter={() => setHoverId(segment.id)}
                              onMouseLeave={() => setHoverId((id) => (id === segment.id ? null : id))}
                              transform={isHovered ? "scale(1.04)" : undefined}
                            >
                              <path
                                d={segment.path}
                                fill={segment.color}
                                fillOpacity={fadeOthers ? 0.35 : 1}
                                stroke="white"
                                strokeWidth={isHovered ? 2 : 1}
                              />

                              {labelInside ? (
                                <text
                                  x={innerPos.x}
                                  y={innerPos.y}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  style={{ fill: "white" }}
                                  className="text-[10px] font-semibold tracking-tight"
                                  pointerEvents="none"
                                >
                                  <tspan x={innerPos.x} dy="0">
                                    {segment.name}
                                  </tspan>
                                  <tspan x={innerPos.x} dy="1.15em" className="font-medium">
                                    {formatAmount(segment.value)}
                                  </tspan>
                                </text>
                              ) : (
                                <g pointerEvents="none">
                                  <path
                                    d={`M ${connectorStart.x.toFixed(3)} ${connectorStart.y.toFixed(3)} L ${
                                      connectorEnd.x.toFixed(3)
                                    } ${connectorEnd.y.toFixed(3)}`}
                                    stroke={segment.color}
                                    strokeWidth={1.5}
                                    fill="none"
                                  />
                                  <circle
                                    cx={connectorEnd.x}
                                    cy={connectorEnd.y}
                                    r={2.5}
                                    fill={segment.color}
                                  />
                                  <text
                                    x={textPos.x}
                                    y={textPos.y}
                                    textAnchor={textAnchor}
                                    dominantBaseline="middle"
                                    style={{ fill: "var(--foreground)" }}
                                    className="text-[10px] font-medium tracking-tight"
                                  >
                                    <tspan x={textPos.x} dy="0">
                                      {segment.name}
                                    </tspan>
                                    <tspan x={textPos.x} dy="1.2em" className="font-semibold">
                                      {formatAmount(segment.value)}
                                    </tspan>
                                  </text>
                                </g>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    )}
                  </div>
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
                    <tr className="overflow-hidden rounded-lg shadow-neumorphic-soft">
                      {tableHeaders.map((col, idx) => (
                        <th
                          key={col.key}
                          className={clsx(
                            "bg-card px-3 py-3 pr-2",
                            idx === 0 && "rounded-l-lg",
                            idx === tableHeaders.length - 1 && "rounded-r-lg",
                            col.align === "right" && "text-right"
                          )}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeTab === "expense" && expenseTotals.length === 0 && (
                      <tr>
                        <td colSpan={tableHeaders.length} className="py-4 text-center text-xs text-muted-foreground">
                          データがありません
                        </td>
                      </tr>
                    )}
                    {activeTab === "income" && incomeTotals.length === 0 && (
                      <tr>
                        <td colSpan={tableHeaders.length} className="py-4 text-center text-xs text-muted-foreground">
                          データがありません
                        </td>
                      </tr>
                    )}
                    {activeTab === "account" && accountTotals.length === 0 && (
                      <tr>
                        <td colSpan={tableHeaders.length} className="py-4 text-center text-xs text-muted-foreground">
                          データがありません
                        </td>
                      </tr>
                    )}
                    {activeTab === "expense" &&
                      expenseTotals.map((t, i) => {
                        const highlighted = hoverId === t.category_id;
                        return (
                          <tr
                            key={t.category_id}
                            className={clsx(
                              "transition-all duration-200",
                              highlighted
                                ? "bg-card shadow-neumorphic-soft"
                                : "hover:bg-card hover:shadow-neumorphic-soft"
                            )}
                            onMouseEnter={() => setHoverId(t.category_id)}
                            onMouseLeave={() => setHoverId((id) => (id === t.category_id ? null : id))}
                          >
                            <td className="py-1 pr-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-block h-3 w-3 rounded-sm shadow-neumorphic-soft"
                                  style={{ background: chartColors[i % chartColors.length] }}
                                />
                                <span>{t.name}</span>
                              </div>
                            </td>
                            <td className="py-1 pr-2 text-right tabular-nums" style={{ color: "var(--destructive)" }}>
                              {formatAmount(t.expense)}
                            </td>
                          </tr>
                        );
                      })}
                    {activeTab === "income" &&
                      incomeTotals.map((t, i) => {
                        const highlighted = hoverId === t.category_id;
                        return (
                          <tr
                            key={t.category_id}
                            className={clsx(
                              "transition-all duration-200",
                              highlighted
                                ? "bg-card shadow-neumorphic-soft"
                                : "hover:bg-card hover:shadow-neumorphic-soft"
                            )}
                            onMouseEnter={() => setHoverId(t.category_id)}
                            onMouseLeave={() => setHoverId((id) => (id === t.category_id ? null : id))}
                          >
                            <td className="py-1 pr-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-block h-3 w-3 rounded-sm shadow-neumorphic-soft"
                                  style={{ background: chartColors[i % chartColors.length] }}
                                />
                                <span>{t.name}</span>
                              </div>
                            </td>
                            <td className="py-1 pr-2 text-right tabular-nums" style={{ color: "var(--success)" }}>
                              {formatAmount(t.income)}
                            </td>
                          </tr>
                        );
                      })}
                    {activeTab === "account" &&
                      accountTotals.map((row, i) => {
                        const highlighted = hoverId === row.accountId;
                        return (
                          <tr
                            key={row.accountId}
                            className={clsx(
                              "transition-all duration-200",
                              highlighted
                                ? "bg-card shadow-neumorphic-soft"
                                : "hover:bg-card hover:shadow-neumorphic-soft"
                            )}
                            onMouseEnter={() => setHoverId(row.accountId)}
                            onMouseLeave={() => setHoverId((id) => (id === row.accountId ? null : id))}
                          >
                            <td className="py-1 pr-2">
                              <div className="flex items-center gap-3">
                                <span
                                  className="inline-block h-3 w-3 rounded-sm shadow-neumorphic-soft"
                                  style={{ background: chartColors[i % chartColors.length] }}
                                />
                                <div className="flex flex-col gap-0">
                                  <span>{row.name}</span>
                                  <span className="text-[10px] text-muted-foreground">{accountTypeLabel(row.type)}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-1 pr-2 text-right tabular-nums" style={{ color: "var(--success)" }}>
                              {formatAmount(row.income)}
                            </td>
                            <td className="py-1 pr-2 text-right tabular-nums" style={{ color: "var(--destructive)" }}>
                              {formatAmount(row.expense)}
                            </td>
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
