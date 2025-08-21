FROM python:3.12-slim

WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치
COPY pyproject.toml .
COPY requirements.txt* .

# requirements.txt가 있으면 pip로, 없으면 pyproject.toml 파싱해서 설치
RUN if [ -f requirements.txt ]; then \
        pip install --no-cache-dir -r requirements.txt; \
    else \
        pip install --no-cache-dir fastapi uvicorn pydantic pydantic-settings \
        google-generativeai falkordb python-multipart \
        websockets python-jose[cryptography] passlib bcrypt \
        python-dotenv httpx; \
    fi

# 소스 코드 복사
COPY . .

# 포트 노출
EXPOSE 8432

# 헬스체크 엔드포인트
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8432/health || exit 1

# 서버 실행
CMD ["python", "main.py"]