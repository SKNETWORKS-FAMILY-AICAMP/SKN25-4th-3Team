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

from recipes.rag.pipeline import RecipeAgent
from recipes.models import ChatMessage, Profile, Favorite

# RecipeAgent 싱글톤
_agent = None

def _get_agent():
    global _agent
    if _agent is None:
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
        history = payload.get("chat_history", [])  # chat_history로 수정
        
        # 평면적인 필드들을 preferences 객체로 묶어줌
        preferences = {
            "allergies": payload.get("allergies", "없음"),
            "difficulty": payload.get("difficulty", "초보"),
            "cooking_time": payload.get("cooking_time", "20분"),
            "saved_sauces": payload.get("saved_sauces", ""),
        }
        
        # 1. 사용자 질문 저장
        if request.user.is_authenticated:
            ChatMessage.objects.create(user=request.user, role='user', text=question)
            
        # RAG 파이프라인 실행
        result = agent.run(question=question, preferences=preferences, chat_history=history)
        
        # 2. AI 답변 저장
        if request.user.is_authenticated:
            ChatMessage.objects.create(user=request.user, role='bot', text=result.get("answer", ""))
            
        return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@require_http_methods(["GET"])
def initial_state_api(request):
    """SPA 초기 로딩 시 인증 상태, 취향, 메시지 내역 등을 반환"""
    user = request.user
    
    # 기본값 설정
    auth = {
        "isAuthenticated": user.is_authenticated,
        "username": user.username if user.is_authenticated else None,
    }
    
    preferences = {
        "allergies": "없음",
        "difficulty": "초보",
        "cooking_time": "20분",
        "saved_sauces": [],
    }
    
    messages = []
    favorite_mongo_ids = []
    
    if user.is_authenticated:
        # 프로필에서 취향 로드
        profile, _ = Profile.objects.get_or_create(user=user)
        preferences = {
            "allergies": profile.allergies or "없음",
            "difficulty": profile.difficulty or "초보",
            "cooking_time": profile.cooking_time or "20분",
            "saved_sauces": profile.get_sauces_list(),
        }
        
        # 채팅 내역 (최근 20개)
        chat_qs = ChatMessage.objects.filter(user=user).order_by('created_at')[:20]
        for msg in chat_qs:
            messages.append({
                "role": msg.role,
                "text": msg.text,
            })
            
        # 즐겨찾기 ID 목록
        favorite_mongo_ids = list(Favorite.objects.filter(user=user).values_list('mongo_recipe_id', flat=True))

    return JsonResponse({
        "auth": auth,
        "messages": messages,
        "preferences": preferences,
        "favorite_mongo_ids": favorite_mongo_ids,
    })

@csrf_exempt
@require_http_methods(["POST"])
def signup_view(request):
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password1') or data.get('password') # password1 대응
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

@csrf_exempt
@require_http_methods(["GET", "POST"])
def favorites_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "로그인이 필요합니다."}, status=401)
    
    profile, _ = Profile.objects.get_or_create(user=request.user)
    
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            mongo_id = data.get('mongo_recipe_id')
            title = data.get('title')
            url = data.get('url', "")
            ingredients = data.get('ingredients_summary', "")
            snippet = data.get('answer_snippet', "")
            source = data.get('source', "db")
            
            if not title:
                return JsonResponse({"error": "제목이 없습니다."}, status=400)
            
            # mongo_id가 없는 경우(웹 검색 등)를 위해 처리
            fav, created = Favorite.objects.get_or_create(
                user=request.user,
                mongo_recipe_id=mongo_id or "",
                defaults={
                    "title": title,
                    "url": url,
                    "ingredients_summary": ingredients,
                    "answer_snippet": snippet,
                    "source": source
                }
            )
            
            if not created:
                return JsonResponse({"ok": True, "message": "이미 저장된 레시피입니다."})
            
            return JsonResponse({"ok": True})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    
    # GET: 목록 반환
    favs = Favorite.objects.filter(user=request.user)
    return JsonResponse({
        "favorites": [f.to_dict() for f in favs]
    })

@csrf_exempt
@require_http_methods(["DELETE", "POST"])
def favorite_delete_api(request, fav_id):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "로그인이 필요합니다."}, status=401)
    
    try:
        fav = Favorite.objects.get(user=request.user, id=fav_id)
        fav.delete()
        return JsonResponse({"ok": True})
    except Favorite.DoesNotExist:
        return JsonResponse({"error": "항목을 찾을 수 없습니다."}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
@csrf_exempt
@require_http_methods(["POST"])
def prefs_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "로그인이 필요합니다."}, status=401)
    
    try:
        data = json.loads(request.body)
        profile, _ = Profile.objects.get_or_create(user=request.user)
        
        profile.allergies = data.get('allergies', "없음")
        profile.difficulty = data.get('difficulty', "초보")
        profile.cooking_time = data.get('cooking_time', "20분")
        profile.saved_sauces = json.dumps(data.get('saved_sauces', []), ensure_ascii=False)
        profile.save()
        
        return JsonResponse({"ok": True})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def reset_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "로그인이 필요합니다."}, status=401)
    
    ChatMessage.objects.filter(user=request.user).delete()
    return JsonResponse({"ok": True})
