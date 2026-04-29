"""MongoDB Atlas 컬렉션 핸들 제공.

3차 프로젝트의 backend/db/mongo_db.py에서 import 경로를
backend.utils.config → recipes.utils.config 로 변경했습니다.
"""
from django.conf import settings
from pymongo import MongoClient

_mongo_client = None
_recipe_collection = None


def get_db_collection():
    """Django 설정을 참조하여 MongoDB 'recipes' 컬렉션을 반환합니다."""
    global _mongo_client, _recipe_collection

    if _recipe_collection is not None:
        return _recipe_collection

    cfg = settings.MONGO_SETTINGS
    uri = cfg.get("URI")
    db_name = cfg.get("DB_NAME")
    coll_name = cfg.get("COLLECTION_NAME")

    if not uri:
        raise ValueError("MONGO_URI가 설정되지 않았습니다. .env 또는 settings 확인 필요.")

    _mongo_client = MongoClient(uri, serverSelectionTimeoutMS=3000)
    db = _mongo_client[db_name]
    _recipe_collection = db[coll_name]
    return _recipe_collection
