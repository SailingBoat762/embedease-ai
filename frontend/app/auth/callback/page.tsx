"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export default function OidcCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleOidcCallback } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get("token");
    const type = searchParams.get("type") as "user" | "admin" | null;
    const next = searchParams.get("next") || "/chat";
    const error = searchParams.get("error");

    if (error) {
      const dest = type === "admin" ? "/admin/login" : "/login";
      router.replace(`${dest}?error=${encodeURIComponent(error)}`);
      return;
    }

    if (!token || !type) {
      router.replace("/login?error=missing_token");
      return;
    }

    handleOidcCallback(token, type);

    // 清除 URL 参数后跳转（防止 Referrer 泄漏 token）
    window.history.replaceState({}, "", "/auth/callback");
    router.replace(next);
  }, [searchParams, handleOidcCallback, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">正在登录，请稍候...</p>
      </div>
    </div>
  );
}
