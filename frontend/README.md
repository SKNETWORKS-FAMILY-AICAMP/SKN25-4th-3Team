# 냉털봇 Frontend (React + TypeScript)

기존 Django 템플릿 기반 프론트엔드(`django_app/recipes/templates/`)를 React SPA로 이관한 버전입니다.

## 스택

- Vite 5
- React 18
- TypeScript 5
- React Router 6
- 스타일은 기존 `fridge.css` 를 그대로 가져와 글로벌로 사용 (`src/styles/global.css`)

## 시작하기

```bash
cd frontend
npm install
npm run dev
```

기본적으로 `http://localhost:5173` 에서 동작하며, `/api/*` 와 `/accounts/*` 요청은 `vite.config.ts` 의 proxy 설정에 의해 `http://localhost:8000`(Django dev 서버)로 전달됩니다.

따라서 다른 터미널에서 Django dev 서버를 띄워야 합니다:

```bash
cd django_app
python manage.py runserver
```

## 폴더 구조

```
frontend/
├── index.html              # 진입점
├── package.json
├── tsconfig.json
├── vite.config.ts          # /api, /accounts proxy 설정
├── BACKEND_TODO.md         # SPA 통합을 위해 필요한 Django 측 변경사항
└── src/
    ├── main.tsx            # ReactDOM.createRoot — Router 마운트
    ├── App.tsx             # 라우트 정의
    ├── api/
    │   ├── client.ts       # 공용 fetch 래퍼 (CSRF 자동 주입)
    │   ├── recipes.ts      # /api/chat, /api/prefs, /api/reset, /api/initial-state
    │   ├── favorites.ts    # /api/favorites/
    │   └── auth.ts         # 로그인/회원가입/로그아웃
    ├── components/
    │   ├── Layout.tsx      # 상단 네비
    │   ├── Fridge.tsx      # 냉장고 외형 + 도어 애니메이션 컨테이너
    │   ├── Chat.tsx        # 헤더 + 메시지 리스트 + 입력창
    │   ├── MessageBubble.tsx
    │   ├── CandidateCard.tsx
    │   ├── FAQButtons.tsx
    │   ├── PreferencePanel.tsx
    │   ├── SaucePanel.tsx
    │   └── Toast.tsx
    ├── context/
    │   └── AuthContext.tsx # 전역(auth, prefs, 즐겨찾기 ID Set, 초기 메시지)
    ├── pages/
    │   ├── FridgePage.tsx  # 메인 페이지
    │   ├── FavoritesPage.tsx
    │   ├── LoginPage.tsx
    │   └── SignupPage.tsx
    ├── styles/
    │   └── global.css      # fridge.css 그대로
    ├── types/
    │   └── index.ts        # API 응답/요청 타입
    └── utils/
        └── csrf.ts
```

## 주의사항

이 프론트엔드를 실제로 띄우려면 **Django 측 변경이 선행**되어야 합니다. `BACKEND_TODO.md` 참고.

특히:

- `/api/initial-state/` 엔드포인트 신설
- `/accounts/login/`, `/accounts/signup/`, `/accounts/logout/` 의 JSON 응답 분기 추가
- React Router 진입점을 위한 Django catch-all 라우트 (배포 시)

## 빌드 & 배포

```bash
npm run build     # dist/ 에 정적 파일 생성
```

운영 시 `dist/` 결과물을 Django의 `STATICFILES_DIRS` 또는 별도 CDN/정적 호스팅에서 서빙하면 됩니다. **동일 도메인 서빙을 권장** (CORS/CSRF 단순화).

## 마이그레이션 노트

기존 `legacy_streamlit_frontend/` 폴더는 3차 프로젝트에서 사용하던 Streamlit 프론트엔드 흔적입니다. Django 통합 이후 사용되지 않으며 React 이관이 안정화되면 제거 가능합니다.
