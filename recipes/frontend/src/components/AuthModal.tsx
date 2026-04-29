// =============================================================
// 로그인 / 회원가입 팝업 모달
// 냉장고 클릭 시 비로그인 상태에서 표시됨
// =============================================================
import { useState, type FormEvent } from 'react';
import { postLogin, postSignup } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/api/client';

interface Props {
  open: boolean;
  onClose: () => void;          // 모달 닫기 (비회원 이용 or 로그인 성공 후 냉장고 열기)
  onLoginSuccess: () => void;   // 로그인/가입 성공 시 냉장고 열기
}

type Tab = 'login' | 'signup';

export default function AuthModal({ open, onClose, onLoginSuccess }: Props) {
  const { setAuth } = useAuth();
  const [tab, setTab] = useState<Tab>('login');

  // 로그인 폼 상태
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [loginErr, setLoginErr] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  // 회원가입 폼 상태
  const [signupId, setSignupId] = useState('');
  const [signupPw1, setSignupPw1] = useState('');
  const [signupPw2, setSignupPw2] = useState('');
  const [signupErr, setSignupErr] = useState<string | null>(null);
  const [signupBusy, setSignupBusy] = useState(false);

  if (!open) return null;

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginErr(null);
    setLoginBusy(true);
    try {
      const res = await postLogin({ username: loginId, password: loginPw });
      setAuth(res.user);
      onLoginSuccess();
    } catch (err) {
      setLoginErr(err instanceof ApiError ? err.message || '로그인 실패' : '네트워크 오류');
    } finally {
      setLoginBusy(false);
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setSignupErr(null);
    if (signupPw1 !== signupPw2) {
      setSignupErr('두 비밀번호가 일치하지 않습니다.');
      return;
    }
    setSignupBusy(true);
    try {
      const res = await postSignup({ username: signupId, password1: signupPw1, password2: signupPw2 });
      setAuth(res.user);
      onLoginSuccess();
    } catch (err) {
      setSignupErr(err instanceof ApiError ? err.message || '회원가입 실패' : '네트워크 오류');
    } finally {
      setSignupBusy(false);
    }
  };

  return (
    <div className="am-overlay" onClick={onClose}>
      <div className="am-card" onClick={(e) => e.stopPropagation()}>

        {/* 아이콘 + 타이틀 */}
        <div className="am-header">
          <span className="am-icon">🧊</span>
          <span className="am-title">냉털봇</span>
        </div>

        {/* 탭 */}
        <div className="am-tabs">
          <button
            className={`am-tab${tab === 'login' ? ' active' : ''}`}
            onClick={() => setTab('login')}
            type="button"
          >
            로그인
          </button>
          <button
            className={`am-tab${tab === 'signup' ? ' active' : ''}`}
            onClick={() => setTab('signup')}
            type="button"
          >
            회원가입
          </button>
        </div>

        {/* 로그인 폼 */}
        {tab === 'login' && (
          <form className="am-form" onSubmit={handleLogin}>
            {loginErr && <div className="am-err">{loginErr}</div>}
            <label htmlFor="am-login-id">아이디</label>
            <input
              id="am-login-id"
              type="text"
              placeholder="아이디를 입력하세요"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
              autoFocus
            />
            <label htmlFor="am-login-pw">비밀번호</label>
            <input
              id="am-login-pw"
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={loginPw}
              onChange={(e) => setLoginPw(e.target.value)}
              required
            />
            <button type="submit" className="am-submit-btn" disabled={loginBusy}>
              {loginBusy ? '로그인 중...' : '로그인'}
            </button>
          </form>
        )}

        {/* 회원가입 폼 */}
        {tab === 'signup' && (
          <form className="am-form" onSubmit={handleSignup}>
            {signupErr && <div className="am-err">{signupErr}</div>}
            <label htmlFor="am-signup-id">아이디</label>
            <input
              id="am-signup-id"
              type="text"
              placeholder="사용할 아이디를 입력하세요"
              value={signupId}
              onChange={(e) => setSignupId(e.target.value)}
              required
              autoFocus
            />
            <label htmlFor="am-signup-pw1">비밀번호</label>
            <input
              id="am-signup-pw1"
              type="password"
              placeholder="비밀번호 (8자 이상)"
              value={signupPw1}
              onChange={(e) => setSignupPw1(e.target.value)}
              required
            />
            <label htmlFor="am-signup-pw2">비밀번호 확인</label>
            <input
              id="am-signup-pw2"
              type="password"
              placeholder="비밀번호를 다시 입력하세요"
              value={signupPw2}
              onChange={(e) => setSignupPw2(e.target.value)}
              required
            />
            <button type="submit" className="am-submit-btn" disabled={signupBusy}>
              {signupBusy ? '가입 중...' : '가입하고 시작하기'}
            </button>
          </form>
        )}

        {/* 구분선 */}
        <div className="am-divider">
          <span>또는</span>
        </div>

        {/* 비회원 이용 */}
        <button className="am-guest-btn" type="button" onClick={onClose}>
          비회원으로 이용하기
        </button>
      </div>
    </div>
  );
}
