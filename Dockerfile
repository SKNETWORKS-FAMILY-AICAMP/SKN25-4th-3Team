# 1단계: 프론트엔드 빌드 (Node.js)
FROM node:20-alpine AS build-stage
WORKDIR /app/recipes/frontend
COPY recipes/frontend/package*.json ./
RUN npm install
COPY recipes/frontend/ ./
RUN npm run build

# 2단계: 최종 서버 이미지 (Python)
FROM python:3.12-slim

# 환경 변수 설정
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 시스템 패키지 설치
RUN apt-get update && apt-get install -y \
    libpq-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 파이썬 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 전체 소스 코드 복사
COPY . .

# 빌드 스테이지에서 생성된 정적 파일 복사
COPY --from=build-stage /app/recipes/static/recipes/dist ./recipes/static/recipes/dist

# 정적 파일 모으기 (WhiteNoise 사용을 위해 필수)
RUN python manage.py collectstatic --noinput

# Gunicorn 실행
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120", "--access-logfile", "-", "nangteol.wsgi:application"]
