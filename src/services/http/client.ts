import { ApiError } from '@/types/api.types';
import { logger } from '@/lib/logger';
import { getAccessToken, clearSession } from '@/lib/session';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

async function request<T>(method: string, path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const token = getAccessToken();

  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> | undefined),
  };

  const response = await fetch(url, {
    method,
    headers,
    ...options,
  });

  if (!response.ok) {
    // The auth service returns `{ code, msg, data }`; FastAPI returns `{ detail }`.
    let errorBody: {
      code?: string | number;
      message?: string;
      msg?: string;
      detail?: unknown;
      details?: Record<string, string[]>;
    } = {};
    try {
      errorBody = await response.json();
    } catch {
      // non-JSON error body
    }

    let parsedMessage = errorBody.message ?? errorBody.msg;
    if (!parsedMessage && errorBody.detail) {
      if (typeof errorBody.detail === 'string') {
        parsedMessage = errorBody.detail;
      } else if (Array.isArray(errorBody.detail)) {
        parsedMessage = errorBody.detail
          .map((item: { msg?: string; loc?: string[] }) => item.msg || JSON.stringify(item))
          .join(', ');
      } else if (typeof errorBody.detail === 'object') {
        parsedMessage = JSON.stringify(errorBody.detail);
      }
    }

    const error = new ApiError(
      response.status,
      String(errorBody.code ?? response.status),
      parsedMessage ?? `HTTP ${response.status}`,
      errorBody.details
    );
    logger.error('API request failed', { url, status: response.status, code: error.code, message: error.message });

    if (response.status === 401 && typeof window !== 'undefined') {
      clearSession();
      if (!window.location.pathname.startsWith('/auth/')) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = `/auth/login?next=${next}&expired=1`;
      }
    }

    throw error;
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

export const httpClient = {
  get: <T>(path: string, options?: RequestInit) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestInit) => {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return request<T>('POST', path, {
      ...options,
      body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
  put: <T>(path: string, body?: unknown, options?: RequestInit) => {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return request<T>('PUT', path, {
      ...options,
      body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
  patch: <T>(path: string, body?: unknown, options?: RequestInit) => {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return request<T>('PATCH', path, {
      ...options,
      body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
  delete: <T>(path: string, options?: RequestInit) => request<T>('DELETE', path, options),
};
