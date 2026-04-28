import { useEffect, useState } from 'react';

interface ToastProps {
  message: string | null;
  /** 메시지가 바뀔 때마다 표시 시간을 리셋하기 위한 토큰. 같은 메시지를 다시 띄우고 싶으면 갱신할 것. */
  token?: number;
  durationMs?: number;
}

export default function Toast({ message, token = 0, durationMs = 2000 }: ToastProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!message) return;
    setShow(true);
    const t = window.setTimeout(() => setShow(false), durationMs);
    return () => window.clearTimeout(t);
  }, [message, token, durationMs]);

  return (
    <div className={`toast${show ? ' show' : ''}`} role="status" aria-live="polite">
      {message ?? ''}
    </div>
  );
}
