"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";

interface AuthGuardProviderProps {
  children: React.ReactNode;
  role: "user" | "admin";
  loginPath: string;
}

export function AuthGuardProvider({
  children,
  role,
  loginPath,
}: AuthGuardProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAdminAuthenticated, isUserAuthenticated, refreshAdminToken, refreshUserToken } =
    useAuthStore();

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const isAuthenticated =
        role === "admin" ? isAdminAuthenticated : isUserAuthenticated;

      if (isAuthenticated) {
        if (!cancelled) setChecking(false);
        return;
      }

      // 尝试用 Refresh Token Cookie 刷新
      const refreshed =
        role === "admin" ? await refreshAdminToken() : await refreshUserToken();

      if (!cancelled) {
        if (refreshed) {
          setChecking(false);
        } else {
          router.replace(`${loginPath}?next=${encodeURIComponent(pathname)}`);
        }
      }
    };

    check();
    return () => {
      cancelled = true;
    };
    // 只在挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400 mx-auto" />
          <p className="text-sm text-zinc-500">验证身份中...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
