from django.urls import path, re_path
from recipes import views

app_name = "recipes"

urlpatterns = [
    # API Endpoints
    path("api/chat/", views.chat_api, name="chat_api"),
    path("api/initial-state/", views.initial_state_api, name="initial_state_api"),
    path("api/prefs/", views.prefs_api, name="prefs_api"),
    path("api/reset/", views.reset_api, name="reset_api"),
    path("api/favorites/", views.favorites_api, name="favorites_api"),
    path("api/favorites/<int:fav_id>/", views.favorite_delete_api, name="favorite_delete_api"),
    
    # Auth API
    path("api/accounts/login/", views.login_view, name="login_api"),
    path("api/accounts/signup/", views.signup_view, name="signup_api"),
    path("api/accounts/logout/", views.logout_view, name="logout_api"),

    # SPA Routes (나머지 모든 경로는 React index.html로 전송)
    re_path(r'^.*$', views.index, name="index"),
]
