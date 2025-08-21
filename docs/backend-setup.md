# 백엔드 설정 및 실행 가이드

## 환경 설정

### 1. 환경 변수 설정
`.env` 파일을 프로젝트 루트에 생성하거나 `.env.example`을 복사하여 수정:

```bash
cp .env.example .env
```

주요 환경 변수:
- `OPENROUTER_API_KEY`: OpenRouter API 키 (무료 LLM 사용)
- `FALKORDB_PORT`: FalkorDB 포트 (기본값: 6382)
- `REDIS_PORT`: Redis 캐시 포트 (기본값: 6380, 선택적)

### 2. 의존성 설치

```bash
# Python 3.12 필요
python -m venv .venv
source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
```

## 서비스 실행

### 1. FalkorDB 실행 (필수)

```bash
# Docker Compose 사용
docker-compose up -d falkordb

# 또는 Docker 직접 실행
docker run -d -p 6382:6379 --name falkordb falkordb/falkordb:latest
```

### 2. Redis 캐시 실행 (선택적)

```bash
# Docker Compose 사용
docker-compose up -d redis

# 또는 Docker 직접 실행
docker run -d -p 6380:6379 --name redis-cache redis:latest
```

### 3. 백엔드 서버 실행

```bash
# 개발 모드
python -m backend.main

# 또는 uvicorn 직접 실행
uvicorn backend.main:app --reload --port 8000
```

서버는 http://localhost:8000 에서 실행됩니다.

## API 테스트

### 세션 생성
```bash
curl -X POST "http://localhost:8000/api/v1/sessions/" \
  -H "Content-Type: application/json" \
  -d '{"title": "새 세션", "metadata": {"theme": "dark"}}'
```

### 세션 목록 조회
```bash
curl "http://localhost:8000/api/v1/sessions/"
```

### 노드 생성
```bash
curl -X POST "http://localhost:8000/api/v1/nodes/" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "SESSION_ID",
    "parent_id": "PARENT_NODE_ID",
    "title": "새 노드",
    "content": "노드 내용",
    "type": "branch"
  }'
```

## 테스트 실행

### 단위 테스트
```bash
# 모든 테스트
pytest

# 특정 테스트 파일
pytest tests/test_falkordb.py

# 상세 출력
pytest -v -s
```

### 통합 테스트
```bash
# FalkorDB가 실행 중이어야 함
pytest tests/integration/

# 특정 통합 테스트
pytest tests/integration/test_api_int.py -v
```

### FalkorDB 쿼리 테스트
```bash
# FalkorDB 연결 및 쿼리 테스트
pytest tests/test_falkordb.py -v -s
```

## 문제 해결

### FalkorDB 연결 실패
- 포트 확인: 기본 포트는 6382입니다 (표준 Redis 6379와 충돌 방지)
- 컨테이너 상태 확인: `docker ps`
- 로그 확인: `docker logs falkordb`

### 세션 생성 실패
- FalkorDB가 실행 중인지 확인
- 환경 변수가 올바르게 설정되었는지 확인
- 서버 로그에서 상세 에러 메시지 확인

### OpenRouter API 실패
- API 키가 올바른지 확인
- 무료 모델 사용 중인지 확인 (예: `google/gemini-2.0-flash-exp:free`)

## 개발 도구

### 코드 품질 검사
```bash
# 포맷팅
ruff format backend/

# 린팅
ruff check backend/

# 타입 체크
mypy backend/
```

### 로그 레벨 조정
`.env` 파일에서 `LOG_LEVEL` 조정:
- `DEBUG`: 모든 로그 표시
- `INFO`: 일반 정보 표시
- `WARNING`: 경고 이상만 표시
- `ERROR`: 에러만 표시

## 프로덕션 배포

### 환경 변수 수정
```bash
DEBUG=false
LOG_LEVEL=INFO
JWT_SECRET=<강력한 비밀키>
```

### Gunicorn 사용
```bash
gunicorn backend.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
```

### Docker 이미지 빌드
```bash
docker build -t graphchat-backend .
docker run -p 8000:8000 graphchat-backend
```