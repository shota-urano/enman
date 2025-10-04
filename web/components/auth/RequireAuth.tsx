"use client";

import type { ReactNode } from "react";
import { useAuthGuard } from "@/hooks/useAuthGuard";

type RequireAuthProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

export default function RequireAuth({ children, fallback }: RequireAuthProps) {
  const { status } = useAuthGuard();

  if (status === "authenticated") {
    return <>{children}</>;
  }

  if (status === "checking") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-sm text-muted-foreground">
        {fallback ?? "読み込み中..."}
      </div>
    );
  }

  // Redirecting state - render nothing to avoid flashes.
  return null;
}
