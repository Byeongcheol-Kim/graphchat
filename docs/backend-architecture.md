# 백엔드 아키텍처 설계

## 1. 기술 스택

### 핵심 기술
- **FastAPI**: 고성능 비동기 웹 프레임워크
- **FalkorDB**: 그래프 데이터베이스 (Redis 모듈)
- **OpenAI API**: LLM 및 임베딩 생성
- **WebSocket**: 실시간 양방향 통신
- **Redis**: 캐싱 레이어
- **UV**: Python 패키지 관리자

### 주요 라이브러리
- `pydantic`: 데이터 검증 및 설정 관리
- `langchain`: AI 오케스트레이션
- `falkordb`: FalkorDB Python 클라이언트
- `redis`: Redis 클라이언트
- `openai`: OpenAI API 클라이언트
- `python-jose`: JWT 토큰 처리
- `httpx`: 비동기 HTTP 클라이언트

## 2. 프로젝트 구조

```
graphchat/
├── backend/
│   ├── __init__.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── endpoints/
│   │   │   ├── __init__.py
│   │   │   ├── sessions.py      # 세션 관련 엔드포인트
│   │   │   ├── nodes.py         # 노드 CRUD
│   │   │   ├── messages.py      # 메시지 처리
│   │   │   ├── ai.py           # AI 대화 엔드포인트
│   │   │   └── websocket.py    # WebSocket 핸들러
│   │   └── dependencies.py     # FastAPI 의존성
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py          # 환경 설정
│   │   ├── security.py        # 인증/인가
│   │   └── exceptions.py      # 커스텀 예외
│   │
│   ├── db/
│   │   ├── __init__.py
│   │   ├── falkordb.py       # FalkorDB 연결 관리
│   │   ├── redis_cache.py    # Redis 캐시 관리
│   │   └── models/
│   │       ├── __init__.py
│   │       ├── session.py    # 세션 모델
│   │       ├── node.py       # 노드 모델
│   │       └── message.py    # 메시지 모델
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── graph_service.py      # 그래프 작업
│   │   ├── ai_service.py         # AI/LLM 서비스
│   │   ├── branching_service.py  # 분기 로직
│   │   ├── summary_service.py    # 요약 생성
│   │   └── embedding_service.py  # 임베딩 처리
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── session.py       # Pydantic 세션 스키마
│   │   ├── node.py          # Pydantic 노드 스키마
│   │   ├── message.py       # Pydantic 메시지 스키마
│   │   └── websocket.py     # WebSocket 메시지 스키마
│   │
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── logger.py        # 로깅 설정
│   │   └── helpers.py       # 유틸리티 함수
│   │
│   └── main.py              # FastAPI 앱 진입점
│
├── frontend/              # React 프론트엔드
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── conftest.py
│
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── .env.example
├── pyproject.toml
└── README.md
```

## 3. 데이터베이스 스키마

### FalkorDB 그래프 구조

#### 노드 타입
```cypher
// Session 노드
(:Session {
  id: string,
  title: string,
  created_at: datetime,
  updated_at: datetime,
  user_id: string,
  metadata: json
})

// Node 노드 (대화 노드)
(:Node {
  id: string,
  session_id: string,
  parent_id: string?,
  title: string,
  type: string,  // 'user', 'assistant', 'summary'
  is_summary: boolean,
  summary_content: string?,
  created_at: datetime,
  token_count: int,
  depth: int,
  is_active: boolean,
  metadata: json
})

// Message 노드
(:Message {
  id: string,
  node_id: string,
  role: string,  // 'user', 'assistant', 'system'
  content: string,
  timestamp: datetime,
  embedding: vector
})
```

#### 관계 타입
```cypher
// 세션-노드 관계
(Session)-[:HAS_NODE]->(Node)

// 노드 간 부모-자식 관계
(Node)-[:PARENT_OF]->(Node)

// 요약 노드와 소스 노드 관계
(Node {is_summary: true})-[:SUMMARIZES]->(Node)

// 노드-메시지 관계
(Node)-[:CONTAINS]->(Message)

// 의미적 유사성 관계 (임베딩 기반)
(Node)-[:SIMILAR_TO {score: float}]->(Node)
```

### Redis 캐시 구조
```python
# 세션 캐시
session:{session_id} = {session_data}

# 노드 캐시
node:{node_id} = {node_data}

# 활성 리프 노드 캐시
leaves:{session_id} = [node_ids]

# 임베딩 캐시
embedding:{content_hash} = vector
```

## 4. 핵심 서비스

### GraphService
```python
class GraphService:
    """FalkorDB 그래프 작업 관리"""
    
    async def create_session(self, title: str, user_id: str) -> Session
    async def get_session(self, session_id: str) -> Session
    async def create_node(self, session_id: str, parent_id: str, content: str) -> Node
    async def get_node_tree(self, session_id: str) -> List[Node]
    async def get_leaf_nodes(self, session_id: str) -> List[Node]
    async def find_similar_nodes(self, embedding: List[float], limit: int) -> List[Node]
```

### AIService
```python
class AIService:
    """OpenAI API 통합"""
    
    async def generate_response(self, messages: List[Message]) -> str
    async def generate_embedding(self, text: str) -> List[float]
    async def detect_topics(self, content: str) -> List[str]
    async def generate_title(self, content: str) -> str
```

### BranchingService
```python
class BranchingService:
    """자동 분기 로직"""
    
    async def analyze_branching_need(self, messages: List[Message]) -> bool
    async def create_branches(self, parent_node: Node, topics: List[str]) -> List[Node]
    async def should_summarize(self, node: Node) -> bool
```

### SummaryService
```python
class SummaryService:
    """요약 생성 및 관리"""
    
    async def create_summary(self, node_ids: List[str], is_manual: bool) -> Node
    async def generate_summary_content(self, nodes: List[Node]) -> str
    async def update_summary(self, summary_id: str, content: str) -> Node
```

## 5. API 엔드포인트

### REST API

#### 세션 관리
- `POST /api/sessions` - 새 세션 생성
- `GET /api/sessions` - 세션 목록 조회
- `GET /api/sessions/{session_id}` - 세션 상세 조회
- `DELETE /api/sessions/{session_id}` - 세션 삭제

#### 노드 관리
- `GET /api/sessions/{session_id}/nodes` - 노드 트리 조회
- `POST /api/sessions/{session_id}/nodes` - 노드 생성
- `GET /api/nodes/{node_id}` - 노드 상세 조회
- `PUT /api/nodes/{node_id}` - 노드 수정
- `DELETE /api/nodes/{node_id}` - 노드 삭제

#### 메시지 처리
- `POST /api/nodes/{node_id}/messages` - 메시지 추가
- `GET /api/nodes/{node_id}/messages` - 메시지 목록 조회

#### AI 대화
- `POST /api/chat` - AI 응답 생성
- `POST /api/chat/branch` - 분기 생성
- `POST /api/chat/summary` - 요약 생성

#### 검색
- `POST /api/search/similar` - 유사 노드 검색
- `POST /api/search/semantic` - 의미 기반 검색

### WebSocket API

```python
@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """실시간 대화 및 업데이트"""
    
    # 메시지 타입
    # - chat: 대화 메시지
    # - node_created: 새 노드 생성됨
    # - node_updated: 노드 업데이트됨
    # - summary_created: 요약 생성됨
    # - branch_detected: 분기 감지됨
```

## 6. 환경 설정

### .env 파일
```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# FalkorDB
FALKORDB_HOST=localhost
FALKORDB_PORT=6379
FALKORDB_GRAPH=branching_ai

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_DB=0

# Application
API_HOST=0.0.0.0
API_PORT=8000
API_PREFIX=/api
CORS_ORIGINS=["http://localhost:3000"]

# Security
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
```

## 7. Docker 구성

### docker-compose.yml
```yaml
version: '3.8'

services:
  falkordb:
    image: falkordb/falkordb:latest
    ports:
      - "6379:6379"
    volumes:
      - falkordb_data:/data

  redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    volumes:
      - redis_data:/data

  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - FALKORDB_HOST=falkordb
      - REDIS_HOST=redis
    depends_on:
      - falkordb
      - redis
    volumes:
      - ./backend:/app/backend

volumes:
  falkordb_data:
  redis_data:
```

## 8. 의존성 (pyproject.toml)

```toml
[project]
name = "graphchat"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.100.0",
    "uvicorn[standard]>=0.23.0",
    "pydantic>=2.0.0",
    "falkordb>=1.0.0",
    "redis>=5.0.0",
    "openai>=1.0.0",
    "langchain>=0.1.0",
    "python-jose[cryptography]>=3.3.0",
    "httpx>=0.24.0",
    "python-multipart>=0.0.6",
    "websockets>=11.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "pytest-asyncio>=0.21.0",
    "pytest-cov>=4.0.0",
    "ruff>=0.1.0",
    "mypy>=1.0.0",
]
```

## 9. 주요 구현 흐름

### 대화 플로우
1. 사용자가 메시지 전송
2. WebSocket으로 실시간 수신
3. 현재 노드의 컨텍스트 로드
4. AI 응답 생성
5. 분기 필요성 분석
6. 새 노드 생성 또는 분기
7. 그래프 업데이트
8. 클라이언트에 실시간 전송

### 요약 플로우
1. 토큰 한계 접근 감지
2. 요약 대상 노드 선택
3. AI로 요약 생성
4. 요약 노드 생성
5. 관계 설정 (SUMMARIZES)
6. 원본 노드 비활성화
7. 그래프 업데이트

### 검색 플로우
1. 검색 쿼리 수신
2. 임베딩 생성
3. FalkorDB 벡터 검색
4. 유사도 점수 계산
5. 결과 정렬 및 반환

## 10. 성능 최적화

### 캐싱 전략
- 세션 및 노드 데이터 Redis 캐싱
- 임베딩 결과 캐싱
- 활성 리프 노드 목록 캐싱

### 데이터베이스 최적화
- 인덱스 생성 (session_id, parent_id)
- 벡터 인덱스 최적화
- 쿼리 최적화 및 배치 처리

### 비동기 처리
- FastAPI 비동기 엔드포인트
- 비동기 데이터베이스 작업
- WebSocket 비동기 메시지 처리

## 11. 보안 고려사항

- JWT 기반 인증
- CORS 설정
- Rate limiting
- Input validation (Pydantic)
- SQL Injection 방지
- XSS 방지
- 환경 변수로 민감 정보 관리

## 12. 다음 단계

1. **Phase 1: 기본 설정**
   - FastAPI 프로젝트 구조 생성
   - FalkorDB 연결 설정
   - 기본 모델 및 스키마 정의

2. **Phase 2: 핵심 기능**
   - GraphService 구현
   - AIService OpenAI 통합
   - 기본 CRUD API 구현

3. **Phase 3: 고급 기능**
   - WebSocket 실시간 통신
   - 자동 분기 로직
   - 요약 생성 시스템

4. **Phase 4: 최적화**
   - Redis 캐싱 구현
   - 성능 튜닝
   - 테스트 작성