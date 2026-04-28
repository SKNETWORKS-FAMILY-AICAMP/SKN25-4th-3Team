import { apiFetch } from './client';
import type {
  FavoritesListResponse,
  FavoriteCreatePayload,
  FavoriteCreateResponse,
} from '@/types';

export function listFavorites() {
  return apiFetch<FavoritesListResponse>('/api/favorites/');
}

export function createFavorite(payload: FavoriteCreatePayload) {
  return apiFetch<FavoriteCreateResponse>('/api/favorites/', {
    method: 'POST',
    body: payload,
  });
}

export function deleteFavorite(id: number) {
  return apiFetch<{ ok: boolean }>(`/api/favorites/${id}/`, { method: 'DELETE' });
}
