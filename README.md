# GraphChat 🌳

지능적인 주제 분기와 컨텍스트 관리를 통해 AI 대화를 향상시키는 그래프 기반 사고 분기 시스템

[![Python](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)

## 📋 프로젝트 개요

GraphChat은 사용자가 여러 대화 경로를 동시에 탐색하면서도 각 브랜치 간의 컨텍스트와 연결을 유지할 수 있도록 하는 혁신적인 AI 대화 시스템입니다.

## 🎯 주요 특징

- **🤖 자동 브랜치 생성**: AI가 대화 맥락을 분석하여 자동으로 새로운 대화 경로 생성
- **🔄 실시간 동기화**: WebSocket을 통한 그래프와 대화의 실시간 업데이트
- **📊 시각적 그래프**: React Flow를 활용한 인터랙티브 대화 트리 시각화
- **🧠 컨텍스트 관리**: 각 브랜치별 독립적인 컨텍스트 유지 및 요약
- **🔍 벡터 검색**: 의미 기반 유사 대화 검색 및 연결
- **💾 세션 관리**: 여러 대화 세션 저장 및 전환
- **🎨 다양한 노드 타입**: User, Assistant, Branch, Summary 등 다양한 노드 타입 지원

## 🚀 빠른 시작 가이드

### 방법 1: Docker Compose로 한 번에 실행 (추천) 🐳

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

## 🔑 API 키 발급 방법

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

## 🏗️ 아키텍처

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React Frontend│────▶│  FastAPI Backend│────▶│    FalkorDB     │
│   (Port 3432)   │     │   (Port 8432)   │     │   (Port 6432)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                        │                        
        │                        ▼                        
        │                ┌─────────────────┐              
        └───────────────▶│  WebSocket      │              
                        │  (Real-time)     │              
                        └─────────────────┘              
```

## 📦 주요 기술 스택

### Backend
- **FastAPI**: 고성능 비동기 웹 프레임워크
- **Google Gemini**: AI 언어 모델
- **FalkorDB**: 그래프 데이터베이스
- **WebSocket**: 실시간 통신
- **Pydantic**: 데이터 검증
- **Dependency Injector**: IoC 컨테이너

### Frontend
- **React 18**: UI 프레임워크
- **React Flow**: 그래프 시각화
- **Material-UI**: UI 컴포넌트
- **Zustand**: 상태 관리
- **TypeScript**: 타입 안정성
- **Vite**: 빌드 도구

## 🐛 문제 해결

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

## 🗺️ 로드맵

### 완료된 기능 ✅
- [x] 기본 채팅 인터페이스
- [x] 그래프 시각화 (React Flow)
- [x] 자동 브랜치 생성
- [x] 세션 관리
- [x] 노드 타입별 색상 구분
- [x] 리프 노드 대시보드
- [x] 브랜치 추천 시스템
- [x] 벡터 임베딩 검색
- [x] 실시간 WebSocket 통신

### 개발 예정 🚧
- [ ] 고급 요약 기능
- [ ] 다중 사용자 지원
- [ ] 대화 트리 내보내기 (JSON/Markdown)
- [ ] 브랜치 병합 기능
- [ ] AI 모델 선택 옵션
- [ ] 대화 히스토리 검색
- [ ] 협업 기능

## 🔧 개발

### API 문서
서버 실행 후 다음 URL에서 API 문서 확인:
- Swagger UI: http://localhost:8432/docs
- ReDoc: http://localhost:8432/redoc

### 주요 엔드포인트
- `POST /api/v1/sessions` - 새 세션 생성
- `POST /api/v1/messages/chat` - 채팅 메시지 전송
- `GET /api/v1/nodes/tree/{node_id}` - 노드 트리 조회
- `POST /api/v1/nodes/branch` - 브랜치 생성
- `GET /api/v1/recommendations/branches` - 브랜치 추천
- `POST /api/v1/vector-search/similar` - 유사 노드 검색

### 테스트 실행

```bash
# 전체 테스트 실행
bash scripts/run_tests.sh

# 백엔드 테스트
cd backend
pytest

# 특정 테스트 실행
python scripts/test_llm_branching.py
```

## 📝 라이선스

AGPL-3.0 License

## 🤝 기여

기여를 환영합니다! Pull Request를 보내주세요.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 문의

질문이나 제안사항이 있으시면 이슈를 생성해주세요.
