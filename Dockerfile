# Python 3.12 슬림 버전 사용
FROM python:3.12-slim

# 환경 변수 설정 (Python 출력 버퍼링 방지 및 .pyc 미생성)
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# PostgreSQL 클라이언트 빌드에 필요한 시스템 패키지 설치
RUN apt-get update && apt-get install -y \
    libpq-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 작업 디렉토리 설정
WORKDIR /app

# 의존성 파일 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 전체 소스 코드 복사
COPY . .

# 정적 파일 모으기 (배포용)
# RUN python manage.py collectstatic --noinput

# Gunicorn을 사용하여 서버 실행 (포트 8000)
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120", "--access-logfile", "-", "nangteol.wsgi:application"]
