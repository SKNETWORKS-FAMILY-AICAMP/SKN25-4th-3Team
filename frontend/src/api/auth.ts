// =============================================================
// 인증 API.
// 현재 Django 측은 form 기반이라 BACKEND_TODO.md 의 변경이 선행되어야 함.
// 이 모듈은 변경 후 호출할 JSON 엔드포인트 시그니처를 미리 정의.
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
