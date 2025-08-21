# Branching AI - 리팩토링 요약

## 수행한 작업 목록

### 1. 도메인 용어 변경
- **Branch → Node**: 대화의 분기점을 나타내는 용어를 더 명확하게 변경
- **Merge → Summary**: 여러 노드를 압축/요약하는 기능의 의미를 명확화
- **parentIds → sourceNodeIds**: 요약 노드의 원본 노드들을 나타내는 필드명 개선
- **isMerge → isSummary**: 요약 노드 여부를 나타내는 플래그 명칭 변경
- **summary → summaryContent**: 요약 내용 필드명 명확화

### 2. 타입 정의 정리

#### 생성된 파일
- `src/types/node.types.ts`: Node 인터페이스 정의 (Branch 대체)
- 이전 Branch 타입과의 호환성 유지를 위한 re-export 추가

#### 주요 변경사항
```typescript
// 이전
interface Branch {
  parentIds?: string[]  // 머지 노드용
  isMerge?: boolean
  summary?: string
}

// 변경 후
interface Node {
  sourceNodeIds?: string[]  // 요약 노드용
  isSummary?: boolean
  summaryContent?: string
}
```

### 3. 스토어 리팩토링

#### 생성된 파일
- `src/store/nodeStore.ts`: 새로운 노드 관리 스토어

#### 수정된 파일
- `src/store/conversationStore.ts`: nodeStore 래퍼로 변경 (하위 호환성 유지)
- `src/store/branchStore.ts`: nodeStore로 리디렉션

#### 삭제된 파일
- `src/store/conversationStore.old.ts`
- `src/store/conversationStore.bak.ts`
- `src/store/useStore.ts`
- `src/store/useStores.ts`

### 4. 컴포넌트 버그 수정

#### GraphCanvas.tsx
- 요약 노드와 소스 노드 간의 관계가 표시되지 않던 문제 해결
- `sourceNodeIds`와 `parentIds` 모두 체크하도록 수정
- 엣지 생성 로직 개선

#### LeafNodesDashboard.tsx
- 리프 노드 필터링 오류 수정
- 요약 노드의 소스 관계를 고려한 hasChildren 로직 구현

#### SummaryDialog.tsx
- Branch 타입을 Node로 변경
- import 경로 정리

#### DeleteConfirmDialog.tsx
- Node 타입 사용으로 변경
- 요약 노드의 자식 관계 확인 로직 추가

### 5. Import 경로 정리
- 모든 컴포넌트에서 `@/types`를 통한 일관된 import
- 불필요한 상대 경로 import 제거

## 백엔드 아키텍처 설계

### 기술 스택
- **FastAPI**: 고성능 Python 웹 프레임워크
- **FalkorDB**: Redis 기반 그래프 데이터베이스
- **LangChain**: LLM 오케스트레이션
- **OpenAI API**: AI 응답 및 임베딩 생성
- **WebSocket**: 실시간 통신
- **UV**: 최신 Python 패키지 매니저

### 핵심 서비스
1. **GraphService**: 그래프 DB 작업 관리
2. **AIService**: LLM 통합 및 AI 기능
3. **BranchingService**: 자동 분기 로직
4. **SummaryService**: 요약 생성 및 컨텍스트 압축

### 데이터베이스 스키마
- **Session**: 대화 세션 관리
- **Node**: 대화 노드 (그래프 노드)
- **Message**: 개별 메시지
- **관계**: PARENT_OF, SUMMARIZED_FROM, REFERENCES

### API 엔드포인트
- 세션 관리: `/api/sessions/*`
- 노드 관리: `/api/nodes/*`
- 메시지 관리: `/api/messages/*`
- AI 기능: `/api/ai/*`
- WebSocket: `ws://localhost:8000/ws/{session_id}`

## 문제 해결 내역

### 1. 요약 노드 관계 표시 문제
**문제**: 요약 노드가 소스 노드들과의 관계를 표시하지 않음
**해결**: GraphCanvas에서 `sourceNodeIds`와 `parentIds` 모두 체크하도록 수정

### 2. 리프 노드 필터링 오류
**문제**: 자식이 없는 노드가 리프 노드로 인식되지 않음
**해결**: hasChildren Set 생성 시 요약 노드의 소스 관계도 고려

### 3. 타입 불일치 문제
**문제**: Branch와 Node 타입 혼용으로 인한 타입 오류
**해결**: 호환성 레이어 추가 및 점진적 마이그레이션

## 향후 개선 사항

### 단기 (즉시 가능)
- [ ] Branch 관련 레거시 코드 완전 제거
- [ ] 테스트 코드 추가
- [ ] Storybook 컴포넌트 문서화

### 중기 (백엔드 구현 후)
- [ ] WebSocket 실시간 동기화
- [ ] 그래프 DB 연동
- [ ] AI 자동 분기 기능

### 장기
- [ ] 협업 기능
- [ ] 플러그인 시스템
- [ ] 모바일 앱

## 기술 부채
1. **레거시 호환성 코드**: Branch 타입 관련 래퍼들을 점진적으로 제거 필요
2. **하드코딩된 더미 데이터**: 실제 백엔드 연동으로 교체 필요
3. **타입 안정성**: any 타입 사용 부분 제거 필요

## 성과
- ✅ 도메인 용어 일관성 확보
- ✅ 코드베이스 정리 (6개 불필요한 파일 제거)
- ✅ 핵심 버그 2개 수정
- ✅ 백엔드 아키텍처 설계 완료
- ✅ 완전한 문서화