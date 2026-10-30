import type { ApiResponse, ApiError } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
const TOKEN_KEY = 'novapay_session_token';

// In-memory token cache fallback
let inMemoryToken: string | null = null;

export const tokenStorage = {
  get(): string | null {
    if (inMemoryToken) return inMemoryToken;
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    inMemoryToken = token;
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Storage unavailable or quota exceeded
    }
  },
  clear(): void {
    inMemoryToken = null;
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // Storage unavailable
    }
  },
};

type AuthExpiredListener = () => void;
const authExpiredListeners: Set<AuthExpiredListener> = new Set();

export const onAuthExpired = (listener: AuthExpiredListener) => {
  authExpiredListeners.add(listener);
  return () => authExpiredListeners.delete(listener);
};

const notifyAuthExpired = () => {
  tokenStorage.clear();
  authExpiredListeners.forEach((listener) => listener());
};

interface RequestOptions {
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
}

export class CustomApiError extends Error implements ApiError {
  status: number;
  isConflict: boolean;
  isInsufficientBalance: boolean;
  isUnauthorized: boolean;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'CustomApiError';
    this.status = status;
    this.isConflict = status === 409;
    this.isUnauthorized = status === 401;
    this.isInsufficientBalance =
      status === 400 && message.toLowerCase().includes('không đủ');
  }
}

export async function apiClient<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  options: RequestOptions = {}
): Promise<T> {
  const url = `${BASE_URL.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
  const token = tokenStorage.get();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let bodyStr: string | undefined;
  if (options.body !== undefined) {
    bodyStr = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: bodyStr,
      signal: options.signal,
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      notifyAuthExpired();
      let msg = 'Phiên làm việc đã hết hạn hoặc chưa đăng nhập.';
      try {
        const errJson = await response.json();
        if (errJson?.message) msg = errJson.message;
      } catch {
        // use default message
      }
      throw new CustomApiError(401, msg);
    }

    let responseData: ApiResponse<T>;
    try {
      responseData = await response.json();
    } catch {
      throw new CustomApiError(
        response.status,
        `Máy chủ phản hồi với mã lỗi ${response.status}`
      );
    }

    if (!response.ok) {
      let errorMessage =
        responseData?.message ||
        `Yêu cầu không thành công (mã trạng thái ${response.status})`;

      // Graceful parsing: Nếu backend ném Zod error dạng chuỗi JSON thô
      if (typeof errorMessage === 'string' && (errorMessage.startsWith('[') || errorMessage.startsWith('{'))) {
        try {
          const parsed = JSON.parse(errorMessage);
          if (Array.isArray(parsed) && parsed[0]?.message) {
            errorMessage = parsed.map((p: { message: string }) => p.message).join('. ');
          }
        } catch {
          // Giữ nguyên errorMessage nếu không phải JSON
        }
      }

      throw new CustomApiError(response.status, errorMessage);
    }

    // Backend responds with { success: true, data: ... } or { success: true, message: ... }
    return (responseData.data !== undefined ? responseData.data : responseData) as T;
  } catch (error) {
    if (error instanceof CustomApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }

    // Network error or unexpected rejection
    throw new CustomApiError(
      0,
      'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền mạng hoặc backend server.'
    );
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiClient<T>(endpoint, 'GET', options),
  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiClient<T>(endpoint, 'POST', { ...options, body }),
};
