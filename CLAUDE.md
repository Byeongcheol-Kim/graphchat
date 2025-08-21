# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 언어 설정

**한국어로 답변하세요.** 이 프로젝트의 모든 커뮤니케이션과 문서는 한국어를 기본으로 합니다.

## 저장소 개요

**graphchat**은 지능적인 주제 분기와 컨텍스트 관리를 통해 AI 대화를 향상시키는 그래프 기반 사고 분기 시스템입니다. 사용자가 여러 대화 경로를 동시에 탐색하면서도 각 브랜치 간의 컨텍스트와 연결을 유지할 수 있도록 합니다.

## 프로젝트 상태

현재 **초기 개발/프로토타입 단계**입니다. `docs/prd.md`에 한국어로 작성된 완전한 비전이 담긴 PRD(제품 요구사항 문서)가 있습니다.

## 핵심 개념

### 자동 분기
- AI가 대화에서 여러 주제가 나타나는 것을 자동으로 감지
- 각 주제에 대한 병렬 대화 브랜치 생성
- 각 브랜치별 독립적인 컨텍스트 유지

### 컨텍스트 관리
- 토큰 한계 접근 시 자동 요약
- 브랜치 간 컨텍스트 보존
- 서로 다른 브랜치 간 교차 연결 기능

### 시각적 인터페이스
- 대화 트리의 실시간 그래프 시각화
- 상호작용 가능한 노드 탐색
- 브랜치 관계의 시각적 표현

## 계획된 아키텍처

### 기술 스택
- **프론트엔드**: React + D3.js/Cytoscape.js (그래프 시각화)
- **백엔드**: FastAPI + LangChain (AI 오케스트레이션)
- **그래프 데이터베이스**: FalkorDB (대화 그래프 저장)
- **벡터 데이터베이스**: FalkorDB (임베딩 및 유사도 검색)
- **실시간 통신**: WebSocket (라이브 동기화)
- **Python**: 3.12 (`.python-version`에 명시)

### 프로젝트 구조 (계획)
```
src/
  backend/
    api/              # FastAPI 엔드포인트
    agents/           # LangChain 에이전트 및 분기 로직
    db/              # 데이터베이스 연결 및 모델
    services/        # 비즈니스 로직
  frontend/
    components/      # React 컴포넌트
    graph/          # 그래프 시각화 로직
    services/       # API 클라이언트
tests/              # 테스트 파일
```

## 개발 명령어

### 현재 설정
```bash
# 가상 환경 생성
python -m venv .venv

# 환경 활성화
source .venv/bin/activate  # macOS/Linux

# 의존성 설치 (pyproject.toml에 추가 후)
pip install -e .

# 애플리케이션 실행
python main.py
```

### 향후 명령어 (구현 예정)
```bash
# 백엔드 개발
uvicorn src.backend.main:app --reload --port 8000

# 프론트엔드 개발  
npm start

# 테스팅
pytest
pytest tests/unit/
pytest tests/integration/

# 코드 품질
ruff format .
ruff check .
mypy .

# 데이터베이스 설정
docker-compose up -d  # 로컬 FalkorDB용
```

## 주요 구현 영역

### 1. 분기 에이전트 (`src/backend/agents/branching_agent.py`)
- 주제 감지 및 분석
- 자동 브랜치 생성 로직
- 컨텍스트 관리 및 요약
- 교차 연결 구현

### 2. 그래프 관리 (`src/backend/services/graph_service.py`)
- FalkorDB 통합
- 그래프 CRUD 작업
- 노드 및 엣지 관리
- 쿼리 최적화

### 3. API 레이어 (`src/backend/api/`)
- 실시간 업데이트를 위한 WebSocket 엔드포인트
- 그래프 작업을 위한 REST 엔드포인트
- 인증 및 세션 관리

### 4. 프론트엔드 그래프 시각화 (`src/frontend/graph/`)
- D3.js 또는 Cytoscape.js 통합
- 상호작용 가능한 노드 조작
- 실시간 그래프 업데이트
- 줌, 팬, 레이아웃 컨트롤

## 데이터베이스 스키마 고려사항

### 그래프 구조
- **노드**: 대화 메시지, 브랜치, 요약
- **엣지**: 부모-자식 관계, 교차 링크, 의미적 연결
- **속성**: 타임스탬프, 임베딩, 메타데이터

### 주요 쿼리
- 브랜치 생성 및 탐색
- 컨텍스트 검색 및 요약
- 교차 연결을 위한 유사도 검색
- 전체 대화 트리 검색

## 개발 우선순위

1. **핵심 백엔드 설정**
   - FastAPI 애플리케이션 구조
   - FalkorDB 연결 및 기본 작업
   - AI 기능을 위한 LangChain 통합

2. **분기 로직**
   - 주제 감지 알고리즘
   - 자동 브랜치 생성
   - 컨텍스트 관리 시스템

3. **기본 API**
   - 실시간 통신을 위한 WebSocket
   - 필수 CRUD 엔드포인트
   - 세션 관리

4. **최소 프론트엔드**
   - 기본 그래프 시각화
   - 간단한 상호작용 기능
   - 실시간 업데이트

## 테스트 전략

### 단위 테스트
- 분기 로직 알고리즘
- 그래프 작업
- 컨텍스트 관리 함수

### 통합 테스트
- API 엔드포인트
- 데이터베이스 작업
- WebSocket 통신

### E2E 테스트
- 전체 대화 플로우
- 브랜치 생성 및 탐색
- 교차 연결 기능

## 환경 변수 (설정 예정)

```bash
# API 키
OPENAI_API_KEY=your_key

# 데이터베이스
FALKORDB_URI=redis://localhost:6379
FALKORDB_GRAPH_NAME=branching_ai

# 애플리케이션
API_PORT=8000
FRONTEND_PORT=3000
JWT_SECRET=your_secret

# 개발
DEBUG=true
LOG_LEVEL=debug
```

## PRD의 중요 사항

- **사용자 경험 중심**: 사고 흐름을 방해하지 않는 원활한 분기
- **성능**: 대규모 대화 트리에 대한 효율적인 그래프 쿼리
- **확장성**: 복잡한 다중 브랜치 대화 처리를 위한 설계
- **유연성**: 수동 브랜치 생성 및 교차 연결 지원
- **내보내기**: 다양한 형식으로 대화 트리 내보내기 기능

## 일반적인 개발 작업

### 새 브랜치 유형 추가
1. 그래프 스키마에 브랜치 유형 정의
2. 분기 에이전트에 감지 로직 구현
3. 새 유형에 대한 API 엔드포인트 추가
4. 새 브랜치 유형 표시를 위한 프론트엔드 업데이트

### 그래프 작업 구현
1. 그래프 서비스에 작업 추가
2. API 엔드포인트 생성
3. WebSocket 이벤트 구현
4. 작업 처리를 위한 프론트엔드 업데이트

### 컨텍스트 관리 기능 추가
1. 컨텍스트 서비스에 구현
2. 분기 에이전트 로직에 추가
3. API 엔드포인트 생성
4. 컨텍스트 상태 표시를 위한 UI 업데이트
- dict 타입 대신 pydantic basemodel 을 사용하는 게 좋을 거 같아. 그리고 @backend/api/endpoints/sessions.py#L134-137 이런 형태의 다른 타입의 데이터를 처리하는건 최대한 지양해줘.