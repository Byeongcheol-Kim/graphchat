import { Node, Branch, EdgeLabels } from '@/types'

export const generateDummyNodes = (): Node[] => {
  const nodes: Node[] = [
    {
      id: 'root',
      parentId: null,
      title: '시작',
      description: '대화의 시작점',
      type: 'main',
      status: 'completed',
      depth: 0,
      tokenCount: 245,
      summaryContent: 'AI 윤리와 기술 구현에 대한 논의 시작',
      keyPoints: ['AI 윤리 문제 제기', '기술적 구현 방법 탐구', '두 가지 방향 제시'],
      createdAt: new Date('2024-01-01T10:00:00'),
      updatedAt: new Date('2024-01-01T10:01:00'),
      messages: [
        {
          id: 'm1',
          content: 'AI의 윤리적 문제와 기술적 구현에 대해 논의하고 싶습니다. 코드 예시와 다이어그램도 보여주세요.',
          role: 'user',
          branchId: 'root',
          timestamp: new Date('2024-01-01T10:00:00'),
        },
        {
          id: 'm2',
          content: getDummyMarkdownContent(),
          role: 'assistant',
          branchId: 'root',
          timestamp: new Date('2024-01-01T10:01:00'),
        },
      ],
    },
    {
      id: 'ethics',
      parentId: 'root',
      title: 'AI 윤리',
      description: 'AI의 윤리적 문제와 사회적 영향',
      type: 'topic',
      status: 'active',
      depth: 1,
      color: '#9C27B0',
      tokenCount: 523,
      summaryContent: 'AI 시스템의 편향성, 투명성, 프라이버시, 책임소재 문제 분석',
      keyPoints: ['편향성과 공정성', '투명성과 설명가능성', '프라이버시 보호', '책임소재 명확화'],
      createdAt: new Date('2024-01-01T10:02:00'),
      updatedAt: new Date('2024-01-01T10:03:00'),
      charts: [
        {
          type: 'list',
          content: ['편향성 문제', '투명성 문제', '프라이버시', '책임소재']
        }
      ],
      messages: [
        {
          id: 'm3',
          content: 'AI 윤리에서 가장 중요한 이슈는 무엇인가요?',
          role: 'user',
          branchId: 'ethics',
          timestamp: new Date('2024-01-01T10:02:00'),
        },
        {
          id: 'm4',
          content: 'AI 윤리의 핵심 이슈들:\n\n1. **편향성과 공정성**: AI 시스템이 학습 데이터의 편견을 반영\n2. **투명성과 설명가능성**: AI 결정 과정의 블랙박스 문제\n3. **프라이버시**: 개인정보 수집과 활용의 경계\n4. **책임소재**: AI 결정의 책임 귀속 문제',
          role: 'assistant',
          branchId: 'ethics',
          timestamp: new Date('2024-01-01T10:03:00'),
        },
      ],
    },
    {
      id: 'technical',
      parentId: 'root',
      title: '기술적 구현',
      description: 'AI 시스템의 기술적 구현 방법',
      type: 'topic',
      status: 'active',
      depth: 1,
      color: '#4FC3F7',
      tokenCount: 687,
      summaryContent: 'LLM 구현에 필요한 핵심 기술 스택과 아키텍처',
      keyPoints: ['Transformer 아키텍처', '분산 학습 시스템', '토크나이저 구현', '최적화 기법'],
      createdAt: new Date('2024-01-01T10:02:30'),
      updatedAt: new Date('2024-01-01T10:03:30'),
      charts: [
        {
          type: 'flow',
          content: 'Input → Tokenizer → Transformer → Output'
        }
      ],
      messages: [
        {
          id: 'm5',
          content: '대규모 언어 모델을 구현하려면 어떤 기술이 필요한가요?',
          role: 'user',
          branchId: 'technical',
          timestamp: new Date('2024-01-01T10:02:00'),
        },
        {
          id: 'm6',
          content: 'LLM 구현에 필요한 핵심 기술:\n\n1. **Transformer 아키텍처**: Self-attention 메커니즘\n2. **분산 학습**: 여러 GPU/TPU를 활용한 병렬 처리\n3. **토크나이저**: 텍스트를 토큰으로 변환\n4. **최적화 기법**: Adam, AdamW 등의 옵티마이저',
          role: 'assistant',
          branchId: 'technical',
          timestamp: new Date('2024-01-01T10:03:00'),
        },
      ],
    },
    {
      id: 'bias',
      parentId: 'ethics',
      title: '편향성 문제',
      description: 'AI의 편향성과 해결 방안',
      type: 'question',
      status: 'active',
      depth: 2,
      color: '#FFC107',
      tokenCount: 156,
      summaryContent: '편향성 탐지와 완화 방법론',
      keyPoints: ['데이터 편향 분석', '알고리즘 공정성', '평가 메트릭'],
      messages: [
        {
          id: 'm7',
          content: 'AI의 편향성을 어떻게 탐지하고 완화할 수 있을까요?',
          role: 'user',
          branchId: 'bias',
          timestamp: new Date('2024-01-01T10:04:00'),
        },
      ],
    },
    {
      id: 'transformer',
      parentId: 'technical',
      title: 'Transformer 아키텍처',
      description: 'Transformer 모델의 세부 구현',
      type: 'exploration',
      status: 'active',
      depth: 2,
      color: '#4CAF50',
      tokenCount: 234,
      summaryContent: 'Self-attention 메커니즘 상세 분석',
      keyPoints: ['Multi-head attention', 'Positional encoding', 'Feed-forward networks'],
      messages: [
        {
          id: 'm8',
          content: 'Self-attention 메커니즘을 자세히 설명해주세요.',
          role: 'user',
          branchId: 'transformer',
          timestamp: new Date('2024-01-01T10:04:00'),
        },
      ],
    },
    {
      id: 'privacy',
      parentId: 'ethics',
      title: '프라이버시',
      description: '개인정보 보호와 AI',
      type: 'topic',
      status: 'paused',
      depth: 2,
      color: '#FF5722',
      messages: [],
    },
    {
      id: 'optimization',
      parentId: 'technical',
      title: '최적화 기법',
      description: '모델 학습 최적화',
      type: 'exploration',
      status: 'paused',
      depth: 2,
      color: '#00BCD4',
      messages: [],
    },
    {
      id: 'merge1',
      parentId: null,
      sourceNodeIds: ['bias', 'transformer'],
      title: '통합 분석',
      description: '편향성과 기술적 구현의 교집합',
      type: 'summary',
      status: 'active',
      depth: 3,
      color: '#E91E63',
      isSummary: true,
      tokenCount: 892,
      summaryContent: '기술 설계 단곈4에서 편향성 완화 방법 통합',
      keyPoints: ['Attention 메커니즘 조정', 'Debiasing layer 추가', 'Fairness constraints'],
      createdAt: new Date('2024-01-01T10:05:00'),
      updatedAt: new Date('2024-01-01T10:06:00'),
      charts: [
        {
          type: 'table',
          content: [['방법', '효과'], ['Debiasing Layer', '85%'], ['Fairness Constraint', '72%']]
        }
      ],
      messages: [
        {
          id: 'm9',
          content: '편향성 문제와 Transformer 아키텍처를 함께 고려하면, 모델 설계 단계에서부터 공정성을 반영할 수 있습니다.',
          role: 'assistant',
          branchId: 'merge1',
          timestamp: new Date('2024-01-01T10:05:00'),
        },
        {
          id: 'm10',
          content: 'Attention 메커니즘을 조정하여 특정 편향을 완화할 수 있는 방법이 있을까요?',
          role: 'user',
          branchId: 'merge1',
          timestamp: new Date('2024-01-01T10:06:00'),
        },
      ],
    },
    {
      id: 'implementation',
      parentId: 'merge1',
      title: '실제 구현 방안',
      description: '편향 완화 기술 구현',
      type: 'solution',
      status: 'active',
      depth: 4,
      color: '#795548',
      messages: [
        {
          id: 'm11',
          content: '다음과 같은 구체적인 구현 방안을 제안합니다:\n\n1. Debiasing Layer 추가\n2. Fairness Constraint 적용\n3. Balanced Training Data 구성',
          role: 'assistant',
          branchId: 'implementation',
          timestamp: new Date('2024-01-01T10:07:00'),
        },
      ],
    },
    {
      id: 'merge2',
      parentId: null,
      sourceNodeIds: ['privacy', 'optimization'],
      title: '프라이버시 보호 최적화',
      description: '개인정보를 보호하면서 성능 최적화',
      type: 'summary',
      status: 'paused',
      depth: 3,
      color: '#9E9E9E',
      isSummary: true,
      messages: [],
    },
  ]
  
  return nodes
}

// 호환성을 위한 별칭
export const generateDummyBranches = generateDummyNodes

export const getDefaultEdgeLabels = (): EdgeLabels => ({
  'root-ethics': '윤리적 관점',
  'root-technical': '기술적 관점',
  'ethics-bias': '편향성 탐구',
  'ethics-privacy': '프라이버시 이슈',
  'technical-transformer': '아키텍처 분석',
  'technical-optimization': '최적화 방법',
  'bias-merge1': '편향 완화 적용',
  'transformer-merge1': '기술 구현',
  'merge1-implementation': '실제 적용',
})

function getDummyMarkdownContent(): string {
  return `# AI 윤리와 기술 구현 가이드

## 📋 주요 논점

AI 시스템 개발 시 고려해야 할 **핵심 요소들**:

1. **윤리적 고려사항**
   - 투명성과 설명가능성
   - 공정성과 편향 제거
   - 프라이버시 보호

2. **기술적 구현**
   - 안전한 AI 아키텍처
   - 모니터링 시스템
   - 감사 로깅

## 💻 코드 예시

### Python으로 구현한 윤리적 AI 시스템

\`\`\`python
import numpy as np
from typing import Dict, List
from datetime import datetime

class EthicalAIFramework:
    """윤리적 AI 의사결정 프레임워크"""
    
    def __init__(self, transparency_threshold: float = 0.85):
        self.transparency = transparency_threshold
        self.audit_log = []
        self.bias_checker = BiasDetector()
    
    def process_decision(self, input_data: Dict) -> Dict:
        # 1. 입력 검증
        validated_input = self.validate_input(input_data)
        
        # 2. 편향성 검사
        bias_score = self.bias_checker.check(validated_input)
        if bias_score > 0.3:
            return {"status": "rejected", "reason": "bias_detected"}
        
        # 3. AI 모델 실행
        result = self.run_model(validated_input)
        
        # 4. 감사 로깅
        self.log_decision(input_data, result)
        
        return result
    
    def generate_explanation(self, decision_id: str) -> str:
        """의사결정에 대한 설명 생성"""
        decision = self.get_decision(decision_id)
        return f"Decision based on {len(decision['factors'])} factors..."
\`\`\`

## 🔄 시스템 아키텍처

\`\`\`mermaid
graph TB
    subgraph "입력 계층"
        A[사용자 입력] --> B[데이터 검증]
        B --> C{개인정보 포함?}
    end
    
    subgraph "처리 계층"
        C -->|Yes| D[익명화 처리]
        C -->|No| E[직접 처리]
        D --> F[AI 모델]
        E --> F
        F --> G{편향성 검사}
    end
    
    subgraph "출력 계층"
        G -->|통과| H[결과 생성]
        G -->|실패| I[재처리/거부]
        H --> J[감사 로그]
        I --> J
        J --> K[최종 출력]
    end
    
    style A fill:#e1f5fe
    style K fill:#c8e6c9
    style I fill:#ffcdd2
\`\`\`

## 📊 성능 메트릭

| 메트릭 | 목표값 | 현재값 | 상태 |
|--------|--------|--------|------|
| 정확도 | > 95% | 96.2% | ✅ |
| 공정성 지수 | > 0.9 | 0.87 | ⚠️ |
| 투명성 점수 | > 85% | 88% | ✅ |
| 응답 시간 | < 100ms | 82ms | ✅ |

## 🔍 SQL 모니터링 쿼리

\`\`\`sql
-- 일일 편향성 분석 리포트
WITH daily_metrics AS (
    SELECT 
        DATE(timestamp) as date,
        demographic_group,
        AVG(decision_score) as avg_score,
        COUNT(*) as decision_count,
        STDDEV(decision_score) as score_variance
    FROM ai_decisions
    WHERE timestamp >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(timestamp), demographic_group
)
SELECT 
    date,
    demographic_group,
    avg_score,
    decision_count,
    ROUND(score_variance, 2) as variance,
    CASE 
        WHEN ABS(avg_score - 0.5) > 0.1 THEN '⚠️ 편향 위험'
        ELSE '✅ 정상'
    END as status
FROM daily_metrics
ORDER BY date DESC, demographic_group;
\`\`\`

> 💡 **팁**: 이러한 시스템은 지속적인 모니터링과 개선이 필요합니다. 정기적으로 메트릭을 검토하고 필요시 모델을 재학습시키세요.

---

*각 방향으로 더 깊이 탐구하시겠습니까?*`
}