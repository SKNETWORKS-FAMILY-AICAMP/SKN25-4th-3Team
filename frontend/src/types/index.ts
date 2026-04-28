// =============================================================
// 백엔드 API 응답 타입 정의
// Django views.py / models.py 의 직렬화 결과와 1:1 대응됩니다.
// =============================================================

export type RecipeSource = 'db' | 'web' | 'llm';
export type ChatSource = RecipeSource | 'bot' | 'no_ingredient';
export type Role = 'user' | 'bot';

export interface ChatMessage {
  role: Role;
  text: string;
  /** 봇 메시지일 때만 부여 — 후보 카드 렌더링용 */
  source?: ChatSource;
  candidates?: RecipeCandidate[];
}

export interface RecipeCandidate {
  mongo_recipe_id?: string;
  title: string;
  url?: string;
  ingredients_summary?: string;
}

export interface ChatRequestPayload {
  question: string;
  allergies: string;
  difficulty: string;
  cooking_time: string;
  /** 백엔드는 콤마 구분 문자열을 받음(views.py 참고) */
  saved_sauces: string;
  chat_history: { role: Role; text: string }[];
}

export interface ChatResponse {
  answer: string;
  source: ChatSource;
  candidates: RecipeCandidate[];
}

export interface PrefsResponse {
  ok: boolean;
  saved_sauces: string[];
}

export interface Favorite {
  id: number;
  mongo_recipe_id: string;
  title: string;
  url: string;
  ingredients_summary: string;
  answer_snippet: string;
  source: RecipeSource;
  created_at: string;
}

export interface FavoritesListResponse {
  favorites: Favorite[];
}

export interface FavoriteCreatePayload {
  mongo_recipe_id?: string;
  title: string;
  url?: string;
  ingredients_summary?: string;
  answer_snippet?: string;
  source: RecipeSource;
}

export interface FavoriteCreateResponse {
  ok: boolean;
  favorite: Favorite;
  duplicate?: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  username: string;
}

export interface InitialState {
  auth: AuthState;
  messages: ChatMessage[];
  preferences: {
    allergies: string;
    difficulty: string;
    cooking_time: string;
    saved_sauces: string[];
  };
  favorite_mongo_ids: string[];
}

export interface Preferences {
  allergies: string;
  difficulty: string;
  cooking_time: string;
  saved_sauces: string[];
}
