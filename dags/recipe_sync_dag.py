from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
import logging

# 기본 설정
default_args = {
    'owner': 'nangteol',
    'depends_on_past': False,
    'start_date': datetime(2026, 4, 28),
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

def crawl_recipes():
    logging.info("Task 1: 네이버/구글에서 새로운 레시피 정보를 수집 중...")
    # 실전 로직: requests, beautifulsoup 등을 사용한 크롤링 코드 삽입
    return "Crawl Success"

def process_data():
    logging.info("Task 2: 수집된 데이터를 JSON 포맷으로 정제 중...")
    # 실전 로직: 데이터 정제 및 필터링
    return "Process Success"

def vector_indexing():
    logging.info("Task 3: OpenAI API를 사용하여 데이터를 벡터로 변환 및 MongoDB 저장 중...")
    # 실전 로직: OpenAI Embedding + MongoDB Atlas Vector Search Upsert
    return "Indexing Success"

with DAG(
    'recipe_sync_pipeline',
    default_args=default_args,
    description='매일 새벽 2시 레시피 동기화 파이프라인',
    schedule_interval='0 2 * * *',  # 매일 새벽 2시
    catchup=False,
) as dag:

    t1 = PythonOperator(
        task_id='crawl_new_recipes',
        python_callable=crawl_recipes,
    )

    t2 = PythonOperator(
        task_id='process_and_chunk',
        python_callable=process_data,
    )

    t3 = PythonOperator(
        task_id='upsert_to_vector_db',
        python_callable=vector_indexing,
    )

    t1 >> t2 >> t3
