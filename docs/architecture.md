# Branching AI - 아키텍처 문서

## 프로젝트 개요

**Branching AI**는 지능적인 주제 분기와 컨텍스트 관리를 통해 AI 대화를 향상시키는 그래프 기반 사고 분기 시스템입니다. 사용자가 여러 대화 경로를 동시에 탐색하면서도 각 브랜치 간의 컨텍스트와 연결을 유지할 수 있도록 합니다.

## 도메인 용어 정리

### 핵심 엔티티

| 용어 | 설명 | 이전 용어 |
|------|------|----------|
| **Session** | 전체 대화 세션. 여러 노드와 메시지를 포함하는 최상위 컨테이너 | - |
| **Node** | 대화의 분기점. 독립적인 컨텍스트를 가진 대화 단위 | Branch |
| **Message** | 노드 내의 개별 메시지. 사용자 또는 AI의 발화 | - |
| **Summary** | 여러 노드를 압축/요약한 특별한 노드 | Merge |

### 노드 타입 (NodeType)

- **main**: 메인 대화 흐름
- **topic**: 특정 주제로 분기된 대화
- **exploration**: 탐색적 대화 분기
- **alternative**: 대안적 접근 방식
- **summary**: 여러 노드를 요약한 노드 (이전: merge)
- **reference**: 다른 노드를 참조하는 노드

### 노드 상태 (NodeStatus)

- **active**: 활성 상태 (진행 중)
- **paused**: 일시 정지
- **completed**: 완료됨
- **archived**: 보관됨

### 관계 타입

- **Parent-Child**: 일반적인 부모-자식 관계 (`parentId`)
- **Summary-Source**: 요약 노드와 원본 노드들의 관계 (`sourceNodeIds`)
- **Reference**: 참조 관계

## 모듈 구조

### 백엔드 (Python/FastAPI)
```
backend/
├── src/
│   ├── api/
│   │   ├── routers/
│   │   │   ├── sessions.py      # 세션 관리 API
│   │   │   ├── nodes.py         # 노드 CRUD API
│   │   │   ├── messages.py      # 메시지 관리 API
│   │   │   └── ai.py           # AI 관련 API
│   │   ├── websocket/
│   │   │   └── handlers.py     # WebSocket 핸들러
│   │   └── middleware/
│   │       └── auth.py         # 인증 미들웨어
│   ├── services/
│   │   ├── graph_service.py    # 그래프 DB 서비스
│   │   ├── ai_service.py       # AI/LLM 서비스
│   │   ├── branching_service.py # 분기 로직
│   │   └── summary_service.py  # 요약 생성
│   ├── db/
│   │   ├── falkordb.py        # FalkorDB 연결
│   │   └── redis.py           # Redis 캐싱
│   ├── models/
│   │   ├── session.py         # 세션 모델
│   │   ├── node.py           # 노드 모델
│   │   └── message.py        # 메시지 모델
│   └── utils/
│       ├── embeddings.py      # 임베딩 유틸
│       └── token_counter.py   # 토큰 카운팅
├── tests/
├── pyproject.toml
└── main.py
```

### 프론트엔드 (React/TypeScript)
```
frontend/
├── src/
│   ├── types/               # 타입 정의
│   │   ├── node.types.ts    # 노드 관련 타입
│   │   ├── message.types.ts # 메시지 타입
│   │   └── settings.types.ts # 설정 타입
│   ├── store/               # Zustand 스토어
│   │   ├── nodeStore.ts     # 노드 관리 (주요 스토어)
│   │   ├── messageStore.ts  # 메시지 관리
│   │   ├── settingsStore.ts # 설정 관리
│   │   └── conversationStore.ts # 통합 스토어
│   ├── features/            # 기능별 모듈
│   │   ├── graph/           # 그래프 시각화
│   │   │   └── components/
│   │   │       ├── GraphCanvas.tsx      # 메인 그래프 캔버스
│   │   │       ├── EnhancedNode.tsx     # 노드 컴포넌트
│   │   │       ├── LeafNodesDashboard.tsx # 리프 노드 대시보드
│   │   │       └── SummaryDialog.tsx    # 요약 생성 다이얼로그
│   │   └── chat/            # 채팅 인터페이스
│   └── shared/              # 공통 모듈
│       ├── components/      # 공통 컴포넌트
│       ├── hooks/           # 커스텀 훅
│       └── theme/           # 테마 설정
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

## 데이터베이스 스키마

### FalkorDB 그래프 구조

```cypher
// 노드 타입
(s:Session {
  id: String,
  name: String,
  created_at: DateTime,
  updated_at: DateTime
})

(n:Node {
  id: String,
  session_id: String,
  title: String,
  type: String,
  status: String,
  is_summary: Boolean,
  summary_content: String,
  token_count: Integer,
  embedding: Vector,
  created_at: DateTime,
  updated_at: DateTime
})

(m:Message {
  id: String,
  node_id: String,
  role: String,
  content: String,
  timestamp: DateTime
})

// 관계 타입
(s)-[:HAS_NODE]->(n)
(n1)-[:PARENT_OF]->(n2)
(n1)-[:SUMMARIZED_FROM]->(n2)  // 요약 관계
(n1)-[:REFERENCES]->(n2)        // 참조 관계
(n)-[:HAS_MESSAGE]->(m)
```

## API 엔드포인트

### 세션 관리
- `GET /api/sessions` - 세션 목록
- `POST /api/sessions` - 새 세션 생성
- `GET /api/sessions/{id}` - 세션 상세
- `DELETE /api/sessions/{id}` - 세션 삭제

### 노드 관리
- `GET /api/nodes` - 노드 목록
- `POST /api/nodes` - 노드 생성
- `GET /api/nodes/{id}` - 노드 상세
- `PUT /api/nodes/{id}` - 노드 수정
- `DELETE /api/nodes/{id}` - 노드 삭제
- `POST /api/nodes/summary` - 요약 노드 생성
- `POST /api/nodes/branch` - 자동 분기

### 메시지 관리
- `GET /api/messages` - 메시지 목록
- `POST /api/messages` - 메시지 생성
- `DELETE /api/messages/{id}` - 메시지 삭제

### AI 기능
- `POST /api/ai/complete` - AI 응답 생성
- `POST /api/ai/suggest-branches` - 분기 제안
- `POST /api/ai/summarize` - 요약 생성
- `POST /api/ai/analyze-topic` - 주제 분석

### WebSocket
- `ws://localhost:8000/ws/{session_id}` - 실시간 연결

## 핵심 서비스

### GraphService
```python
class GraphService:
    def create_node(self, session_id: str, node_data: NodeCreate) -> Node
    def get_node_descendants(self, node_id: str) -> List[Node]
    def get_leaf_nodes(self, session_id: str) -> List[Node]
    def create_summary_relationship(self, summary_id: str, source_ids: List[str])
    def find_similar_nodes(self, embedding: List[float], limit: int) -> List[Node]
```

### AIService
```python
class AIService:
    async def generate_response(self, messages: List[Message]) -> str
    async def detect_topics(self, content: str) -> List[Topic]
    async def generate_summary(self, nodes: List[Node], instructions: str = None) -> str
    async def generate_embedding(self, text: str) -> List[float]
    async def suggest_branches(self, current_node: Node) -> List[BranchSuggestion]
```

### BranchingService
```python
class BranchingService:
    async def auto_branch(self, node_id: str, message: str) -> List[Node]
    async def should_branch(self, context: str, new_message: str) -> bool
    async def create_branch(self, parent_id: str, branch_type: str, title: str) -> Node
    async def merge_contexts(self, node_ids: List[str]) -> str
```

## 주요 기능 구현

### 자동 분기
1. 사용자 메시지 입력
2. AIService가 주제 감지
3. BranchingService가 분기 필요성 판단
4. 필요시 자동으로 새 노드 생성
5. WebSocket으로 프론트엔드 업데이트

### 컨텍스트 관리
1. 각 노드별 독립적인 메시지 히스토리
2. 토큰 수 추적 및 제한
3. 임계값 도달 시 자동 요약
4. 요약 노드 생성으로 컨텍스트 압축

### 교차 연결
1. 벡터 임베딩으로 유사도 계산
2. 관련 노드 자동 발견
3. 참조 관계 생성
4. UI에서 시각적 표현

## 배포 및 인프라

### Docker 구성
```yaml
services:
  falkordb:
    image: falkordb/falkordb:latest
    ports:
      - "6379:6379"
  
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - FALKORDB_URI=redis://falkordb:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://backend:8000
```

### 환경 변수
```bash
# Backend
OPENAI_API_KEY=sk-...
FALKORDB_URI=redis://localhost:6379
FALKORDB_GRAPH_NAME=branching_ai
JWT_SECRET=your-secret-key
CORS_ORIGINS=http://localhost:3000

# Frontend
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

## 성능 최적화

### 프론트엔드
- React.memo로 불필요한 리렌더링 방지
- 가상화로 대량 노드 처리
- 디바운싱으로 API 호출 최적화
- 레이지 로딩으로 초기 로드 개선

### 백엔드
- Redis 캐싱으로 반복 쿼리 최적화
- 배치 처리로 DB 쿼리 최소화
- 비동기 처리로 동시성 향상
- 인덱싱으로 그래프 쿼리 속도 개선