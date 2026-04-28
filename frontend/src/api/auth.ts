// =============================================================
// 인증 API.
// Django accounts 엔드포인트가 JSON 요청이면 JSON 응답을 반환합니다.
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
  return apiFetch<{ ok: boolean; user: AuthState }>('/accounts/login/', {
    method: 'POST',
    body: payload,
  });
}

export function postSignup(payload: SignupPayload) {
  return apiFetch<{ ok: boolean; user: AuthState }>('/accounts/signup/', {
    method: 'POST',
    body: payload,
  });
}

export function postLogout() {
  return apiFetch<{ ok: boolean }>('/accounts/logout/', { method: 'POST' });
}
