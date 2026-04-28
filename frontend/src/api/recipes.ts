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

// 신규 — SPA 부팅 시 초기 상태(messages/prefs/auth/favorites)를 한 번에 가져옴.
// 백엔드는 BACKEND_TODO.md 참고: 현재는 GET / 의 템플릿 컨텍스트로 주입되고 있어
// /api/initial-state/ 엔드포인트 추가가 필요함.
export function getInitialState() {
  return apiFetch<InitialState>('/api/initial-state/');
}
