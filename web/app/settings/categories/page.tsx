"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RequireAuth from "@/components/auth/RequireAuth";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Select from "@/components/ui/select";

type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
  sort_order: number | null;
};

export default function CategoriesPage() {
  return (
    <RequireAuth>
      <CategoriesContent />
    </RequireAuth>
  );
}

function CategoriesContent() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<"income" | "expense">("expense");
  const [searchTerm, setSearchTerm] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", { cache: "no-store" });
      if (!res.ok) throw new Error("カテゴリの取得に失敗しました");
      setCategories(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "不明なエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const createCategory = async () => {
    if (!catName.trim()) return;
    const payload = { name: catName.trim(), type: catType };
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      alert("カテゴリ追加に失敗しました");
      return;
    }
    setCatName("");
    await refresh();
  };

  const updateCategoryName = async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (!res.ok) {
      alert("カテゴリ更新に失敗しました");
      await refresh();
      return;
    }
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name: trimmed } : c)));
  };

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((a, b) => {
        const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name, "ja");
      }),
    [categories]
  );

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return sortedCategories;
    const term = searchTerm.trim().toLowerCase();
    return sortedCategories.filter((c) => c.name.toLowerCase().includes(term));
  }, [searchTerm, sortedCategories]);

  return (
    <main>
      <AppHeader
        title="カテゴリ管理"
        right={
          <Link href="/settings">
            <Button variant="secondary" className="h-9">
              設定に戻る
            </Button>
          </Link>
        }
      />
      <div className="container mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        <Card className="space-y-4 p-4 md:p-6">
          <div>
            <h2 className="text-lg font-medium">新規カテゴリの登録</h2>
            <p className="text-sm text-muted-foreground">よく使うカテゴリをあらかじめ登録しておくと便利です。</p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">カテゴリ名</label>
              <Input placeholder="例: 食費" value={catName} onChange={(e) => setCatName(e.target.value)} />
            </div>
            <div className="space-y-1 md:w-40">
              <label className="text-xs text-muted-foreground">種別</label>
              <Select value={catType} onChange={(v) => setCatType(v as "income" | "expense")}>
                <option value="expense">支出</option>
                <option value="income">収入</option>
              </Select>
            </div>
            <Button onClick={createCategory} disabled={!catName.trim()}>
              追加
            </Button>
          </div>
        </Card>

        <Card className="space-y-4 p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-medium">登録済みカテゴリ</h2>
              <p className="text-sm text-muted-foreground">名称は一覧から直接編集できます。</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                placeholder="カテゴリ名で検索"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="sm:w-56"
              />
              <Button variant="ghost" onClick={refresh} disabled={loading}>
                再読込
              </Button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <div className="overflow-x-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground">読み込み中...</p>
            ) : filteredCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">該当するカテゴリがありません</p>
            ) : (
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-2 py-2 text-left font-medium">カテゴリ名</th>
                    <th className="px-2 py-2 text-left font-medium">種別</th>
                    <th className="px-2 py-2 text-left font-medium">並び順</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredCategories.map((category) => (
                    <tr key={category.id} className="align-middle">
                      <td className="px-2 py-2">
                        <Input
                          defaultValue={category.name}
                          onBlur={(e) => updateCategoryName(category.id, e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-2">
                        {category.type === "expense" ? "支出" : "収入"}
                      </td>
                      <td className="px-2 py-2 text-sm text-muted-foreground">
                        {category.sort_order ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
