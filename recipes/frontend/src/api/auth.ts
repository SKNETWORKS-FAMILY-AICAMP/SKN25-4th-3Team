// =============================================================
// 인증 API.
// 모든 백엔드 API는 React 화면 라우트와 충돌하지 않도록 /api 아래에 둡니다.
// =============================================================
import { apiFetch } from './client';
import type { AuthState } from '@/types';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface SignupPayload {
  username: string;
  password1: string;
  password2: string;
}

export function postLogin(payload: LoginPayload) {
  return apiFetch<{ ok: boolean; user: AuthState }>('/api/auth/login/', {
    method: 'POST',
    body: payload,
  });
}

export function postSignup(payload: SignupPayload) {
  return apiFetch<{ ok: boolean; user: AuthState }>('/api/auth/signup/', {
    method: 'POST',
    body: payload,
  });
}

export function postLogout() {
  return apiFetch<{ ok: boolean }>('/api/auth/logout/', { method: 'POST' });
}
