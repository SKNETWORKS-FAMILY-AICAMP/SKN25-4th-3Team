// Django CSRF 토큰 처리.
// SPA에서도 세션 인증을 유지하려면 'csrftoken' 쿠키 → X-CSRFToken 헤더 전달이 표준.
// (현재 백엔드는 @csrf_exempt가 붙어 있어 없어도 동작하지만, 운영 시 제거할 것을 권장)

export function getCookie(name: string): string {
  const m = document.cookie.match(new RegExp(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`));
  return m ? decodeURIComponent(m[2]) : '';
}

export function getCsrfToken(): string {
  return getCookie('csrftoken');
}
