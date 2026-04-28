# 냉털봇 — 4차 프로젝트 (Django 이관)

3차 프로젝트(FastAPI + Streamlit)를 Django로 이관하면서 다음 3가지 기능을 추가한 버전입니다.

## ✨ 4차 추가 기능

1. **3단 Fallback** — DB 검색 → 웹 검색 → LLM 일반지식 (환각 방지 안내문 강제)
2. **칼로리 추정** — 추천 레시피마다 1인분 추정 칼로리 표기 (LLM 추정 명시)
3. **Django 통합** — FastAPI + Streamlit 분리 구조를 단일 Django 앱으로 통합, 세션 기반 채팅 히스토리

## 📁 프로젝트 구조

```
├── manage.py
├── nangteol/                   # Django 프로젝트 설정
├── recipes/                    # RAG, MongoDB, 인증, 즐겨찾기, JSON API
├── frontend/                   # React + TypeScript SPA
│   ├── src/api/                # Django /api, /accounts 호출부
│   ├── src/pages/
│   └── vite.config.ts          # Django dev 서버 프록시
├── legacy_streamlit_frontend/  # 이전 Streamlit UI 보관본
├── .env                        # API 키 및 DB URI (MONGO_URI 필수)
└── requirements.txt   
```

## 🚀 실행 방법

### 1. 가상환경 생성 (Python 3.11+)

```bash
python3.11 -m venv .venv
source .venv/bin/activate           # macOS/Linux
# .\.venv\Scripts\activate          # Windows

pip install -U pip
pip install -r requirements.txt
```

### 2. `.env` 작성

프로젝트 루트 `.env`에 다음 항목이 있어야 합니다.

```env
OPENAI_API_KEY=sk-...
MONGO_URI=mongodb+srv://...
DB_NAME=recipe_project
COLLECTION_NAME=recipes
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...

# Django 전용
DJANGO_SECRET_KEY=장문의-랜덤-문자열-넣으세요
DJANGO_DEBUG=True

# PostgreSQL / Redis
POSTGRES_DB=nangteol_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_HOST=db
POSTGRES_PORT=5432
REDIS_URL=redis://redis:6379/1

# (선택) 벡터 검색 컷오프 외부화 — 데모 시 0.6 정도로 낮추면 fallback 자주 발동
# RAG_SCORE_THRESHOLD=0.75
```

### 3. PostgreSQL/Redis + 서버 실행

```bash
docker compose up -d db redis
docker compose run --rm web python manage.py migrate
docker compose up web
```

브라우저: http://127.0.0.1:8001/

## 🧪 3단 Fallback 동작 확인 시나리오

| 시나리오 | 입력 예시 | 예상 source | 답변 표시 |
|---|---|---|---|
| 1차: DB 적중 | "감자랑 양파로 뭐 해 먹지?" | `db` | 초록 DB 뱃지 + 칼로리 |
| 2차: 웹 검색 | (DB에 없는 마이너 재료 조합) | `web` | 노랑 WEB 뱃지 |
| 3차: LLM 일반지식 | "유자·메추리알로 만드는 디저트" | `llm` | 빨강 "LLM 추정" 뱃지 + ⚠️ 경고문 |

데모 시 `RAG_SCORE_THRESHOLD=0.95`로 환경변수를 올려두면 거의 모든 입력이 fallback 으로 빠져서 시연 편함.

## 🔌 API 엔드포인트

| Method | Path | 용도 |
|---|---|---|
| GET | `/` | 냉장고 UI 메인 페이지 |
| POST | `/api/chat/` | 질문 → 답변(JSON, source 포함) |
| POST | `/api/prefs/` | 알레르기/난이도/시간/소스 저장 |
| POST | `/api/reset/` | 채팅 히스토리 초기화 |

`/api/chat/` 요청 예시:

```json
{
  "question": "감자랑 양파로 뭐 해 먹지?",
  "allergies": "없음",
  "difficulty": "초보",
  "cooking_time": "20분",
  "saved_sauces": "진간장, 참기름",
  "chat_history": []
}
```

응답:

```json
{
  "answer": "🍳 **감자전**\n- **입력 재료**: ...\n- **추정 칼로리**: 약 320kcal (1인분 기준, LLM 추정)\n...",
  "source": "db"
}
```

## 🗃 3차 프로젝트와의 호환

- FastAPI `backend/`와 로컬 SQLite는 사용하지 않습니다.
- MongoDB 컬렉션, 임베딩 스키마는 변경 없음. 3차 프로젝트의 데이터를 그대로 사용.
- Django의 사용자/세션/즐겨찾기는 PostgreSQL/Redis를 사용하고, 레시피 검색은 MongoDB Atlas를 사용합니다.
