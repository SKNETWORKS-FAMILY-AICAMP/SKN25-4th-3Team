import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listFavorites, deleteFavorite } from '@/api/favorites';
import { useAuth } from '@/context/AuthContext';
import type { Favorite } from '@/types';

const SOURCE_LABEL: Record<Favorite['source'], string> = {
  db: 'DB',
  web: '웹 검색',
  llm: 'LLM 추정',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { auth, removeFavoriteMongoId } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      navigate('/accounts/login');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await listFavorites();
        if (!cancelled) setFavorites(res.favorites);
      } catch {
        // ignore — 빈 목록 표시
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.isAuthenticated, navigate]);

  const handleDelete = async (fav: Favorite) => {
    if (!confirm('저장을 취소하시겠어요?')) return;
    try {
      await deleteFavorite(fav.id);
      setFavorites((prev) => prev.filter((f) => f.id !== fav.id));
      if (fav.mongo_recipe_id) {
        removeFavoriteMongoId(fav.mongo_recipe_id);
      }
    } catch (e) {
      alert('삭제 실패: ' + (e as Error).message);
    }
  };

  return (
    <div className="fav-wrap">
      <div className="fav-head">
        <Link to="/" className="fav-back">
          ← 냉장고로
        </Link>
        <h1>★ 내 저장 레시피</h1>
        <div className="fav-count">{favorites.length}개</div>
      </div>

      {loading ? (
        <div className="fav-empty">
          <p>불러오는 중...</p>
        </div>
      ) : favorites.length > 0 ? (
        <div className="fav-grid">
          {favorites.map((f) => (
            <div className="fav-card" key={f.id}>
              <div className="fav-card-head">
                <span className={`src-badge ${f.source}`}>{SOURCE_LABEL[f.source]}</span>
                <button
                  type="button"
                  className="fav-del-btn"
                  title="저장 취소"
                  onClick={() => handleDelete(f)}
                >
                  ★
                </button>
              </div>
              <div className="fav-title">{f.title}</div>
              {f.ingredients_summary && (
                <div className="fav-ing">
                  {f.ingredients_summary.length > 120
                    ? f.ingredients_summary.slice(0, 120) + '…'
                    : f.ingredients_summary}
                </div>
              )}
              {f.url && (
                <a className="fav-link" href={f.url} target="_blank" rel="noopener">
                  원문 보기 ↗
                </a>
              )}
              <div className="fav-meta">{formatDate(f.created_at)} 저장</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="fav-empty">
          <div className="fav-empty-icon">🍽️</div>
          <p>아직 저장한 레시피가 없어요.</p>
          <p>냉장고에서 마음에 드는 레시피의 ★ 버튼을 눌러보세요!</p>
          <Link
            to="/"
            className="auth-btn"
            style={{ display: 'inline-block', textDecoration: 'none', marginTop: 16 }}
          >
            냉장고 열기
          </Link>
        </div>
      )}
    </div>
  );
}
