import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { postLogin } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/api/client';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await postLogin({ username, password });
      setAuth(res.user);
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || '로그인 실패');
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
        <div className="auth-logo">🧊</div>
        <h1 className="auth-title">로그인</h1>
        <p className="auth-sub">냉털봇에 다시 오신 걸 환영합니다!</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-err">{error}</div>}
          <label htmlFor="login-username">아이디</label>
          <input
            id="login-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />

          <label htmlFor="login-password">비밀번호</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" className="auth-btn" disabled={busy}>
            {busy ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="auth-foot">
          계정이 없으신가요?
          <Link to="/accounts/signup">회원가입</Link>
        </div>
        <div className="auth-back">
          <Link to="/">← 냉장고로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
}
