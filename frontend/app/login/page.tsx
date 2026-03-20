"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const { loginUser, registerUser, loginWithOidc } = useAuthStore();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [oidcProviders, setOidcProviders] = useState<
    Array<{ id: string; slug: string; name: string; target_role: string }>
  >([]);
  const [oidcLoaded, setOidcLoaded] = useState(false);

  const loadOidcProviders = async () => {
    if (oidcLoaded) return;
    try {
      const res = await fetch("/api/v1/auth/oidc/providers");
      if (res.ok) {
        const data = await res.json();
        setOidcProviders(
          data.filter(
            (p: { target_role: string }) =>
              p.target_role === "user" || p.target_role === "both"
          )
        );
      }
    } catch {
      // 忽略
    } finally {
      setOidcLoaded(true);
    }
  };

  useState(() => {
    loadOidcProviders();
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        await loginUser(email, password);
      } else {
        await registerUser(email, password, name || undefined);
      }
      router.replace("/chat");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">
          {mode === "login" ? "登录" : "注册"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                昵称（可选）
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="你的昵称"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              邮箱
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
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
              placeholder="至少 8 位"
              minLength={8}
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
            {loading ? "处理中..." : mode === "login" ? "登录" : "注册"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            {mode === "login" ? "没有账号？点击注册" : "已有账号？点击登录"}
          </button>
        </div>

        {oidcProviders.length > 0 && (
          <>
            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-sm text-gray-500">或使用第三方登录</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="space-y-2">
              {oidcProviders.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => loginWithOidc(p.slug, "user")}
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
