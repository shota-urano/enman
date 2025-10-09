"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import RequireAuth from "@/components/auth/RequireAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Select from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import AppHeader from "@/components/AppHeader";
import { createSupabaseBrowser } from "@/lib/supabaseBrowser";
import UserAvatar from "@/components/UserAvatar";
import { DEFAULT_PROFILE_NAME } from "@/lib/profile";

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsContent />
    </RequireAuth>
  );
}

type Member = {
  user_id: string;
  role: "owner" | "member";
  approved: boolean;
  joined_at: string | null;
  created_at: string;
  profile: {
    display_name: string;
    avatar_url: string | null;
  };
};

function SettingsContent() {
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  const [closingDay, setClosingDay] = useState<string>("31");
  const [loadingClosingDay, setLoadingClosingDay] = useState(true);
  const [savingClosingDay, setSavingClosingDay] = useState(false);
  const days = useMemo(() => Array.from({ length: 31 }).map((_, i) => String(i + 1)), []);

  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const { show } = useToast();

  const normalizeMember = useCallback(
    (raw: unknown): Member => {
      const data = raw as {
        user_id?: string;
        role?: string;
        approved?: boolean;
        joined_at?: string | null;
        created_at?: string;
        profile?: {
          display_name?: string;
          avatar_url?: string | null;
        };
      };
      return {
        user_id: String(data?.user_id ?? ""),
        role: data?.role === "owner" ? "owner" : "member",
        approved: Boolean(data?.approved),
        joined_at: data?.joined_at ?? null,
        created_at: data?.created_at ?? new Date().toISOString(),
        profile: {
          display_name: data?.profile?.display_name?.trim() ? data.profile.display_name.trim() : DEFAULT_PROFILE_NAME,
          avatar_url: data?.profile?.avatar_url ?? null,
        },
      };
    },
    [],
  );

  useEffect(() => {
    const loadMembers = async () => {
      setLoadingMembers(true);
      setMemberError(null);
      try {
        const res = await fetch("/api/households/members", { cache: "no-store" });
        if (!res.ok) throw new Error("メンバーの取得に失敗しました");
        const list = await res.json();
        const normalized: Member[] = Array.isArray(list) ? list.map(normalizeMember) : [];
        setMembers(normalized);
      } catch (e: unknown) {
        setMemberError(e instanceof Error ? e.message : "エラーが発生しました");
      } finally {
        setLoadingMembers(false);
      }
    };
    void loadMembers();
  }, [normalizeMember]);

  useEffect(() => {
    const loadClosingDay = async () => {
      try {
        setLoadingClosingDay(true);
        const res = await fetch("/api/households/closing-day", { cache: "no-store" });
        if (!res.ok) throw new Error("締め日の取得に失敗しました");
        const data = await res.json();
        if (typeof data?.closing_day === "number") {
          setClosingDay(String(data.closing_day));
        }
      } catch (err) {
        console.error(err);
        show("締め日の取得に失敗しました", "error");
      } finally {
        setLoadingClosingDay(false);
      }
    };

    void loadClosingDay();
  }, [show]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      show("ログアウトしました", "success");
      router.replace("/auth");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "ログアウトに失敗しました";
      show(message, "error");
    } finally {
      setSigningOut(false);
    }
  };

  const toggleApprove = async (userId: string, approved: boolean) => {
    try {
      const res = await fetch(`/api/households/members/${userId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved }),
      });
      if (!res.ok) throw new Error("更新に失敗しました");
      const updated = await res.json();
      const normalized = normalizeMember(updated);
      setMembers((prev) => prev.map((m) => (m.user_id === userId ? normalized : m)));
    } catch {
      alert("承認の更新に失敗しました");
    }
  };

  const createInvite = async () => {
    setLoadingInvite(true);
    try {
      const res = await fetch("/api/households/invite", { method: "POST" });
      if (!res.ok) throw new Error("招待コードの作成に失敗しました");
      const data = await res.json();
      setInviteToken(data?.token ?? null);
    } catch (e) {
      console.error(e);
      setInviteToken(null);
      alert("招待コードの発行に失敗しました");
    } finally {
      setLoadingInvite(false);
    }
  };

  const copyInvite = async () => {
    if (!inviteToken) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteToken);
        alert("招待コードをコピーしました");
      } else {
        const ta = document.createElement("textarea");
        ta.value = inviteToken;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        alert("招待コードをコピーしました");
      }
    } catch (e) {
      console.error(e);
      alert("コピーに失敗しました");
    }
  };

  const onSaveClosingDay = async () => {
    const day = Number(closingDay);
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      show("締め日は 1 日〜31 日の範囲で選択してください", "error");
      return;
    }

    setSavingClosingDay(true);
    try {
      const res = await fetch("/api/households/closing-day", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closing_day: day }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = body?.message ?? "締め日の保存に失敗しました";
        throw new Error(message);
      }
      const data = await res.json().catch(() => ({ closing_day: day }));
      if (typeof data?.closing_day === "number") {
        setClosingDay(String(data.closing_day));
      }
      show("締め日を保存しました", "success");
    } catch (err) {
      console.error(err);
      show(err instanceof Error ? err.message : "締め日の保存に失敗しました", "error");
    } finally {
      setSavingClosingDay(false);
    }
  };

  return (
    <main>
      <AppHeader title="設定" />
      <div className="container mx-auto max-w-5xl space-y-6 p-4 md:p-6">
        <Card className="space-y-4 p-4 md:p-6">
          <div>
            <h2 className="text-lg font-medium">アカウント設定</h2>
            <p className="text-sm text-muted-foreground">表示名やアイコンなど、個人のアカウント設定はこちらから。</p>
          </div>
          <div>
            <Link href="/settings/account">
              <Button>アカウント設定ページを開く</Button>
            </Link>
          </div>
        </Card>

        <Card className="space-y-4 p-4 md:p-6">
          <div>
            <h2 className="text-lg font-medium">家計簿の締め日</h2>
            <p className="text-sm text-muted-foreground">毎月の集計に使う締め日を選択してください。</p>
          </div>
          <div className="flex items-center gap-3">
            <Select
              className="w-full sm:w-24"
              value={closingDay}
              onChange={(v) => setClosingDay(v)}
              disabled={loadingClosingDay || savingClosingDay}
            >
              {days.map((d) => (
                <option key={d} value={d}>
                  {`${d}日`}
                </option>
              ))}
            </Select>
            <Button onClick={onSaveClosingDay} disabled={savingClosingDay || loadingClosingDay}>
              {savingClosingDay ? "保存中..." : "保存"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">保存すると家計簿の集計に反映されます。</p>
        </Card>

        <Card className="space-y-4 p-4 md:p-6">
          <div>
            <h2 className="text-lg font-medium">サブスク</h2>
            <p className="text-sm text-muted-foreground">定期支出の確認や管理はこちらから行えます。</p>
          </div>
          <div>
            <Link href="/subscriptions">
              <Button>サブスクを管理</Button>
            </Link>
          </div>
        </Card>

        <Card className="space-y-4 p-4 md:p-6">
          <div>
            <h2 className="text-lg font-medium">カテゴリ設定</h2>
            <p className="text-sm text-muted-foreground">カテゴリの追加や名称変更は専用ページでまとめて行えます。</p>
          </div>
          <div>
            <Link href="/settings/categories">
              <Button variant="secondary" className="h-9">
                カテゴリ管理ページを開く
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="space-y-4 p-4 md:p-6">
          <div>
            <h2 className="text-lg font-medium">招待コード</h2>
            <p className="text-sm text-muted-foreground">家族やメンバーを招待するときに利用してください。</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button onClick={createInvite} disabled={loadingInvite}>
              {loadingInvite ? "発行中..." : "招待コードを発行"}
            </Button>
            {inviteToken && <Input readOnly value={inviteToken} className="sm:w-64" />}
            {inviteToken && (
              <Button variant="secondary" onClick={copyInvite}>
                コピー
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">発行済みコードは一定時間で無効になります。</p>
        </Card>

        <Card className="space-y-4 p-4 md:p-6">
          <div>
            <h2 className="text-lg font-medium">メンバー承認</h2>
            <p className="text-sm text-muted-foreground">参加申請中のメンバーを承認または取り消しできます。</p>
          </div>
          {memberError && (
            <p className="text-sm text-red-600" role="alert">
              {memberError}
            </p>
          )}
          {loadingMembers ? (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">メンバーがいません</p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => {
                const name = m.profile.display_name || DEFAULT_PROFILE_NAME;
                return (
                  <div key={m.user_id} className="flex items-center justify-between rounded-xl border p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar name={name} imageUrl={m.profile.avatar_url ?? null} size="sm" />
                      <div className="min-w-0 space-y-0.5">
                        <div className="truncate text-sm font-medium">{name}</div>
                        <div className="text-xs text-muted-foreground">
                          {m.role === "owner" ? "オーナー" : "メンバー"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          "hidden text-xs sm:inline",
                          m.approved ? "text-emerald-600" : "text-muted-foreground",
                        )}
                      >
                        {m.approved ? "承認済み" : "未承認"}
                      </span>
                      <Button
                        variant={m.approved ? "secondary" : "default"}
                        onClick={() => toggleApprove(m.user_id, !m.approved)}
                        className="h-8"
                      >
                        {m.approved ? "承認を取り消す" : "承認する"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground">オーナーのみ操作できます。</p>
        </Card>

        <Card className="space-y-4 p-4 md:p-6">
          <div>
            <h2 className="text-lg font-medium">アカウント操作</h2>
            <p className="text-sm text-muted-foreground">別のアカウントを利用する場合はログアウトしてください。</p>
          </div>
          <Button variant="secondary" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? "ログアウト中..." : "ログアウト"}
          </Button>
        </Card>
      </div>
    </main>
  );
}
