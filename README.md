<div align="center">

# GraphChat

**차세대 그래프 기반 AI 대화 시스템**

지능형 브랜칭과 컨텍스트 보존을 통해 복잡한 사고 과정을 시각화하고 탐색하는 혁신적인 대화 플랫폼

[![Python](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB.svg)](https://reactjs.org/)
[![FalkorDB](https://img.shields.io/badge/FalkorDB-Latest-red.svg)](https://www.falkordb.com/)
[![License](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)

[데모](#빠른-시작-가이드) • [문서](#api-문서) • [기술 스택](#기술-스택) • [로드맵](#로드맵)

</div>

---

## 개요

GraphChat은 기존 선형 대화의 한계를 극복하기 위해 설계된 그래프 기반 AI 대화 시스템입니다. 단일 대화 경로를 벗어나 여러 주제를 동시에 탐색하고, 각 대화 분기의 컨텍스트를 독립적으로 관리하며, 필요시 서로 다른 사고 흐름을 연결할 수 있습니다.

### 해결하는 문제

- **컨텍스트 손실**: 대화가 길어질수록 초기 맥락이 희석되는 문제
- **사고 분산**: 여러 주제가 혼재될 때 집중력 저하
- **탐색 제약**: 한 번에 하나의 방향만 탐색 가능한 제약
- **지식 단편화**: 관련된 대화 간 연결 부재

## 핵심 기능

### 지능형 대화 브랜칭
- **자동 주제 감지**: AI가 대화에서 새로운 주제를 자동으로 식별하고 분기 제안
- **컨텍스트 보존**: 각 브랜치가 독립적인 대화 히스토리와 컨텍스트 유지
- **스마트 요약**: 토큰 한계 도달 시 자동 요약으로 장기 대화 지원

### 시각적 그래프 인터페이스
- **실시간 렌더링**: React Flow 기반 인터랙티브 그래프 시각화
- **직관적 탐색**: 노드 클릭/드래그로 대화 흐름 탐색
- **다중 뷰**: 트리 뷰, 리프 노드 대시보드 등 다양한 시각화 모드

### 고급 컨텍스트 관리
- **그래프 데이터베이스**: FalkorDB를 활용한 효율적인 그래프 저장 및 쿼리
- **벡터 임베딩**: 의미 기반 유사 대화 검색 및 추천
- **크로스 링크**: 서로 다른 브랜치 간 연결로 복합적 사고 구조화

### 실시간 협업 지원
- **WebSocket 통신**: 실시간 그래프 업데이트 및 동기화
- **세션 관리**: 여러 대화 세션 저장 및 복원
- **내보내기 기능**: 대화 트리를 JSON/Markdown 형식으로 저장 (개발 예정)

## 사용 사례

### 학습 및 연구
복잡한 주제를 학습할 때 여러 하위 주제를 동시에 탐색하고, 각 개념 간 연결 관계를 시각화합니다.
```
"머신러닝 배우기"
  ├─ 지도 학습 알고리즘
  ├─ 비지도 학습 기법
  └─ 딥러닝 아키텍처
```

### 문제 해결
복잡한 문제에 대해 여러 해결 방안을 병렬로 탐색하고, 최적의 솔루션을 도출합니다.
```
"시스템 성능 최적화"
  ├─ 데이터베이스 쿼리 개선
  ├─ 캐싱 전략 도입
  └─ 서버 리소스 증설
```

### 창의적 작업
소설, 시나리오 등 창작 활동에서 다양한 플롯 라인을 동시에 발전시키고 연결합니다.
```
"SF 소설 플롯"
  ├─ 주인공 캐릭터 개발
  ├─ 세계관 설정
  └─ 주요 갈등 구조
```

### 기술 설계
시스템 아키텍처 설계 시 여러 기술 스택과 패턴을 비교 검토합니다.
```
"마이크로서비스 설계"
  ├─ 서비스 분리 전략
  ├─ 통신 프로토콜 선택
  └─ 데이터 일관성 관리
```

## 빠른 시작 가이드

### 방법 1: Docker Compose로 한 번에 실행 (추천)

가장 간단한 방법입니다. Docker만 있으면 됩니다!

```bash
# 1. 저장소 클론
git clone https://github.com/yourusername/graphchat.git
cd graphchat

# 2. 환경 변수 설정
cp .env.example .env
# 텍스트 에디터로 .env 파일을 열고 GOOGLE_API_KEY 설정 (필수!)

# 3. 전체 시스템 실행
docker-compose up

# 4. 브라우저에서 접속
# http://localhost:3432
```

### 방법 2: 로컬 개발 환경에서 실행

#### 사전 요구사항
- Python 3.12+
- Node.js 20+
- Docker (FalkorDB용)

#### 단계별 설치

```bash
# 1. 저장소 클론
git clone https://github.com/yourusername/graphchat.git
cd graphchat

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일 편집 - GOOGLE_API_KEY 필수!

# 3. FalkorDB 실행 (Docker 필요)
docker run -d --name falkordb -p 6432:6379 falkordb/falkordb

# 4. 백엔드 실행 (새 터미널)
cd backend
pip install -r requirements.txt
python main.py
# 백엔드가 http://localhost:8432 에서 실행됨

# 5. 프론트엔드 실행 (새 터미널)
cd frontend
npm install
npm run dev
# 프론트엔드가 http://localhost:3432 에서 실행됨

# 6. 브라우저에서 접속
# http://localhost:3432
```

## API 키 발급 방법

### Google Gemini API 키 (추천 - 무료)
1. [Google AI Studio](https://aistudio.google.com/apikey) 접속
2. Google 계정으로 로그인
3. "Create API Key" 클릭
4. 발급받은 키를 `.env` 파일의 `GOOGLE_API_KEY`에 붙여넣기

### OpenRouter API 키 (대안 - 무료 모델 제공)
1. [OpenRouter](https://openrouter.ai/keys) 접속
2. 회원가입 또는 로그인
3. "Create Key" 클릭
4. `.env` 파일에서 OpenRouter 관련 줄 주석 해제 후 키 입력

## 시스템 아키텍처

### 전체 구조
```
┌──────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  React 18 + TypeScript + Zustand                           │  │
│  │  • React Flow (그래프 시각화)                               │  │
│  │  • Material-UI (UI 컴포넌트)                                │  │
│  │  • WebSocket Client (실시간 통신)                           │  │
│  └────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬─────────────────────────────────────┘
                             │ REST API / WebSocket
┌────────────────────────────▼─────────────────────────────────────┐
│                      Application Layer                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  FastAPI + Pydantic                                        │  │
│  │  • Chat Service (대화 처리)                                 │  │
│  │  • Branching Service (자동 분기)                            │  │
│  │  • Vector Search Service (의미 검색)                        │  │
│  │  • Recommendation Service (브랜치 추천)                     │  │
│  └────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬─────────────────────────────────────┘
                             │ Cypher Query / Vector Operations
┌────────────────────────────▼─────────────────────────────────────┐
│                         Data Layer                               │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  FalkorDB (Graph + Vector Database)                        │  │
│  │  • 그래프 구조 저장 (노드, 엣지, 관계)                        │  │
│  │  • 벡터 임베딩 저장 및 검색                                  │  │
│  │  • Cypher 쿼리 최적화                                       │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  AI Service Layer    │
                  │  • Google Gemini     │
                  │  • OpenRouter (대안)  │
                  └──────────────────────┘
```

### 핵심 컴포넌트

#### 1. Graph Service
- FalkorDB와의 연결 관리
- Cypher 쿼리 실행 및 최적화
- 노드/엣지 CRUD 작업

#### 2. Branching Agent
- 대화 분석 및 주제 추출
- 자동 브랜치 생성 로직
- 컨텍스트 요약 및 관리

#### 3. Vector Search
- 임베딩 생성 (Google Gemini)
- 유사도 기반 검색
- 관련 대화 추천

#### 4. WebSocket Manager
- 실시간 클라이언트 연결 관리
- 그래프 업데이트 브로드캐스트
- 세션 동기화

### 데이터 모델

```cypher
// 노드 타입
(User:Message {type: "user", content: "...", timestamp: ...})
(Assistant:Message {type: "assistant", content: "...", timestamp: ...})
(Branch:Node {name: "...", reason: "..."})
(Summary:Node {content: "...", parent_ids: [...]})

// 관계 타입
(:Message)-[:PARENT_OF]->(:Message)
(:Branch)-[:BRANCH_FROM]->(:Message)
(:Summary)-[:SUMMARIZES]->(:Message)
(:Node)-[:CROSS_LINK {reason: "..."}]->(:Node)
```

## 기술 스택

### Backend
| 기술 | 용도 | 특징 |
|------|------|------|
| **FastAPI** | 웹 프레임워크 | 고성능 비동기 처리, 자동 API 문서 생성 |
| **FalkorDB** | 그래프 DB | Redis 기반, Cypher 쿼리, 벡터 검색 지원 |
| **Google Gemini** | AI 모델 | 대화 생성, 임베딩, 주제 분석 |
| **Pydantic** | 데이터 검증 | 타입 안정성, 자동 직렬화/역직렬화 |
| **Dependency Injector** | IoC 컨테이너 | 의존성 관리, 테스트 용이성 |
| **WebSocket** | 실시간 통신 | 양방향 통신, 실시간 그래프 업데이트 |
| **Python 3.12+** | 런타임 | 최신 타입 힌팅, 성능 개선 |

### Frontend
| 기술 | 용도 | 특징 |
|------|------|------|
| **React 18** | UI 프레임워크 | Concurrent 렌더링, 자동 배칭 |
| **TypeScript** | 정적 타입 | 타입 안정성, IDE 지원 |
| **React Flow** | 그래프 시각화 | 커스터마이징 가능한 노드/엣지, 인터랙션 |
| **Material-UI** | UI 컴포넌트 | 일관된 디자인 시스템, 접근성 |
| **Zustand** | 상태 관리 | 경량, 간단한 API, Redux 대안 |
| **Vite** | 빌드 도구 | 빠른 HMR, 최적화된 번들링 |

### DevOps
- **Docker Compose**: 멀티 컨테이너 오케스트레이션
- **GitHub Actions**: CI/CD 파이프라인 (계획)
- **Pytest**: 단위/통합 테스트
- **Ruff**: 린팅 및 포매팅

## 문제 해결

### 포트가 이미 사용 중인 경우
```bash
# FalkorDB 포트 (6432) 변경
# .env 파일에서 FALKORDB_PORT=6433 으로 변경

# 백엔드 포트 (8432) 변경
# .env 파일에서 API_PORT=8433 으로 변경

# 프론트엔드 포트는 자동으로 다음 가능한 포트 사용
```

### Docker 실행 권한 문제 (Linux)
```bash
sudo usermod -aG docker $USER
# 로그아웃 후 다시 로그인
```

### API 키 오류
- `.env` 파일에 API 키가 올바르게 설정되었는지 확인
- Google AI Studio에서 API 키가 활성화되어 있는지 확인

## 로드맵

### 완료된 기능
- [x] 기본 채팅 인터페이스
- [x] 그래프 시각화 (React Flow)
- [x] 자동 브랜치 생성
- [x] 세션 관리
- [x] 노드 타입별 색상 구분
- [x] 리프 노드 대시보드
- [x] 브랜치 추천 시스템
- [x] 벡터 임베딩 검색
- [x] 실시간 WebSocket 통신

### 개발 예정
- [ ] 고급 요약 기능
- [ ] 다중 사용자 지원
- [ ] 대화 트리 내보내기 (JSON/Markdown)
- [ ] 브랜치 병합 기능
- [ ] AI 모델 선택 옵션
- [ ] 대화 히스토리 검색
- [ ] 협업 기능

## 개발 가이드

### 프로젝트 구조
```
graphchat/
├── backend/
│   ├── api/              # API 엔드포인트
│   │   ├── endpoints/    # REST 엔드포인트
│   │   └── websocket/    # WebSocket 핸들러
│   ├── core/             # 핵심 설정 및 의존성
│   ├── db/               # 데이터베이스 연결
│   ├── schemas/          # Pydantic 모델
│   ├── services/         # 비즈니스 로직
│   │   ├── chat_service.py
│   │   ├── branching_service.py
│   │   ├── vector_search_service.py
│   │   └── ...
│   └── tests/            # 테스트 코드
├── frontend/
│   ├── src/
│   │   ├── components/   # React 컴포넌트
│   │   ├── services/     # API 클라이언트
│   │   ├── stores/       # Zustand 스토어
│   │   └── types/        # TypeScript 타입
│   └── public/
├── docs/                 # 문서
│   └── prd.md           # 제품 요구사항 문서
├── scripts/              # 유틸리티 스크립트
└── docker-compose.yml    # Docker 설정
```

### API 문서
서버 실행 후 자동 생성된 API 문서 확인:
- **Swagger UI**: http://localhost:8432/docs (인터랙티브 테스트 가능)
- **ReDoc**: http://localhost:8432/redoc (문서 중심 뷰)

### 주요 API 엔드포인트

#### 세션 관리
```http
POST   /api/v1/sessions          # 새 세션 생성
GET    /api/v1/sessions          # 세션 목록 조회
GET    /api/v1/sessions/{id}     # 세션 상세 조회
DELETE /api/v1/sessions/{id}     # 세션 삭제
```

#### 메시지 및 대화
```http
POST   /api/v1/messages/chat     # 채팅 메시지 전송
GET    /api/v1/messages/{id}     # 메시지 조회
```

#### 노드 및 그래프
```http
GET    /api/v1/nodes/tree/{id}   # 노드 트리 조회
POST   /api/v1/nodes/branch      # 수동 브랜치 생성
GET    /api/v1/nodes/leaves      # 리프 노드 목록
```

#### 추천 및 검색
```http
GET    /api/v1/recommendations/branches  # AI 브랜치 추천
POST   /api/v1/vector-search/similar     # 의미 기반 유사 노드 검색
```

#### WebSocket
```
WS     /api/v1/ws/{session_id}   # 실시간 업데이트
```

### 테스트

```bash
# 전체 테스트 스위트 실행
bash scripts/run_tests.sh

# 백엔드 단위 테스트
cd backend
pytest -v

# 커버리지 포함 테스트
pytest --cov=backend --cov-report=html

# 특정 모듈 테스트
pytest tests/services/test_branching_service.py

# 통합 테스트
pytest tests/api/endpoints/

# LLM 브랜칭 테스트 (실제 API 키 필요)
python scripts/test_llm_branching.py
```

### 개발 워크플로우

1. **환경 설정**
   ```bash
   # 가상 환경 생성 및 활성화
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate

   # 의존성 설치
   cd backend && pip install -r requirements.txt
   cd ../frontend && npm install
   ```

2. **데이터베이스 실행**
   ```bash
   docker run -d --name falkordb -p 6432:6379 falkordb/falkordb
   ```

3. **백엔드 개발 모드**
   ```bash
   cd backend
   python main.py  # 또는 uvicorn main:app --reload
   ```

4. **프론트엔드 개발 모드**
   ```bash
   cd frontend
   npm run dev
   ```

5. **코드 품질 체크**
   ```bash
   # 백엔드 린팅
   cd backend
   ruff check .
   ruff format .
   mypy .

   # 프론트엔드 린팅
   cd frontend
   npm run lint
   ```

## 기여하기

GraphChat은 오픈소스 프로젝트로, 커뮤니티의 기여를 환영합니다!

### 기여 방법

1. **저장소 포크**
   ```bash
   git clone https://github.com/yourusername/graphchat.git
   cd graphchat
   ```

2. **기능 브랜치 생성**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **개발 환경 설정**
   - 위의 [개발 가이드](#개발-가이드) 참조
   - 코드 스타일 가이드 준수 (Ruff, ESLint)
   - 테스트 작성 및 실행

4. **변경사항 커밋**
   ```bash
   git commit -m "feat: Add amazing feature"
   ```

   **커밋 메시지 컨벤션**:
   - `feat`: 새 기능
   - `fix`: 버그 수정
   - `docs`: 문서 변경
   - `style`: 코드 포매팅
   - `refactor`: 리팩토링
   - `test`: 테스트 추가/수정
   - `chore`: 빌드/설정 변경

5. **푸시 및 PR 생성**
   ```bash
   git push origin feature/amazing-feature
   ```
   - GitHub에서 Pull Request 생성
   - 명확한 제목과 설명 작성
   - 관련 이슈 링크 (있는 경우)

### 기여 가이드라인

- **코드 품질**: 린팅 및 타입 체크 통과 필수
- **테스트**: 새 기능에 대한 테스트 작성
- **문서화**: 주요 변경사항은 문서 업데이트
- **작은 PR**: 리뷰 용이성을 위해 PR 크기 최소화
- **이슈 우선**: 큰 변경은 사전에 이슈로 논의

### 개발 우선순위

현재 기여가 필요한 영역:
- [ ] 고급 요약 알고리즘 개선
- [ ] 다국어 지원 (i18n)
- [ ] 성능 최적화 (대규모 그래프)
- [ ] E2E 테스트 커버리지 확대
- [ ] 문서 및 튜토리얼 작성

## 라이선스

이 프로젝트는 [AGPL-3.0 License](LICENSE) 하에 배포됩니다.

핵심 원칙:
- 자유로운 사용, 수정, 배포
- 소스 코드 공개 의무 (웹 서비스 포함)
- 파생 작업물도 AGPL-3.0 적용
- 독점 소프트웨어로 전환 불가

## 커뮤니티 및 지원

### 문의 및 지원
- **이슈 트래커**: [GitHub Issues](https://github.com/yourusername/graphchat/issues)
- **토론**: [GitHub Discussions](https://github.com/yourusername/graphchat/discussions)
- **버그 리포트**: 이슈 템플릿을 사용해 상세히 작성
- **기능 제안**: 충분한 배경과 사용 사례 제공

### 참고 자료
- [제품 요구사항 문서 (PRD)](docs/prd.md)
- [API 문서](http://localhost:8432/docs) (서버 실행 후)
- [FalkorDB 문서](https://www.falkordb.com/docs)
- [React Flow 문서](https://reactflow.dev/)

---

<div align="center">

**GraphChat으로 당신의 사고를 자유롭게 확장하세요**

[맨 위로](#graphchat)

</div>
