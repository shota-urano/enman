"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "@/components/auth/RequireAuth";
import AppHeader from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";
import { useToast } from "@/components/ui/toast";
import { createSupabaseBrowser } from "@/lib/supabaseBrowser";
import { DEFAULT_PROFILE_NAME } from "@/lib/profile";
import { Camera } from "lucide-react";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function AccountSettingsPage() {
  return (
    <RequireAuth>
      <AccountSettingsContent />
    </RequireAuth>
  );
}

type ProfileResponse = {
  display_name: string;
  avatar_url: string | null;
  avatar_path?: string | null;
};

function AccountSettingsContent() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [passwordForm, setPasswordForm] = useState({ newPassword: "", confirmPassword: "" });
  const [savingPassword, setSavingPassword] = useState(false);

  const router = useRouter();
  const { show } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (!res.ok) throw new Error("プロフィールの取得に失敗しました");
        const data = (await res.json()) as ProfileResponse;
        const name = data.display_name?.trim() ? data.display_name.trim() : DEFAULT_PROFILE_NAME;
        setProfile({ ...data, display_name: name });
        setDisplayName(name);
      } catch (err) {
        console.error(err);
        show("プロフィールの取得に失敗しました", "error");
      }
    };
    void fetchProfile();
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const currentName = useMemo(() => profile?.display_name ?? DEFAULT_PROFILE_NAME, [profile?.display_name]);
  const currentAvatarUrl = previewUrl ?? profile?.avatar_url ?? null;

  const handleNameSave = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      show("表示名を入力してください", "error");
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: trimmed }),
      });
      if (!res.ok) throw new Error("プロフィールの更新に失敗しました");
      const data = (await res.json()) as ProfileResponse;
      setProfile({ ...data, display_name: data.display_name?.trim() || DEFAULT_PROFILE_NAME });
      show("表示名を更新しました", "success");
    } catch (err) {
      console.error(err);
      show("プロフィールの更新に失敗しました", "error");
    } finally {
      setSavingName(false);
    }
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      show(`画像サイズは ${MAX_FILE_SIZE_MB}MB 以下にしてください`, "error");
      event.target.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      show("画像ファイルを選択してください", "error");
      event.target.value = "";
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const nextPreview = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(nextPreview);
    void handleAvatarUpload(file);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body,
      });
      if (!res.ok) throw new Error("画像のアップロードに失敗しました");
      const data = (await res.json()) as { avatar_url: string | null; avatar_path?: string | null };
      setProfile((prev) =>
        prev
          ? { ...prev, avatar_url: data.avatar_url ?? null, avatar_path: data.avatar_path ?? prev.avatar_path ?? null }
          : { display_name: displayName.trim() || DEFAULT_PROFILE_NAME, avatar_url: data.avatar_url ?? null, avatar_path: data.avatar_path ?? null },
      );
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
      show("アイコンを更新しました", "success");
    } catch (err) {
      console.error(err);
      show(err instanceof Error ? err.message : "画像のアップロードに失敗しました", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarRemove = async () => {
    setUploading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_path: null }),
      });
      if (!res.ok) throw new Error("アイコンの削除に失敗しました");
      const data = (await res.json()) as ProfileResponse;
      setProfile({ ...data, display_name: data.display_name?.trim() || DEFAULT_PROFILE_NAME, avatar_url: data.avatar_url ?? null });
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
      show("アイコンを削除しました", "success");
    } catch (err) {
      console.error(err);
      show("アイコンの削除に失敗しました", "error");
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!passwordForm.newPassword.trim() || !passwordForm.confirmPassword.trim()) {
      show("新しいパスワードを入力してください", "error");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      show("パスワードが一致しません", "error");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      show("パスワードは6文字以上で入力してください", "error");
      return;
    }

    setSavingPassword(true);
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
      if (error) throw error;
      setPasswordForm({ newPassword: "", confirmPassword: "" });
      show("パスワードを更新しました", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "パスワードの更新に失敗しました";
      show(message, "error");
    } finally {
      setSavingPassword(false);
    }
  };

  const isNameDirty = displayName.trim() !== currentName;

  return (
    <main>
      <AppHeader
        title="アカウント設定"
        left={
          <Button variant="ghost" className="h-9 px-3" onClick={() => router.push("/settings") }>
            設定に戻る
          </Button>
        }
      />
      <div className="container mx-auto max-w-3xl space-y-6 p-4 md:p-6">
        <Card className="space-y-4 p-4 md:p-6">
          <div>
            <h2 className="text-lg font-medium">プロフィール</h2>
            <p className="text-sm text-muted-foreground">世帯メンバーに表示される名前とアイコンを変更できます。</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={triggerFileSelect}
                  className="relative inline-flex items-center justify-center transition hover:opacity-90"
                  aria-label="アイコンを変更"
                  disabled={uploading}
                >
                  <UserAvatar
                    name={displayName || DEFAULT_PROFILE_NAME}
                    imageUrl={currentAvatarUrl}
                    size="lg"
                    className="pointer-events-none"
                  />
                  <span
                    className="absolute bottom-0 right-0 flex h-8 w-8 translate-x-1/4 translate-y-1/4 items-center justify-center rounded-full bg-black text-white shadow ring-2 ring-white/90"
                    aria-hidden
                  >
                    <Camera className="h-4 w-4" />
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />

                <div className="flex-1 space-y-2">
                  <label className="text-xs text-muted-foreground">表示名</label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={64}
                    placeholder="あなたの名前"
                    disabled={savingName || profile === null}
                  />
                </div>
              </div>

              <div className="text-xs text-muted-foreground">未設定の場合は「{DEFAULT_PROFILE_NAME}」として表示されます。</div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleNameSave} disabled={!isNameDirty || savingName || profile === null}>
                  {savingName ? "保存中..." : "表示名を保存"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAvatarRemove}
                  disabled={uploading || (!profile?.avatar_url && !previewUrl)}
                >
                  アイコンを削除
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">推奨: 正方形 / {MAX_FILE_SIZE_MB}MB 以下の PNG・JPEG・WEBP・GIF</p>
            </div>
          </div>
        </Card>

        <Card className="space-y-4 p-4 md:p-6">
          <div>
            <h2 className="text-lg font-medium">パスワード</h2>
            <p className="text-sm text-muted-foreground">セキュリティ向上のため定期的な更新をおすすめします。</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">新しいパスワード</label>
              <Input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
                autoComplete="new-password"
                disabled={savingPassword}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">新しいパスワード（確認）</label>
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                autoComplete="new-password"
                disabled={savingPassword}
              />
            </div>
            <Button onClick={handlePasswordSave} disabled={savingPassword}>
              {savingPassword ? "更新中..." : "パスワードを更新"}
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
