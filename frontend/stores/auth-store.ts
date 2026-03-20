/**
 * 认证状态管理 Store
 * - Access Token 存内存（防 XSS）
 * - Refresh Token 存 HttpOnly Cookie（由后端 Set-Cookie 设置）
 */

import { create } from "zustand";

const API_BASE = "";

interface AuthState {
  accessToken: string | null;
  adminAccessToken: string | null;
  isUserAuthenticated: boolean;
  isAdminAuthenticated: boolean;

  // 用户端
  loginUser: (email: string, password: string) => Promise<void>;
  registerUser: (email: string, password: string, name?: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  refreshUserToken: () => Promise<boolean>;

  // 管理员端
  loginAdmin: (email: string, password: string) => Promise<void>;
  logoutAdmin: () => Promise<void>;
  refreshAdminToken: () => Promise<boolean>;

  // OIDC
  loginWithOidc: (slug: string, role?: "user" | "admin") => void;
  handleOidcCallback: (token: string, type: "user" | "admin") => void;

  // 内部
  setAccessToken: (token: string) => void;
  setAdminAccessToken: (token: string) => void;
  clearTokens: () => void;
}

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    credentials: "include", // 发送 Cookie（Refresh Token）
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  return res;
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  adminAccessToken: null,
  isUserAuthenticated: false,
  isAdminAuthenticated: false,

  // ─────────────────────────────────────────────
  // 用户端
  // ─────────────────────────────────────────────

  loginUser: async (email, password) => {
    const res = await apiFetch(`${API_BASE}/api/v1/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "登录失败");
    }
    const data = await res.json();
    set({ accessToken: data.access_token, isUserAuthenticated: true });
  },

  registerUser: async (email, password, name) => {
    const res = await apiFetch(`${API_BASE}/api/v1/auth/register`, {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "注册失败");
    }
    const data = await res.json();
    set({ accessToken: data.access_token, isUserAuthenticated: true });
  },

  logoutUser: async () => {
    await apiFetch(`${API_BASE}/api/v1/auth/logout`, { method: "POST" });
    set({ accessToken: null, isUserAuthenticated: false });
  },

  refreshUserToken: async () => {
    const res = await apiFetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: "POST",
    });
    if (!res.ok) {
      set({ accessToken: null, isUserAuthenticated: false });
      return false;
    }
    const data = await res.json();
    set({ accessToken: data.access_token, isUserAuthenticated: true });
    return true;
  },

  // ─────────────────────────────────────────────
  // 管理员端
  // ─────────────────────────────────────────────

  loginAdmin: async (email, password) => {
    const res = await apiFetch(`${API_BASE}/api/v1/admin/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "登录失败");
    }
    const data = await res.json();
    set({ adminAccessToken: data.access_token, isAdminAuthenticated: true });
  },

  logoutAdmin: async () => {
    await apiFetch(`${API_BASE}/api/v1/admin/auth/logout`, { method: "POST" });
    set({ adminAccessToken: null, isAdminAuthenticated: false });
  },

  refreshAdminToken: async () => {
    const res = await apiFetch(`${API_BASE}/api/v1/admin/auth/refresh`, {
      method: "POST",
    });
    if (!res.ok) {
      set({ adminAccessToken: null, isAdminAuthenticated: false });
      return false;
    }
    const data = await res.json();
    set({ adminAccessToken: data.access_token, isAdminAuthenticated: true });
    return true;
  },

  // ─────────────────────────────────────────────
  // OIDC
  // ─────────────────────────────────────────────

  loginWithOidc: (slug, role = "user") => {
    window.location.href = `${API_BASE}/api/v1/auth/oidc/${slug}/authorize?role=${role}`;
  },

  handleOidcCallback: (token, type) => {
    if (type === "admin") {
      set({ adminAccessToken: token, isAdminAuthenticated: true });
    } else {
      set({ accessToken: token, isUserAuthenticated: true });
    }
  },

  // ─────────────────────────────────────────────
  // 内部
  // ─────────────────────────────────────────────

  setAccessToken: (token) => set({ accessToken: token, isUserAuthenticated: true }),
  setAdminAccessToken: (token) =>
    set({ adminAccessToken: token, isAdminAuthenticated: true }),
  clearTokens: () =>
    set({
      accessToken: null,
      adminAccessToken: null,
      isUserAuthenticated: false,
      isAdminAuthenticated: false,
    }),
}));
