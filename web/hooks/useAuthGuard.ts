"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabaseBrowser";

type AuthGuardStatus = "checking" | "authenticated" | "redirecting";

type UseAuthGuardOptions = {
  redirectTo?: string;
};

export function useAuthGuard(options: UseAuthGuardOptions = {}) {
  const { redirectTo = "/auth" } = options;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<AuthGuardStatus>("checking");

  const redirectTarget = useMemo(() => {
    if (!pathname) return undefined;
    const qs = searchParams?.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    let cancelled = false;

    const supabase = createSupabaseBrowser();

    const triggerRedirect = () => {
      if (cancelled) return;
      setStatus("redirecting");
      const shouldAttachRedirect =
        redirectTarget && !redirectTarget.startsWith(redirectTo);
      const destination = shouldAttachRedirect
        ? `${redirectTo}?redirect=${encodeURIComponent(redirectTarget)}`
        : redirectTo;
      router.replace(destination);
    };

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        if (data.session) {
          setStatus("authenticated");
        } else {
          triggerRedirect();
        }
      })
      .catch((error) => {
        console.warn("Failed to load session", error);
        triggerRedirect();
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (cancelled) return;
        if (session) {
          setStatus("authenticated");
        } else {
          triggerRedirect();
        }
      },
    );

    return () => {
      cancelled = true;
      listener?.subscription.unsubscribe();
    };
  }, [redirectTarget, redirectTo, router]);

  return {
    status,
    isAuthenticated: status === "authenticated",
    isChecking: status === "checking",
  } as const;
}
