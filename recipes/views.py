"""Django 뷰 — 메인 페이지 + /api/chat/ 엔드포인트.

3차 프로젝트의 backend/api/main.py(FastAPI) + frontend/app.py(Streamlit)를
하나의 Django 앱으로 통합했습니다.

[엔드포인트]
- GET  /              메인 페이지(냉장고 UI 렌더링, 세션의 chat history 포함)
- POST /api/chat/     RAG 답변 생성. JSON 입출력.
- POST /api/prefs/    취향(알레르기/난이도/시간/소스) 저장. 세션에 보존.
- POST /api/reset/    채팅 히스토리 초기화.
"""
import json

from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_http_methods

# RecipeAgent 싱글톤 — 첫 요청 시에 한 번만 초기화
_agent = None


def _get_agent():
    global _agent
    if _agent is None:
        # apps.py에서 미리 import 했지만, 인스턴스화는 첫 요청 시점에 수행
        from recipes.rag.pipeline import RecipeAgent

        _agent = RecipeAgent()
    return _agent


# ---------------------------------------------------------------------
# 기본 인사말 + 취향 기본값
# ---------------------------------------------------------------------
DEFAULT_GREETING = [
    {"role": "bot", "text": "안녕하세요! 🧅 냉장고 속 재료를 알려주시면 딱 맞는 레시피를 찾아드릴게요!"},
    {"role": "bot", "text": "냉장고 문을 열고 재료를 직접 입력해보세요 👇"},
]

DEFAULT_PREFS = {
    "allergies": "없음",
    "difficulty": "초보",
    "cooking_time": "20분",
    "saved_sauces": [],
}


def _ensure_session(session):
    """세션에 채팅/취향 기본값 주입."""
    if "messages" not in session:
        session["messages"] = list(DEFAULT_GREETING)
    for k, v in DEFAULT_PREFS.items():
        session.setdefault(k, v)


# ---------------------------------------------------------------------
# 1. 메인 페이지 — 냉장고 UI
# ---------------------------------------------------------------------
def index(request):
    _ensure_session(request.session)
    saved_sauces = request.session.get("saved_sauces", [])
    # 4차: 로그인 사용자의 기존 즐겨찾기 ID 목록 (별 버튼 토글 상태용)
    fav_ids = []
    if request.user.is_authenticated:
        from recipes.models import Favorite
        fav_ids = list(
            Favorite.objects.filter(user=request.user)
            .exclude(mongo_recipe_id="")
            .values_list("mongo_recipe_id", flat=True)
        )
    context = {
        "messages": request.session["messages"],
        "allergies": request.session.get("allergies", "없음"),
        "difficulty": request.session.get("difficulty", "초보"),
        "cooking_time": request.session.get("cooking_time", "20분"),
        "saved_sauces": saved_sauces,
        "saved_sauces_text": ", ".join(saved_sauces) if saved_sauces else "없음",
        "favorite_mongo_ids": fav_ids,
    }
    return render(request, "recipes/index.html", context)


# ---------------------------------------------------------------------
# 2. /api/chat/ — RAG 답변 엔드포인트
# ---------------------------------------------------------------------
@csrf_exempt  # 프론트가 fetch로 호출. CSRF 토큰 헤더로 대체 가능하지만 단순화.
@require_http_methods(["POST"])
def chat_api(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"error": "잘못된 JSON 형식입니다."}, status=400, json_dumps_params={'ensure_ascii': False})

    question = (payload.get("question") or "").strip()
    if not question:
        return JsonResponse({"error": "question이 비어있습니다."}, status=400, json_dumps_params={'ensure_ascii': False})

    preferences = {
        "allergies": payload.get("allergies", "없음"),
        "difficulty": payload.get("difficulty", "초보"),
        "cooking_time": payload.get("cooking_time", "20분"),
        "saved_sauces": payload.get("saved_sauces", "없음"),
    }
    chat_history = payload.get("chat_history", []) or []

    try:
        from recipes.rag.diet_curator import DietRecipeCurator
        from recipes.rag.seasonal_curator import SeasonalRecipeCurator
        
        curator = DietRecipeCurator()
        seasonal_curator = SeasonalRecipeCurator()

        # 0. 세션에서 현재 대화 상태 확인
        _ensure_session(request.session)
        seasonal_state = request.session.get("seasonal_state")

        # 1. 다이어트 의도 분석 및 라우팅
        if question == "💪 다이어트 레시피":
            request.session["seasonal_state"] = None  # 다른 상태 초기화
            result = curator.get_diet_recipe()
        
        # 2. 제철 재료 레시피 멀티턴 로직
        elif question in ["🌱 제철 재료 레시피", "📅 제철 재료 레시피"] or seasonal_state:
            if question in ["🌱 제철 재료 레시피", "📅 제철 재료 레시피"]:
                # 처음 버튼 클릭 시
                request.session["seasonal_state"] = "AWAITING_MONTH"
                result = {"answer": "몇 월의 제철 재료를 알려드릴까요? (예: 4월)", "source": "bot"}
            
            elif seasonal_state == "AWAITING_MONTH":
                # 월 입력 대기 중
                foods = seasonal_curator.get_ingredients_by_month(question)
                if foods:
                    request.session["seasonal_state"] = "AWAITING_FOOD"
                    request.session["current_seasonal_foods"] = foods
                    foods_str = ", ".join(foods)
                    result = {
                        "answer": f"그 달의 제철 재료는 **{foods_str}** 입니다. \n어떤 재료를 이용한 레시피를 찾고 싶으신가요?",
                        "source": "bot"
                    }
                else:
                    result = {"answer": "죄송합니다. 월 정보를 정확히 이해하지 못했어요. '4월'과 같이 다시 입력해 주세요.", "source": "bot"}
            
            elif seasonal_state == "AWAITING_FOOD":
                # 특정 재료 입력 대기 중
                result = seasonal_curator.get_recipe_by_seasonal_food(question)
                request.session["seasonal_state"] = None  # 대화 종료 후 상태 초기화
            
            else:
                request.session["seasonal_state"] = None
                result = {"answer": "대화 흐름이 끊겼습니다. 다시 버튼을 눌러주세요.", "source": "bot"}

        else:
            # 3. 일반 채팅 시: LLM으로 의도 분석
            intent = curator.analyze_diet_intent(question)
            if intent.get("is_diet_intent"):
                result = curator.get_diet_recipe(
                    user_question=question,
                    ingredients=intent.get("ingredients", "")
                )
            else:
                # 일반 질문은 기존 RAG 에이전트(DB 우선) 사용
                agent = _get_agent()
                result = agent.run(
                    question=question,
                    preferences=preferences,
                    chat_history=chat_history,
                )
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500, json_dumps_params={'ensure_ascii': False})


    # 세션에 사용자 + 봇 메시지 저장 (페이지 새로고침해도 유지)
    _ensure_session(request.session)
    request.session["messages"].append({"role": "user", "text": question})
    request.session["messages"].append({"role": "bot", "text": result["answer"]})
    # 100턴 이상 쌓이면 앞쪽 잘라냄 (세션 비대화 방지)
    if len(request.session["messages"]) > 100:
        request.session["messages"] = request.session["messages"][-80:]
    request.session.modified = True

    return JsonResponse(
        {
            "answer": result["answer"],
            "source": result.get("source", "db"),
            "candidates": result.get("candidates", []),
        },
        json_dumps_params={'ensure_ascii': False}
    )


# ---------------------------------------------------------------------
# 3. /api/prefs/ — 취향(소스/알레르기 등) 저장
# ---------------------------------------------------------------------
@csrf_exempt
@require_http_methods(["POST"])
def prefs_api(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"error": "잘못된 JSON 형식입니다."}, status=400, json_dumps_params={'ensure_ascii': False})

    _ensure_session(request.session)
    if "allergies" in payload:
        request.session["allergies"] = payload["allergies"]
    if "difficulty" in payload:
        request.session["difficulty"] = payload["difficulty"]
    if "cooking_time" in payload:
        request.session["cooking_time"] = payload["cooking_time"]
    if "saved_sauces" in payload:
        sauces = payload["saved_sauces"]
        if isinstance(sauces, str):
            sauces = [s.strip() for s in sauces.split(",") if s.strip()]
        request.session["saved_sauces"] = sauces

    request.session.modified = True
    return JsonResponse(
        {
            "ok": True,
            "saved_sauces": request.session.get("saved_sauces", []),
        },
        json_dumps_params={'ensure_ascii': False}
    )


# ---------------------------------------------------------------------
# 4. /api/reset/ — 채팅 히스토리 리셋
# ---------------------------------------------------------------------
@csrf_exempt
@require_http_methods(["POST"])
def reset_api(request):
    request.session["messages"] = list(DEFAULT_GREETING)
    request.session.modified = True
    return JsonResponse({"ok": True}, json_dumps_params={'ensure_ascii': False})


# =====================================================================
# [4차 추가] 로그인 / 회원가입 / 로그아웃 / 즐겨찾기
# =====================================================================
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from django.shortcuts import redirect

from recipes.models import Favorite


def _require_json_login(request):
    if request.user.is_authenticated:
        return None
    return JsonResponse({"error": "로그인이 필요합니다."}, status=401)

@ensure_csrf_cookie
@require_http_methods(["GET"])
def initial_state_api(request):
    """SPA 초기 구동 시 필요한 모든 데이터를 JSON으로 반환."""
    _ensure_session(request.session)
    fav_ids = []
    if request.user.is_authenticated:
        from recipes.models import Favorite
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


@csrf_exempt
def signup_view(request):
    """아이디 + 비밀번호 회원가입. JSON 요청 대응."""
    if request.user.is_authenticated:
        if request.content_type == "application/json":
            return JsonResponse({"ok": True})
        return redirect("recipes:index")

    if request.method == "POST":
        if request.content_type == "application/json":
            payload = json.loads(request.body)
            form = UserCreationForm(data=payload)
            if form.is_valid():
                user = form.save()
                login(request, user)
                return JsonResponse({"ok": True, "user": {"isAuthenticated": True, "username": user.username}})
            return JsonResponse({"ok": False, "error": form.errors.get_json_data()}, status=400)
        
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect("recipes:index")
    else:
        form = UserCreationForm()
    return render(request, "registration/signup.html", {"form": form})


@csrf_exempt
def login_view(request):
    """로그인 페이지. JSON 요청 대응."""
    if request.user.is_authenticated:
        if request.content_type == "application/json":
            return JsonResponse({"ok": True, "user": {"isAuthenticated": True, "username": request.user.username}})
        return redirect("recipes:index")

    if request.method == "POST":
        if request.content_type == "application/json":
            payload = json.loads(request.body)
            form = AuthenticationForm(request, data=payload)
            if form.is_valid():
                user = form.get_user()
                login(request, user)
                return JsonResponse({"ok": True, "user": {"isAuthenticated": True, "username": user.username}})
            return JsonResponse({"ok": False, "error": "아이디 또는 비밀번호가 틀렸습니다."}, status=400)

        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect("recipes:index")
    else:
        form = AuthenticationForm()
    return render(request, "registration/login.html", {"form": form})


@csrf_exempt
def logout_view(request):
    logout(request)
    if request.content_type == "application/json":
        return JsonResponse({"ok": True})
    return redirect("recipes:index")


# ---------------------------------------------------------------------
# 즐겨찾기 페이지
# ---------------------------------------------------------------------
@login_required
def favorites_page(request):
    favs = Favorite.objects.filter(user=request.user)
    return render(
        request, "recipes/favorites.html", {"favorites": favs}
    )


# ---------------------------------------------------------------------
# 즐겨찾기 API
# ---------------------------------------------------------------------
@csrf_exempt
@require_http_methods(["GET", "POST"])
def favorites_api(request):
    """GET: 내 즐겨찾기 목록 / POST: 새 즐겨찾기 추가."""
    login_error = _require_json_login(request)
    if login_error:
        return login_error

    if request.method == "GET":
        favs = Favorite.objects.filter(user=request.user)
        return JsonResponse({"favorites": [f.to_dict() for f in favs]}, json_dumps_params={'ensure_ascii': False})

    # POST
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"error": "잘못된 JSON"}, status=400, json_dumps_params={'ensure_ascii': False})

    title = (payload.get("title") or "").strip()
    if not title:
        return JsonResponse({"error": "title은 필수입니다."}, status=400, json_dumps_params={'ensure_ascii': False})

    mongo_id = payload.get("mongo_recipe_id", "") or ""
    source = payload.get("source", "db")

    # 중복 체크 (DB 레시피만 — mongo_id 있는 경우)
    if mongo_id:
        existing = Favorite.objects.filter(
            user=request.user, mongo_recipe_id=mongo_id
        ).first()
        if existing:
            return JsonResponse(
                {"ok": True, "favorite": existing.to_dict(), "duplicate": True},
                json_dumps_params={'ensure_ascii': False}
            )

    fav = Favorite.objects.create(
        user=request.user,
        mongo_recipe_id=mongo_id,
        title=title[:255],
        url=(payload.get("url") or "")[:1000],
        ingredients_summary=(payload.get("ingredients_summary") or "")[:2000],
        answer_snippet=(payload.get("answer_snippet") or "")[:2000],
        source=source if source in {"db", "web", "llm"} else "db",
    )
    return JsonResponse({"ok": True, "favorite": fav.to_dict()}, json_dumps_params={'ensure_ascii': False})


@csrf_exempt
@require_http_methods(["DELETE", "POST"])
def favorite_delete_api(request, fav_id):
    """즐겨찾기 삭제 (DELETE 또는 POST 모두 허용 - 폼 호환)."""
    login_error = _require_json_login(request)
    if login_error:
        return login_error

    fav = Favorite.objects.filter(id=fav_id, user=request.user).first()
    if not fav:
        return JsonResponse({"error": "찾을 수 없습니다."}, status=404, json_dumps_params={'ensure_ascii': False})
    fav.delete()
    return JsonResponse({"ok": True}, json_dumps_params={'ensure_ascii': False})
