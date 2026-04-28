import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RecipeCandidate, Source } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { createFavorite } from '@/api/favorites';
import { ApiError } from '@/api/client';

interface Props {
  candidate: RecipeCandidate;
  source: Source;
  onRequestToast: (msg: string) => void;
}

export default function CandidateCard({ candidate, source, onRequestToast }: Props) {
  const navigate = useNavigate();
  const { auth, favoriteMongoIds, addFavoriteMongoId } = useAuth();
  const [busy, setBusy] = useState(false);

  const isOn = !!(candidate.mongo_recipe_id && favoriteMongoIds.has(candidate.mongo_recipe_id));

  const handleStarClick = async () => {
    if (!auth.isAuthenticated) {
      if (confirm('레시피 저장은 로그인 후 이용할 수 있어요. 로그인하시겠어요?')) {
        navigate('/accounts/login');
      }
      return;
    }

    if (isOn) {
      // 이미 저장된 카드 — 삭제는 즐겨찾기 페이지에서.
      if (
        confirm(
          '저장을 취소하려면 ★ 내 저장 레시피 페이지에서 삭제해주세요. 페이지로 이동할까요?',
        )
      ) {
        navigate('/favorites');
      }
      return;
    }

    setBusy(true);
    try {
      const res = await createFavorite({
        mongo_recipe_id: candidate.mongo_recipe_id || '',
        title: candidate.title,
        url: candidate.url || '',
        ingredients_summary: candidate.ingredients_summary || '',
        source,
      });
      if (res.ok) {
        if (candidate.mongo_recipe_id) {
          addFavoriteMongoId(candidate.mongo_recipe_id);
        }
        onRequestToast(res.duplicate ? '이미 저장되어 있어요!' : '★ 저장 완료');
      }
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        alert('로그인이 필요합니다.');
        navigate('/accounts/login');
        return;
      }
      alert('저장 실패: ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cand-card">
      <button
        type="button"
        className={`star-btn${isOn ? ' on' : ''}`}
        onClick={handleStarClick}
        disabled={busy}
        aria-label={isOn ? '저장 취소' : '저장'}
      >
        ★
      </button>
      <div className="cand-title">{candidate.title}</div>
      {candidate.ingredients_summary && (
        <div className="cand-ing">{candidate.ingredients_summary.slice(0, 120)}</div>
      )}
      {candidate.url && (
        <a className="cand-link" href={candidate.url} target="_blank" rel="noopener">
          원문 ↗
        </a>
      )}
    </div>
  );
}
