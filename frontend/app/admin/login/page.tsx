"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export default function AdminLoginPage() {
  const router = useRouter();
  const { loginAdmin, loginWithOidc, isAdminAuthenticated } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oidcProviders, setOidcProviders] = useState<
    Array<{ id: string; slug: string; name: string; target_role: string }>
  >([]);

  useEffect(() => {
    if (isAdminAuthenticated) {
      router.replace("/admin");
    }
  }, [isAdminAuthenticated, router]);

  useEffect(() => {
    fetch("/api/v1/auth/oidc/providers")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Array<{ target_role: string; id: string; slug: string; name: string }>) =>
        setOidcProviders(
          data.filter(
            (p) => p.target_role === "admin" || p.target_role === "both"
          )
        )
      )
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginAdmin(email, password);
      router.replace("/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          管理后台
        </h1>
        <p className="text-sm text-center text-gray-500 mb-6">请使用管理员账号登录</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              邮箱
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              密码
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>

        {oidcProviders.length > 0 && (
          <>
            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-sm text-gray-500">或使用 SSO 登录</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="space-y-2">
              {oidcProviders.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => loginWithOidc(p.slug, "admin")}
                  className="w-full py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  使用 {p.name} 登录
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
