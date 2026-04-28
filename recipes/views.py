import json
import os
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm

# RecipeAgent 싱글톤
_agent = None

def _get_agent():
    global _agent
    if _agent is None:
        from recipes.rag.pipeline import RecipeAgent
        _agent = RecipeAgent()
    return _agent

# ---------------------------------------------------------------------
# SPA Entry Point
# ---------------------------------------------------------------------
@ensure_csrf_cookie
def index(request):
    """
    React SPA의 진입점입니다. 
    빌드된 index.html을 서빙하여 리액트 앱이 화면을 제어하게 합니다.
    """
    dist_index = os.path.join(settings.BASE_DIR, 'recipes', 'static', 'recipes', 'dist', 'index.html')
    
    if os.path.exists(dist_index):
        with open(dist_index, 'r', encoding='utf-8') as f:
            return HttpResponse(f.read())
    
    # 빌드 파일이 없을 경우 안내 메시지
    return HttpResponse("React 빌드 파일(index.html)을 찾을 수 없습니다. npm run build를 실행해주세요.", status=404)

# ---------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["POST"])
def chat_api(request):
    agent = _get_agent()
    try:
        payload = json.loads(request.body.decode("utf-8"))
        question = payload.get("question", "").strip()
        history = payload.get("history", [])
        preferences = payload.get("preferences", {})
        
        # RAG 파이프라인 실행
        result = agent.run(question=question, preferences=preferences, chat_history=history)
        
        return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@require_http_methods(["GET"])
def initial_state_api(request):
    """SPA 초기 로딩 시 인증 상태 등을 반환"""
    return JsonResponse({
        "auth": {
            "isAuthenticated": request.user.is_authenticated,
            "username": request.user.username if request.user.is_authenticated else None,
        }
    })

@csrf_exempt
@require_http_methods(["POST"])
def signup_view(request):
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        if User.objects.filter(username=username).exists():
            return JsonResponse({"error": "이미 존재하는 아이디입니다."}, status=400)
        user = User.objects.create_user(username=username, password=password)
        login(request, user)
        return JsonResponse({"ok": True, "user": {"isAuthenticated": True, "username": user.username}})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return JsonResponse({"ok": True, "user": {"isAuthenticated": True, "username": user.username}})
        return JsonResponse({"error": "아이디 또는 비밀번호가 틀렸습니다."}, status=401)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@require_http_methods(["POST"])
def logout_view(request):
    logout(request)
    return JsonResponse({"ok": True})

# 즐겨찾기 등 기타 API는 필요에 따라 추가 구현
def favorites_page(request): return index(request)
def favorites_api(request): return JsonResponse({"favorites": []})
def favorite_delete_api(request, fav_id): return JsonResponse({"ok": True})
def prefs_api(request): return JsonResponse({"ok": True})
def reset_api(request): return JsonResponse({"ok": True})
