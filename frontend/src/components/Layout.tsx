// =============================================================
// 공용 레이아웃 — 상단 네비 + <Outlet/>
// 기존 base.html 의 .top-nav 영역을 React 컴포넌트로 변환.
// =============================================================
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { postLogout } from '@/api/auth';

export default function Layout() {
  const { auth, setAuth } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await postLogout();
    } catch {
      // 에러여도 클라이언트 상태는 비움
    }
    setAuth({ isAuthenticated: false, username: '' });
    navigate('/');
  };

  return (
    <>
      <header className="top-nav">
        <div className="top-nav-inner">
          <Link to="/" className="top-logo">
            🧊 냉털봇
          </Link>
          <nav className="top-links">
            {auth.isAuthenticated ? (
              <>
                <Link to="/favorites" className="top-link">
                  ★ 내 저장 레시피
                </Link>
                <span className="top-user">{auth.username}님</span>
                <button
                  type="button"
                  className="top-link top-logout"
                  onClick={handleLogout}
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link to="/accounts/login" className="top-link">
                  로그인
                </Link>
                <Link to="/accounts/signup" className="top-link top-link-cta">
                  회원가입
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
