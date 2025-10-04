"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { useAuthGuard } from "@/hooks/useAuthGuard";

type RequireAuthProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

export default function RequireAuth(props: RequireAuthProps) {
  return (
    <Suspense fallback={<DefaultFallback fallback={props.fallback} />}>
      <RequireAuthBoundary {...props} />
    </Suspense>
  );
}

function RequireAuthBoundary({ children, fallback }: RequireAuthProps) {
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

function DefaultFallback({ fallback }: { fallback?: ReactNode }) {
  if (fallback) return <>{fallback}</>;
  return (
    <div className="flex min-h-[100dvh] items-center justify-center text-sm text-muted-foreground">
      読み込み中...
    </div>
  );
}
