// =============================================================
// 전역 상태 — 로그인 / 즐겨찾기 ID Set / 취향(prefs) / 초기 메시지
// 페이지 전환 시 보존되어야 하는 데이터 묶음.
// =============================================================
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthState, InitialState, ChatMessage, Preferences } from '@/types';
import { getInitialState } from '@/api/recipes';

interface AuthContextValue {
  auth: AuthState;
  initialMessages: ChatMessage[];
  preferences: Preferences;
  favoriteMongoIds: Set<string>;
  loading: boolean;

  setPreferences: (p: Preferences) => void;
  addFavoriteMongoId: (id: string) => void;
  removeFavoriteMongoId: (id: string) => void;
  setAuth: (a: AuthState) => void;
}

const DEFAULT_AUTH: AuthState = { isAuthenticated: false, username: '' };
const DEFAULT_PREFS: Preferences = {
  allergies: '없음',
  difficulty: '초보',
  cooking_time: '20분',
  saved_sauces: [],
};
const DEFAULT_GREETING: ChatMessage[] = [
  { role: 'bot', text: '안녕하세요! 🧅 냉장고 속 재료를 알려주시면 딱 맞는 레시피를 찾아드릴게요!' },
  { role: 'bot', text: '냉장고 문을 열고 재료를 직접 입력해보세요 👇' },
];

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(DEFAULT_AUTH);
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>(DEFAULT_GREETING);
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFS);
  const [favoriteMongoIds, setFavoriteMongoIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data: InitialState = await getInitialState();
        if (cancelled) return;
        setAuth(data.auth);
        setInitialMessages(data.messages?.length ? data.messages : DEFAULT_GREETING);
        setPreferences({
          allergies: data.preferences.allergies ?? '없음',
          difficulty: data.preferences.difficulty ?? '초보',
          cooking_time: data.preferences.cooking_time ?? '20분',
          saved_sauces: data.preferences.saved_sauces ?? [],
        });
        setFavoriteMongoIds(new Set(data.favorite_mongo_ids ?? []));
      } catch {
        // 백엔드에 /api/initial-state/ 가 아직 없을 수 있음 — 기본값으로 동작.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      auth,
      initialMessages,
      preferences,
      favoriteMongoIds,
      loading,
      setAuth,
      setPreferences,
      addFavoriteMongoId: (id) => {
        if (!id) return;
        setFavoriteMongoIds((prev) => {
          if (prev.has(id)) return prev;
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      },
      removeFavoriteMongoId: (id) => {
        if (!id) return;
        setFavoriteMongoIds((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      },
    }),
    [auth, initialMessages, preferences, favoriteMongoIds, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
