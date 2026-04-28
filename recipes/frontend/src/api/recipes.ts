// =============================================================
// 챗 / 취향 / 리셋 API
// =============================================================
import { apiFetch } from './client';
import type {
  ChatRequestPayload,
  ChatResponse,
  PrefsResponse,
  InitialState,
  Preferences,
} from '@/types';

export function postChat(payload: ChatRequestPayload) {
  return apiFetch<ChatResponse>('/api/chat/', { method: 'POST', body: payload });
}

export function postPrefs(payload: Partial<Preferences>) {
  return apiFetch<PrefsResponse>('/api/prefs/', { method: 'POST', body: payload });
}

export function postReset() {
  return apiFetch<{ ok: boolean }>('/api/reset/', { method: 'POST' });
}

// SPA 부팅 시 초기 상태(messages/prefs/auth/favorites)를 한 번에 가져옴.
export function getInitialState() {
  return apiFetch<InitialState>('/api/initial-state/');
}
