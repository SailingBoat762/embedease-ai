"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/client";

interface OIDCProvider {
  id: string;
  name: string;
  slug: string;
  client_id: string;
  issuer_url: string | null;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string | null;
  scopes: string;
  target_role: string;
  is_enabled: boolean;
}

const emptyForm = (): Partial<OIDCProvider> & { client_secret?: string } => ({
  name: "",
  slug: "",
  client_id: "",
  client_secret: "",
  issuer_url: "",
  authorization_endpoint: "",
  token_endpoint: "",
  userinfo_endpoint: "",
  scopes: "openid email profile",
  target_role: "user",
  is_enabled: true,
});

export default function OIDCSettingsPage() {
  const [providers, setProviders] = useState<OIDCProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<OIDCProvider[]>("/api/v1/admin/oidc-providers");
      setProviders(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(true);
    setError("");
  };

  const openEdit = (p: OIDCProvider) => {
    setForm({ ...p, client_secret: "" });
    setEditingId(p.id);
    setShowForm(true);
    setError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = { ...form };
      if (editingId) {
        // 更新时，若 client_secret 为空则不传
        if (!body.client_secret) delete body.client_secret;
        await apiRequest(`/api/v1/admin/oidc-providers/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } else {
        await apiRequest("/api/v1/admin/oidc-providers", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      setShowForm(false);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确认删除此 Provider？")) return;
    try {
      await apiRequest(`/api/v1/admin/oidc-providers/${id}`, { method: "DELETE" });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "删除失败");
    }
  };

  const handleToggle = async (p: OIDCProvider) => {
    try {
      await apiRequest(`/api/v1/admin/oidc-providers/${p.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_enabled: !p.is_enabled }),
      });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "操作失败");
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">OIDC / SSO 配置</h1>
          <p className="text-sm text-gray-500 mt-1">
            配置第三方身份提供商，支持 OAuth2 / OIDC 协议
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 新增 Provider
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">加载中...</p>
      ) : providers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>暂无 OIDC Provider</p>
          <p className="text-sm mt-1">点击「新增 Provider」开始配置</p>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{p.name}</span>
                  <span className="text-xs text-gray-400 font-mono">{p.slug}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      p.target_role === "admin"
                        ? "bg-purple-100 text-purple-700"
                        : p.target_role === "both"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {p.target_role === "both" ? "全部" : p.target_role === "admin" ? "管理员" : "用户"}
                  </span>
                  {!p.is_enabled && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      已禁用
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1 truncate">{p.authorization_endpoint}</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleToggle(p)}
                  className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1 rounded-lg"
                >
                  {p.is_enabled ? "禁用" : "启用"}
                </button>
                <button
                  onClick={() => openEdit(p)}
                  className="text-xs text-blue-600 hover:text-blue-700 border border-blue-200 px-3 py-1 rounded-lg"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-xs text-red-500 hover:text-red-600 border border-red-200 px-3 py-1 rounded-lg"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? "编辑 OIDC Provider" : "新增 OIDC Provider"}
            </h2>
            <form onSubmit={handleSave} className="space-y-3">
              {[
                { key: "name", label: "显示名称", placeholder: "GitHub", required: true },
                {
                  key: "slug",
                  label: "Slug（URL标识）",
                  placeholder: "github",
                  required: !editingId,
                },
                { key: "client_id", label: "Client ID", required: true },
                {
                  key: "client_secret",
                  label: editingId ? "Client Secret（留空不修改）" : "Client Secret",
                  required: !editingId,
                  type: "password",
                },
                { key: "issuer_url", label: "Issuer URL（可选）", placeholder: "https://..." },
                {
                  key: "authorization_endpoint",
                  label: "授权端点",
                  placeholder: "https://.../oauth/authorize",
                  required: true,
                },
                {
                  key: "token_endpoint",
                  label: "Token 端点",
                  placeholder: "https://.../oauth/token",
                  required: true,
                },
                {
                  key: "userinfo_endpoint",
                  label: "UserInfo 端点（可选）",
                  placeholder: "https://.../api/user",
                },
                {
                  key: "scopes",
                  label: "Scopes",
                  placeholder: "openid email profile",
                  required: true,
                },
              ].map(({ key, label, placeholder, required, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type={type || "text"}
                    required={required}
                    value={(form as Record<string, string>)[key] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">适用角色</label>
                <select
                  value={form.target_role}
                  onChange={(e) => setForm((f) => ({ ...f, target_role: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">仅用户</option>
                  <option value="admin">仅管理员</option>
                  <option value="both">全部</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_enabled"
                  checked={form.is_enabled ?? true}
                  onChange={(e) => setForm((f) => ({ ...f, is_enabled: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="is_enabled" className="text-sm text-gray-700">
                  启用此 Provider
                </label>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
