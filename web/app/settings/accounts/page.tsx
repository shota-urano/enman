"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RequireAuth from "@/components/auth/RequireAuth";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Account = {
  id: string;
  name: string;
  sort_order: number | null;
};

export default function AccountsPage() {
  return (
    <RequireAuth>
      <AccountsContent />
    </RequireAuth>
  );
}

function AccountsContent() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/accounts", { cache: "no-store" });
      if (!res.ok) throw new Error("アカウントの取得に失敗しました");
      setAccounts(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "不明なエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const createAccount = async () => {
    if (!name.trim()) return;
    const payload = { name: name.trim(), type: "cash" as const };
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      alert("アカウント追加に失敗しました");
      return;
    }
    setName("");
    await refresh();
  };

  const updateAccountName = async (id: string, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const res = await fetch(`/api/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (!res.ok) {
      alert("アカウント更新に失敗しました");
      await refresh();
      return;
    }
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, name: trimmed } : a)));
  };

  const sortedAccounts = useMemo(
    () =>
      [...accounts].sort((a, b) => {
        const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name, "ja");
      }),
    [accounts]
  );

  const filteredAccounts = useMemo(() => {
    if (!searchTerm.trim()) return sortedAccounts;
    const term = searchTerm.trim().toLowerCase();
    return sortedAccounts.filter((account) => account.name.toLowerCase().includes(term));
  }, [searchTerm, sortedAccounts]);

  return (
    <main>
      <AppHeader
        title="アカウント管理"
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
            <h2 className="text-lg font-medium">新規アカウントの登録</h2>
            <p className="text-sm text-muted-foreground">財布や口座など、日常で使うアカウントを登録します。</p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">アカウント名</label>
              <Input placeholder="例: 現金" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button onClick={createAccount} disabled={!name.trim()}>
              追加
            </Button>
          </div>
        </Card>

        <Card className="space-y-4 p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-medium">登録済みアカウント</h2>
              <p className="text-sm text-muted-foreground">名称は一覧から直接編集できます。</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                placeholder="アカウント名で検索"
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
            ) : filteredAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">該当するアカウントがありません</p>
            ) : (
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-2 py-2 text-left font-medium">アカウント名</th>
                    <th className="px-2 py-2 text-left font-medium">並び順</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredAccounts.map((account) => (
                    <tr key={account.id} className="align-middle">
                      <td className="px-2 py-2">
                        <Input
                          defaultValue={account.name}
                          onBlur={(e) => updateAccountName(account.id, e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-2 text-sm text-muted-foreground">
                        {account.sort_order ?? "-"}
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
