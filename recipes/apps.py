from django.apps import AppConfig


class RecipeAppConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "recipes"
    verbose_name = "냉털봇 레시피 추천"

    def ready(self):
        """앱 로드 시점에 RecipeAgent를 미리 초기화 (지연 로딩 방지)."""
        import os
        if os.environ.get("RUN_MAIN") != "true":
            return
        try:
            from recipes.rag import pipeline  # noqa: F401
        except Exception as e:
            print(f"⚠️ RAG 파이프라인 로드 실패: {e}")
