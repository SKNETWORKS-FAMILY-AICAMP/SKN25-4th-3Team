import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { postSignup } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/api/client';

export default function SignupPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const [username, setUsername] = useState('');
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (password1 !== password2) {
      setError('두 비밀번호가 일치하지 않습니다.');
      return;
    }

    setBusy(true);
    try {
      const res = await postSignup({ username, password1, password2 });
      setAuth(res.user);
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || '회원가입 실패');
      } else {
        setError('네트워크 오류');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">🍳</div>
        <h1 className="auth-title">회원가입</h1>
        <p className="auth-sub">아이디와 비밀번호만으로 시작하세요.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-err">{error}</div>}
          <label htmlFor="signup-username">아이디</label>
          <input
            id="signup-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />

          <label htmlFor="signup-password1">비밀번호</label>
          <input
            id="signup-password1"
            type="password"
            value={password1}
            onChange={(e) => setPassword1(e.target.value)}
            required
          />
          <div className="auth-hint">8자 이상, 너무 단순한 패턴 금지</div>

          <label htmlFor="signup-password2">비밀번호 확인</label>
          <input
            id="signup-password2"
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required
          />

          <button type="submit" className="auth-btn" disabled={busy}>
            {busy ? '가입 중...' : '가입하고 시작하기'}
          </button>
        </form>

        <div className="auth-foot">
          이미 가입하셨나요?
          <Link to="/accounts/login">로그인</Link>
        </div>
        <div className="auth-back">
          <Link to="/">← 냉장고로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
}
