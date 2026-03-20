// HTTP 客户端（带 JWT 自动注入 + 401 自动刷新）

import { ApiError, type ApiErrorPayload } from "@/lib/errors";

// 默认使用同源（交给 Next rewrites 代理到后端），这样通过局域网访问前端时不会把 localhost 指向"访问设备自身"
// 如需直连后端（例如生产环境），可设置 NEXT_PUBLIC_API_URL="https://api.example.com"
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * 获取当前 Access Token（从 auth-store 内存中读取，避免循环依赖使用动态 import）
 */
function getAccessToken(): string | null {
  try {
    // 动态读取，避免模块循环依赖
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useAuthStore } = require("@/stores/auth-store");
    const state = useAuthStore.getState();
    return state.accessToken;
  } catch {
    return null;
  }
}

function getAdminAccessToken(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useAuthStore } = require("@/stores/auth-store");
    const state = useAuthStore.getState();
    return state.adminAccessToken;
  } catch {
    return null;
  }
}

/**
 * 解析错误响应
 */
async function parseErrorResponse(response: Response): Promise<ApiError> {
  const status = response.status;

  try {
    const json = await response.json();

    // 后端统一格式: { error: { code, message, data, timestamp } }
    if (json.error && typeof json.error === "object") {
      return new ApiError(status, json.error as ApiErrorPayload);
    }

    // FastAPI 默认格式: { detail: "..." }
    if (json.detail) {
      const message = typeof json.detail === "string" ? json.detail : JSON.stringify(json.detail);
      return new ApiError(status, {
        code: `http_${status}`,
        message,
      });
    }

    // 其他 JSON 格式
    return new ApiError(status, {
      code: `http_${status}`,
      message: JSON.stringify(json),
    });
  } catch {
    // 非 JSON 响应
    const text = await response.text().catch(() => "");
    return new ApiError(status, {
      code: `http_${status}`,
      message: text || `HTTP ${status}`,
    });
  }
}

/**
 * 判断是否为管理员 API 路径
 */
function isAdminEndpoint(endpoint: string): boolean {
  return endpoint.startsWith("/api/v1/admin");
}

/**
 * 构建带 Authorization header 的请求 headers
 */
function buildHeaders(endpoint: string, extra?: HeadersInit): HeadersInit {
  const token = isAdminEndpoint(endpoint) ? getAdminAccessToken() : getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra as Record<string, string>),
  };
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: buildHeaders(endpoint, options.headers),
  });

  // 401 时尝试刷新 Token 并重试一次
  if (response.status === 401) {
    let refreshed = false;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useAuthStore } = require("@/stores/auth-store");
      const store = useAuthStore.getState();
      if (isAdminEndpoint(endpoint)) {
        refreshed = await store.refreshAdminToken();
      } else {
        refreshed = await store.refreshUserToken();
      }
    } catch {
      refreshed = false;
    }

    if (refreshed) {
      // 用新 Token 重试
      const retryResponse = await fetch(url, {
        ...options,
        credentials: "include",
        headers: buildHeaders(endpoint, options.headers),
      });
      if (!retryResponse.ok) {
        throw await parseErrorResponse(retryResponse);
      }
      if (retryResponse.status === 204) {
        return undefined as T;
      }
      return retryResponse.json();
    }
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  // 处理 204 No Content 响应
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
