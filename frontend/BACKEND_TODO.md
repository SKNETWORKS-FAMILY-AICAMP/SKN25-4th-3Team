# Backend Changes Required for SPA Migration

이 React 프론트엔드는 Django 백엔드와 같은 origin(또는 vite proxy로 동일하게 보이는 origin)에서 동작한다는 가정으로 짜여 있습니다. 다만 현재 Django 측이 form/template 기반이라 SPA로 완전히 분리되려면 아래 변경이 필요합니다.

## 1. JSON 인증 엔드포인트

현재 `recipes/views.py` 의 `login_view` / `signup_view` / `logout_view`는 form POST + redirect 응답입니다. SPA는 JSON으로 받아야 합니다.

**필요한 수정:**

```python
# views.py
from django.http import JsonResponse

@require_http_methods(["POST"])
def login_view(request):
    if request.method == "POST" and request.content_type == "application/json":
        payload = json.loads(request.body)
        form = AuthenticationForm(request, data=payload)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return JsonResponse({
                "ok": True,
                "user": {"isAuthenticated": True, "username": user.username},
            })
        return JsonResponse({
            "ok": False,
            "error": "; ".join(form.errors.values()) or "로그인 실패",
        }, status=400)
    # 기존 form 분기 유지(일반 브라우저 직접 접근 호환용)
    ...
```

`signup_view`, `logout_view` 도 같은 패턴으로 JSON 분기 추가.

## 2. `/api/initial-state/` 추가

지금은 `views.index` 가 템플릿 컨텍스트로 messages / preferences / favorite_mongo_ids 를 주입하는 방식. SPA에선 이 데이터를 JSON으로 한 번에 받아야 합니다.

**추가:**

```python
# urls.py
path("api/initial-state/", views.initial_state_api, name="initial_state_api"),

# views.py
@require_http_methods(["GET"])
def initial_state_api(request):
    _ensure_session(request.session)
    fav_ids = []
    if request.user.is_authenticated:
        fav_ids = list(
            Favorite.objects.filter(user=request.user)
            .exclude(mongo_recipe_id="")
            .values_list("mongo_recipe_id", flat=True)
        )
    return JsonResponse({
        "auth": {
            "isAuthenticated": request.user.is_authenticated,
            "username": request.user.username if request.user.is_authenticated else "",
        },
        "messages": request.session.get("messages", []),
        "preferences": {
            "allergies": request.session.get("allergies", "없음"),
            "difficulty": request.session.get("difficulty", "초보"),
            "cooking_time": request.session.get("cooking_time", "20분"),
            "saved_sauces": request.session.get("saved_sauces", []),
        },
        "favorite_mongo_ids": fav_ids,
    })
```

## 3. CORS / CSRF (배포 시)

개발 환경은 `vite.config.ts` 의 `server.proxy` 로 same-origin 처럼 보이게 처리되므로 추가 설정 없이 동작합니다.

배포 환경에서 React 정적파일을 다른 도메인에서 서빙한다면:

- `pip install django-cors-headers` 추가
- `INSTALLED_APPS += ["corsheaders"]`, `MIDDLEWARE` 상단에 `CorsMiddleware` 추가
- `settings.py`:
  ```python
  CORS_ALLOWED_ORIGINS = ["https://your-frontend.example.com"]
  CORS_ALLOW_CREDENTIALS = True
  CSRF_TRUSTED_ORIGINS = ["https://your-frontend.example.com"]
  SESSION_COOKIE_SAMESITE = "None"
  SESSION_COOKIE_SECURE = True
  CSRF_COOKIE_SAMESITE = "None"
  CSRF_COOKIE_SECURE = True
  ```

추천은 **운영 시 React 빌드 결과물(`npm run build` → `dist/`)을 Django의 `STATICFILES_DIRS` 에 포함시켜 동일 도메인에서 서빙** 하는 것 — CORS/CSRF 이슈가 사라집니다.

## 4. CSRF 토큰

현재 chat/prefs/reset/favorites_api 모두 `@csrf_exempt`. SPA에서도 세션 인증을 쓸 거면 `@csrf_exempt` 제거 + 첫 요청 시 `csrftoken` 쿠키를 받게 한 다음(예: `/api/initial-state/` 가 `ensure_csrf_cookie` 데코레이터 적용) `X-CSRFToken` 헤더로 보내는 방식이 정석. React 측 `apiFetch` 가 이미 그 헤더를 자동 주입합니다.

```python
from django.views.decorators.csrf import ensure_csrf_cookie

@ensure_csrf_cookie
@require_http_methods(["GET"])
def initial_state_api(request):
    ...
```

## 5. URL 라우팅 (배포 시)

React Router는 `/`, `/favorites`, `/accounts/login`, `/accounts/signup` 모두 클라이언트 라우팅. Django가 이 경로들을 자체 처리하지 않고 `index.html` 을 반환하도록 catch-all 뷰가 필요:

```python
# urls.py — 가장 마지막에
from django.views.generic import TemplateView
re_path(r"^(?!api/|admin/|static/).*$", TemplateView.as_view(template_name="index.html")),
```

## 마이그레이션 순서 추천

1. 위 1~2번(JSON 엔드포인트 + initial-state)을 먼저 백엔드에 추가
2. `cd frontend && npm install && npm run dev` 로 React 부팅 검증
3. 동작 확인 후 기존 Django 템플릿(`recipes/templates/`)과 `legacy_streamlit_frontend/` 정리
4. 운영 배포 단계에서 5번(catch-all) 적용
