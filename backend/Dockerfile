FROM python:3.12-slim

WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# UV 설치
RUN pip install --no-cache-dir uv

# 전체 프로젝트 복사 (pyproject.toml이 프로젝트 정의를 포함하므로)
COPY pyproject.toml .
COPY uv.lock .
COPY backend ./backend

# UV로 현재 프로젝트를 editable 모드로 설치
RUN uv pip install --system -e .

# 포트 노출
EXPOSE 8432

# 헬스체크 엔드포인트
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8432/health || exit 1

# 서버 실행
CMD ["python", "-m", "backend.main"]