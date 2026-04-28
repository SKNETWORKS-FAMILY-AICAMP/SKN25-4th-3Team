from datetime import datetime, timedelta
import logging
import requests
import re
from bs4 import BeautifulSoup
from airflow import DAG
from airflow.operators.python import PythonOperator
from recipes.utils.config import MONGO_URI, DB_NAME
from pymongo import MongoClient

# ── 설정 및 헤더 ──────────────────────────────────────────────────────────────
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}
BASE_URL = "https://www.10000recipe.com"
LIST_URL = "https://www.10000recipe.com/recipe/list.html"

# ── 크롤링 보조 함수들 ─────────────────────────────────────────────────────────

def get_mongo_collection():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    return db["recipes"]

def clean_text(text: str) -> str:
    """불필요한 공백 및 '구매' 텍스트 제거"""
    text = re.sub(r'\s*구매\s*$', '', text).strip()
    text = re.sub(r' {2,}', ' ', text)
    return text

def parse_recipe_detail(url: str):
    """상세 페이지 파싱"""
    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(res.text, "html.parser")

        title = soup.select_one(".view2_summary h3") or soup.select_one("h3.view2_summary_h3")
        title = title.get_text(strip=True) if title else ""
        if not title: return None

        ingredients = [clean_text(li.get_text(" ", strip=True)) for li in soup.select(".ready_ingre3 ul li")]
        steps = [clean_text(st.get_text(" ", strip=True)) for st in soup.select(".view_step_cont")]

        return {
            "title": title,
            "url": url,
            "ingredients": ingredients,
            "steps": steps,
            "source": "10000recipe_sync",
            "created_at": datetime.now()
        }
    except Exception as e:
        logging.error(f"Error parsing {url}: {e}")
        return None

# ── 메인 동기화 로직 ──────────────────────────────────────────────────────────

def sync_from_10000_recipes():
    """만개의 레시피 '추천순' 목록에서 새로운 레시피를 가져와 MongoDB에 저장"""
    collection = get_mongo_collection()
    new_count = 0
    
    # 추천순(reco) 첫 2페이지 정도 탐색 (약 80개)
    for page in range(1, 3):
        params = {"order": "reco", "page": page}
        try:
            res = requests.get(LIST_URL, params=params, headers=HEADERS, timeout=10)
            soup = BeautifulSoup(res.text, "html.parser")
            links = [BASE_URL + a.get("href") for a in soup.select(".common_sp_list_li a.common_sp_link")]
            
            for url in links:
                # 중복 체크
                if collection.find_one({"url": url}):
                    continue
                
                recipe = parse_recipe_detail(url)
                if recipe:
                    collection.insert_one(recipe)
                    new_count += 1
                    logging.info(f"Added: {recipe['title']}")
                
        except Exception as e:
            logging.error(f"List page error (page {page}): {e}")

    logging.info(f"Sync complete. Added {new_count} new recipes from 10,000 Recipes.")

# ── DAG 정의 ──────────────────────────────────────────────────────────────────

default_args = {
    'owner': 'app',
    'start_date': datetime(2024, 4, 1),
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

with DAG(
    'recipe_weekly_auto_sync',
    default_args=default_args,
    description='만개의 레시피에서 새로운 데이터를 크롤링하여 MongoDB Atlas에 추가합니다.',
    schedule_interval='@weekly',
    catchup=False,
    tags=['recipe', 'sync', '10000recipe'],
) as dag:

    sync_task = PythonOperator(
        task_id='crawl_new_recipes_from_10000',
        python_callable=sync_from_10000_recipes,
    )
