# AI 냉털봇 (v2.0): 너의 냉장고를 구해줘

# 1. 팀 소개
| 이름 | GitHub | 역할 |
| :--- | :---: | :--- |
| 권가영 | [@Gayoung03](https://github.com/Gayoung03) | Django-React 통합 아키텍처 설계 및 RAG Fallback 고도화 |
| 김연준 | [@kgbrladuswns](https://github.com/kgbrladuswns) | PostgreSQL 스키마 정규화 및 Airflow 데이터 파이프라인 구축 |
| 전운열 | [@cudaboy](https://github.com/cudaboy) | LangChain RAG 파이프라인 고도화 및 시스템 프롬프트 최적화 |
| 조은석 | [@silverstone-1004](https://github.com/silverstone-1004) | Docker 인프라 오케스트레이션 및 데이터 동기화 자동화 |
| 최유림 | [@yulim8823](https://github.com/yulim8823) | React(Vite) 기반 SPA UI 구현 및 만개의 레시피 크롤러 개발 |

# 2. 프로젝트 기간
2026.04.28 - 2026.04.29 (2차 고도화 프로젝트)

# 3. 프로젝트 개요
## 📕 프로젝트명
"AI 냉털봇 (v2.0): 너의 냉장고를 구해줘" 
(Django-React 아키텍처 기반 지능형 레시피 추천 시스템)

## ✅ 프로젝트 배경 및 목적
• **통합 아키텍처**  
  분리되어 있던 FastAPI 백엔드와 Streamlit 프론트엔드를 **Django-React 아키텍처**로 통합하여 성능과 보안, 유지보수성을 극대화했습니다.

• **데이터 자동화**  
  수동으로 관리되던 레시피 데이터를 **Airflow**를 통해 매주 자동으로 최신화하는 MLOps 파이프라인을 구축했습니다.

• **지능형 답변**  
  단순 검색을 넘어 **3단 Fallback(DB → 웹 → LLM)** 시스템을 도입하여 답변의 질과 신뢰도를 높였습니다.

## ❤️ 핵심 성과 (v2.0)
• **남는 재료 최소화**  
  이전 KPI를 유지하며, 더욱 정밀해진 RAG 검색으로 재료 소진율을 향상시켰습니다.

• **사용자 편의성**  
  React 기반의 UI와 장고의 세션 관리 기능을 통해 안정적인 사용자 경험을 제공합니다.

• **신뢰성 보장**  
  DB에 없는 레시피는 실시간 웹 검색과 LLM 추정을 통해 "출처 뱃지"와 함께 제공하여 환각 현상을 방지합니다.

# 4. 핵심 기술 및 아키텍처

## 🏗️ 서비스 및 데이터 흐름 (System Architecture)
```mermaid
graph TD
    User([사용자]) -- "자연어 질의 (HTTPS)" --> Frontend[nangteol-frontend:5173<br/>React/Vite SPA]
    Frontend -- "API 요청 (JSON)" --> Backend[nangteol-web:8000<br/>Django/Gunicorn]
    
    subgraph "Relational Database"
        Backend -- "사용자 정보/로그 (CRUD)" --> Postgres[(nangteol-db:5433<br/>PostgreSQL)]
        Postgres --- T1[Profile: 유저 취향]
        Postgres --- T2[ChatMessage: 대화 기록]
        Postgres --- T3[Favorite: 찜한 레시피]
    end

    Backend -- "Session/Cache" --> Redis[(nangteol-redis:6379)]
    Backend -- "Vector Search (256d)" --> MongoDB[(MongoDB Atlas<br/>Recipe Vector DB)]
    
    subgraph "Automation Pipeline"
        Airflow[nangteol-airflow:8080<br/>Airflow] -- "Batch Update (Upsert)" --> MongoDB
        Airflow -- "Job Logs" --> Postgres
    end
    
    Backend -- "Fallback Search" --> Naver[Naver Blog API]
    
    style Frontend fill:#61DAFB,stroke:#333,stroke-width:2px,color:#000
    style Backend fill:#092E20,stroke:#333,stroke-width:2px,color:#fff
    style Airflow fill:#017CEE,stroke:#333,stroke-width:2px,color:#fff
```

## 📊 전략적 RAG 파이프라인 (Search Logic by Mode)
사용자의 검색 의도에 따라 최적화된 서로 다른 검색 전략을 수행합니다.

• **일반 검색 (Normal Mode)**: `DB Search` ➔ `Web Search` (**2단 Fallback**)
  - 내부 DB와 웹 검색 결과가 모두 없을 경우, 잘못된 정보를 제공하지 않기 위해 답변 생성을 중단하여 환각 현상을 방지합니다.

• **다이어트 특화 (Diet Mode)**: `DB Search` ➔ `Web Search` ➔ `LLM Inference` (**3단 Fallback**)
  - 결과가 없더라도 LLM의 전문 지식을 활용해 사용자의 알레르기와 취향을 반영한 건강 식단을 끝까지 제안합니다.

• **제철 식재료 (Seasonal Mode)**: `Monthly Data (JSON)` ➔ `Web Search`
  - 현재 날짜(월) 기반의 제철 지식 데이터를 먼저 참조한 뒤, 최신 웹 레시피를 실시간으로 요약하여 가장 신선한 정보를 제공합니다.

• **데이터 수집 자동화 (MLOps)**: `recipe_weekly_sync.py` DAG를 통해 매주 '만개의 레시피' 최신 데이터를 자동으로 크롤링하고 MongoDB에 동기화합니다.

# 5. 프로젝트 디렉토리 구조
```text
├── airflow/                    # Airflow DAG 및 로그 관리
│   └── dags/                   # [구현] recipe_weekly_sync.py (주간 자동 크롤러)
├── nangteol/                   # Django 프로젝트 핵심 설정
├── recipes/                    # 메인 어플리케이션 로직
    ├── frontend/               # React + Vite SPA 소스
    ├── rag/                    # RAG 파이프라인 (Diet, Seasonal Curator)
    ├── db/                     # MongoDB Atlas 연결 모듈
    ├── models.py               # PostgreSQL 스키마 (Profile, Message, Favorite)
    └── views.py                # REST API 엔드포인트
├── docker-compose.yml          # 전체 서비스 컨테이너 오케스트레이션
└── .env                        # 시스템 환경 변수 관리
```

# 6. 기술 스택
- **Web Framework & UI**
  - ![Django](https://img.shields.io/badge/django-%23092E20.svg?style=for-the-badge&logo=django&logoColor=white)
  - ![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
  - ![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)

- **Data Engineering & AI**
  - ![Apache Airflow](https://img.shields.io/badge/Apache%20Airflow-017CEE?style=for-the-badge&logo=Apache%20Airflow&logoColor=white)
  - ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
  - ![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=for-the-badge&logo=linkerd&logoColor=white)

# 7. 향후 과제 (Future Works)
• **사진 기반 재료 자동 인식 (Vision AI)**: 냉장고 사진 분석을 통한 자동 재료 입력 기능.
• **멀티모달 답변**: 조리 과정 이미지 생성 및 실제 조리 영상 연동 인터페이스.

# 8. 수행 결과 (v2.0)
*(여기에 4차 프로젝트 작동 스크린샷이나 시연 영상을 삽입하세요)*
