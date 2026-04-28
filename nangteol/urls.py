import os
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

urlpatterns = []

# 개발/데모 환경에서 정적 파일 서빙 활성화
if settings.DEBUG:
    # 1. /static/ 경로 서빙
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    # 2. React 빌드 에셋 (/assets/...) 명시적 서빙
    urlpatterns += [
        re_path(r'^assets/(?P<path>.*)$', serve, {
            'document_root': os.path.join(settings.BASE_DIR, 'recipes', 'static', 'recipes', 'dist', 'assets'),
        }),
        # 3. 파비콘 등 기타 루트 파일들
        re_path(r'^(?P<path>(favicon.ico|manifest.json))$', serve, {
            'document_root': os.path.join(settings.BASE_DIR, 'recipes', 'static', 'recipes', 'dist'),
        }),
    ]

urlpatterns += [
    path("admin/", admin.site.urls),
    path("", include("recipes.urls")),
]
