// =============================================================
// 공용 fetch 래퍼.
// - 모든 요청에 X-CSRFToken 자동 주입(있으면)
// - JSON 직렬화 / 응답 파싱
// - 401/403 시 통일된 에러 throw
// =============================================================
import { getCsrfToken } from '@/utils/csrf';

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

export async function apiFetch<T = unknown>(
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  const csrf = getCsrfToken();
  if (csrf) finalHeaders['X-CSRFToken'] = csrf;

  let finalBody: BodyInit | undefined;
  if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    finalBody = JSON.stringify(body);
  }

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body: finalBody,
    // 세션 쿠키를 항상 동봉 — Django session 인증 유지
    credentials: 'same-origin',
  });

  // 응답 파싱(빈 응답 허용)
  const text = await res.text();
  let payload: unknown = undefined;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const message =
      (payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : null) ?? `HTTP ${res.status}`;
    throw new ApiError(res.status, message, payload);
  }

  return payload as T;
}
