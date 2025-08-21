"""
고급 브랜칭 서비스 - 지능적인 대화 분기 관리
"""
from typing import List, Dict, Any, Optional, Tuple
import json
import logging
from datetime import datetime, timezone
from enum import Enum

from backend.db.falkordb import FalkorDBManager
from backend.services.gemini_service import GeminiService
from backend.services.node_service import NodeService
from backend.services.message_service import MessageService
from backend.schemas.node import NodeCreate
from backend.schemas.message import MessageCreate

logger = logging.getLogger(__name__)


class BranchType(Enum):
    """브랜치 유형"""
    TOPIC = "topic"  # 주제 분기
    DETAIL = "detail"  # 세부사항 분기
    ALTERNATIVE = "alternative"  # 대안 탐색
    QUESTION = "question"  # 추가 질문
    EXAMPLE = "example"  # 예시 탐구


class BranchingService:
    """고급 브랜칭 로직을 담당하는 서비스"""
    
    def __init__(self, 
                 db: FalkorDBManager, 
                 gemini_service: Optional[GeminiService] = None,
                 google_api_key: Optional[str] = None, 
                 gemini_model: str = "gemini-2.0-flash-exp"):
        self.db = db
        
        # GeminiService 주입 또는 생성
        if gemini_service:
            self.gemini = gemini_service
            logger.info("🔵 BranchingService: GeminiService가 주입됨")
        else:
            logger.info(f"🔴 BranchingService: GeminiService를 직접 생성")
            self.gemini = GeminiService(api_key=google_api_key, model=gemini_model)
        
        self.node_service = NodeService(db)
        self.message_service = MessageService(db)
        
        # 브랜칭 임계값
        self.complexity_threshold = 0.7  # 복잡도 임계값
        self.max_branches_per_node = 3  # 노드당 최대 브랜치 수
        self.min_context_length = 100  # 최소 컨텍스트 길이
    
    async def analyze_branching_potential(
        self,
        user_message: str,
        ai_response: str,
        conversation_history: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """대화의 분기 잠재력 분석 - 단일 API 호출로 최적화"""
        try:
            # 전체 컨텍스트 구성
            context = self._build_context(user_message, ai_response, conversation_history)
            
            # 단일 통합 분석 API 호출
            analysis = await self._comprehensive_analysis(context)
            
            # 분석 결과 파싱
            complexity_score = analysis.get("complexity_score", 0)
            branch_types = analysis.get("branch_types", {})
            
            # 추천 브랜치 생성 (API 호출 없이 로컬에서 처리)
            recommended_branches = self._create_recommendations_from_analysis(
                branch_types, 
                complexity_score
            )
            
            return {
                "complexity_score": complexity_score,
                "should_branch": complexity_score >= self.complexity_threshold,
                "branch_analysis": branch_types,
                "recommended_branches": recommended_branches,
                "reasoning": self._generate_reasoning(complexity_score, branch_types)
            }
            
        except Exception as e:
            logger.error(f"브랜칭 잠재력 분석 실패: {e}")
            return {
                "complexity_score": 0,
                "should_branch": False,
                "branch_analysis": {},
                "recommended_branches": [],
                "reasoning": "분석 실패"
            }
    
    async def _comprehensive_analysis(self, context: str) -> Dict[str, Any]:
        """단일 API 호출로 모든 분석 수행 - Structured Output 사용"""
        try:
            # 구조화된 출력을 위한 JSON Schema 정의
            response_format = {
                "type": "json_schema",
                "json_schema": {
                    "name": "branch_analysis",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "complexity_score": {
                                "type": "number",
                                "description": "대화의 복잡도 점수 (0.0~1.0)",
                                "minimum": 0.0,
                                "maximum": 1.0
                            },
                            "branch_types": {
                                "type": "object",
                                "properties": {
                                    "topics": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "title": {"type": "string"},
                                                "edge_label": {"type": "string", "maxLength": 10}
                                            },
                                            "required": ["title", "edge_label"],
                                            "additionalProperties": False
                                        },
                                        "maxItems": 2,
                                        "description": "핵심 주제들"
                                    },
                                    "details": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "title": {"type": "string"},
                                                "edge_label": {"type": "string", "maxLength": 10}
                                            },
                                            "required": ["title", "edge_label"],
                                            "additionalProperties": False
                                        },
                                        "maxItems": 2,
                                        "description": "세부 설명이 필요한 부분"
                                    },
                                    "alternatives": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "title": {"type": "string"},
                                                "edge_label": {"type": "string", "maxLength": 10}
                                            },
                                            "required": ["title", "edge_label"],
                                            "additionalProperties": False
                                        },
                                        "maxItems": 1,
                                        "description": "대안적 접근법"
                                    },
                                    "questions": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "title": {"type": "string"},
                                                "edge_label": {"type": "string", "maxLength": 10}
                                            },
                                            "required": ["title", "edge_label"],
                                            "additionalProperties": False
                                        },
                                        "maxItems": 2,
                                        "description": "추가 탐구 질문"
                                    },
                                    "examples": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "title": {"type": "string"},
                                                "edge_label": {"type": "string", "maxLength": 10}
                                            },
                                            "required": ["title", "edge_label"],
                                            "additionalProperties": False
                                        },
                                        "maxItems": 1,
                                        "description": "구체적 예시"
                                    }
                                },
                                "required": ["topics", "details", "alternatives", "questions", "examples"],
                                "additionalProperties": False
                            }
                        },
                        "required": ["complexity_score", "branch_types"],
                        "additionalProperties": False
                    }
                }
            }
            
            prompt = f"""
            다음 대화를 분석하세요:

            대화:
            {context}

            평가 기준:
            - complexity_score: 단순(0.0-0.3), 중간(0.4-0.6), 복잡(0.7-1.0)
            - 주제 수, 기술적 깊이, 추가 탐구 필요성을 고려
            - 각 브랜치 카테고리는 정말 필요한 경우만 포함
            - 빈 카테고리는 빈 배열로 표시
            
            중요: 각 브랜치에 대해:
            - title: 브랜치의 완전한 설명 (예: "AI 윤리의 실제 적용 사례")
            - edge_label: 10자 이내의 짧은 라벨 (예: "윤리사례")
            """
            
            response = await self.gemini.chat_completion(
                messages=[
                    {"role": "system", "content": "대화를 분석하고 브랜치 가능성을 평가하세요."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                structured=False
            )
            
            if response and "choices" in response:
                try:
                    content = response["choices"][0]["message"]["content"]
                    
                    # Structured Output은 이미 JSON 형식으로 반환됨
                    # 하지만 DeepSeek이 구조화 출력을 지원하지 않을 수 있으므로 fallback 처리
                    if isinstance(content, str):
                        # JSON 추출 (구조화 출력이 작동하지 않을 경우)
                        if "```json" in content:
                            content = content.split("```json")[1].split("```")[0]
                        elif "```" in content:
                            content = content.split("```")[1].split("```")[0]
                        
                        analysis = json.loads(content.strip())
                    else:
                        analysis = content  # 이미 딕셔너리인 경우
                    
                    # 기본값 보장
                    if "complexity_score" not in analysis:
                        analysis["complexity_score"] = 0.5
                    if "branch_types" not in analysis:
                        analysis["branch_types"] = {}
                    
                    # branch_types 기본값 보장
                    default_types = {
                        "topics": [],
                        "details": [],
                        "alternatives": [],
                        "questions": [],
                        "examples": []
                    }
                    
                    for key in default_types:
                        if key not in analysis["branch_types"]:
                            analysis["branch_types"][key] = []
                    
                    return analysis
                    
                except (json.JSONDecodeError, Exception) as e:
                    logger.warning(f"통합 분석 파싱 실패: {e}")
            
            # 기본값 반환
            return {
                "complexity_score": 0.5,
                "branch_types": {
                    "topics": [],
                    "details": [],
                    "alternatives": [],
                    "questions": [],
                    "examples": []
                }
            }
            
        except Exception as e:
            logger.error(f"통합 분석 실패: {e}")
            return {
                "complexity_score": 0.0,
                "branch_types": {
                    "topics": [],
                    "details": [],
                    "alternatives": [],
                    "questions": [],
                    "examples": []
                }
            }
    
    def _create_recommendations_from_analysis(
        self,
        branch_types: Dict[str, List[str]],
        complexity_score: float
    ) -> List[Dict[str, Any]]:
        """분석 결과로부터 추천 브랜치 생성 (API 호출 없음)"""
        recommendations = []
        
        # 복잡도에 따라 최대 브랜치 수 결정
        max_branches = min(
            int(complexity_score * 5),
            self.max_branches_per_node
        )
        
        # 우선순위 순서
        priority_order = ["topics", "details", "questions", "alternatives", "examples"]
        
        for branch_type in priority_order:
            if len(recommendations) >= max_branches:
                break
            
            branches = branch_types.get(branch_type, [])
            for branch_item in branches:
                if len(recommendations) >= max_branches:
                    break
                
                # branch_item이 딕셔너리인지 문자열인지 확인
                if isinstance(branch_item, dict):
                    branch_title = branch_item.get("title", "")
                    edge_label = branch_item.get("edge_label", "")
                else:
                    # 구버전 호환성을 위한 폴백
                    branch_title = str(branch_item)
                    edge_label = ""
                
                if not branch_title:
                    continue
                
                # 로컬에서 설명 생성 (API 호출 없음)
                type_descriptions = {
                    "topics": "주제를 깊이 탐구",
                    "details": "세부사항을 자세히 설명",
                    "alternatives": "대안적 접근 방식 탐색",
                    "questions": "추가 질문에 대한 답변",
                    "examples": "구체적인 예시 제공"
                }
                
                description = f"'{branch_title}'에 대해 {type_descriptions.get(branch_type, '추가 탐구')}합니다."
                
                # edge_label이 없거나 비어있으면 생성
                if not edge_label:
                    # 기본 라벨 생성 (10자 이내)
                    edge_labels = {
                        "topics": ["주제탐구", "핵심분석", "개념정리"],
                        "details": ["상세설명", "깊이탐구", "세부분석"],
                        "alternatives": ["대안검토", "다른방법", "새로운시각"],
                        "questions": ["질문답변", "궁금증해결", "추가질문"],
                        "examples": ["예시제공", "실제사례", "구체예시"]
                    }
                    
                    # branch_title의 첫 2-3단어를 사용하거나 기본 라벨 사용
                    title_words = branch_title.split()[:2]
                    if len(''.join(title_words)) <= 10:
                        edge_label = ' '.join(title_words)
                    else:
                        # 타입별 기본 라벨 선택
                        labels = edge_labels.get(branch_type, ["탐구"])
                        import random
                        edge_label = random.choice(labels)
                
                recommendations.append({
                    "title": branch_title,
                    "type": branch_type,
                    "description": description,
                    "priority": self._calculate_priority(branch_type, complexity_score),
                    "estimated_depth": self._estimate_depth(branch_type),
                    "edge_label": edge_label  # 엣지 라벨 추가
                })
        
        # 우선순위로 정렬
        recommendations.sort(key=lambda x: x["priority"], reverse=True)
        
        return recommendations[:max_branches]
    
    async def _evaluate_complexity(self, context: str) -> float:
        """대화 복잡도 평가 (0~1)"""
        try:
            prompt = f"""
            다음 대화의 복잡도를 0에서 1 사이의 숫자로 평가하세요.
            
            평가 기준:
            - 다루는 주제의 수
            - 개념의 깊이
            - 기술적 복잡성
            - 추가 탐구 필요성
            
            대화:
            {context}
            
            숫자만 반환하세요 (예: 0.7)
            """
            
            response = await self.gemini.chat_completion(
                messages=[
                    {"role": "system", "content": "복잡도를 0~1 사이 숫자로만 반환하세요."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                structured=False
            )
            
            if response and "choices" in response:
                try:
                    score_str = response["choices"][0]["message"]["content"].strip()
                    score = float(score_str)
                    return min(max(score, 0), 1)  # 0~1 범위로 제한
                except (ValueError, IndexError):
                    return 0.5  # 기본값
            
            return 0.5
            
        except Exception as e:
            logger.error(f"복잡도 평가 실패: {e}")
            return 0.5
    
    async def _analyze_branch_types(self, context: str) -> Dict[str, List[str]]:
        """브랜치 유형별 분석"""
        try:
            prompt = f"""
            다음 대화에서 각 유형별로 탐구할 수 있는 주제를 찾아주세요.
            
            대화:
            {context}
            
            다음 형식의 JSON으로 반환하세요:
            {{
                "topics": ["주요 주제1", "주요 주제2"],
                "details": ["세부사항1", "세부사항2"],
                "alternatives": ["대안1", "대안2"],
                "questions": ["추가 질문1", "추가 질문2"],
                "examples": ["예시 탐구1", "예시 탐구2"]
            }}
            
            각 카테고리는 최대 2개까지만, 없으면 빈 배열
            """
            
            response = await self.gemini.chat_completion(
                messages=[
                    {"role": "system", "content": "JSON 형식으로만 반환하세요."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                structured=False
            )
            
            if response and "choices" in response:
                try:
                    content = response["choices"][0]["message"]["content"]
                    
                    # JSON 추출
                    if "```json" in content:
                        content = content.split("```json")[1].split("```")[0]
                    elif "```" in content:
                        content = content.split("```")[1].split("```")[0]
                    
                    analysis = json.loads(content.strip())
                    
                    # 기본 구조 보장
                    default = {
                        "topics": [],
                        "details": [],
                        "alternatives": [],
                        "questions": [],
                        "examples": []
                    }
                    
                    for key in default:
                        if key not in analysis or not isinstance(analysis[key], list):
                            analysis[key] = []
                    
                    return analysis
                    
                except (json.JSONDecodeError, Exception) as e:
                    logger.warning(f"브랜치 유형 분석 파싱 실패: {e}")
                    
            return {
                "topics": [],
                "details": [],
                "alternatives": [],
                "questions": [],
                "examples": []
            }
            
        except Exception as e:
            logger.error(f"브랜치 유형 분석 실패: {e}")
            return {}
    
    async def _generate_branch_recommendations(
        self,
        context: str,
        branch_analysis: Dict[str, List[str]],
        complexity_score: float
    ) -> List[Dict[str, Any]]:
        """추천 브랜치 생성"""
        recommendations = []
        
        try:
            # 복잡도에 따라 브랜치 수 조정
            max_branches = min(
                int(complexity_score * 5),  # 복잡도에 비례
                self.max_branches_per_node
            )
            
            # 우선순위: topics > details > questions > alternatives > examples
            priority_order = ["topics", "details", "questions", "alternatives", "examples"]
            
            for branch_type in priority_order:
                if len(recommendations) >= max_branches:
                    break
                    
                branches = branch_analysis.get(branch_type, [])
                for branch_title in branches:
                    if len(recommendations) >= max_branches:
                        break
                    
                    # 브랜치 설명 생성
                    description = await self._generate_branch_description(
                        branch_title,
                        branch_type,
                        context
                    )
                    
                    recommendations.append({
                        "title": branch_title,
                        "type": branch_type,
                        "description": description,
                        "priority": self._calculate_priority(branch_type, complexity_score),
                        "estimated_depth": self._estimate_depth(branch_type)
                    })
            
            # 우선순위로 정렬
            recommendations.sort(key=lambda x: x["priority"], reverse=True)
            
            return recommendations[:max_branches]
            
        except Exception as e:
            logger.error(f"브랜치 추천 생성 실패: {e}")
            return []
    
    async def _generate_branch_description(
        self,
        title: str,
        branch_type: str,
        context: str
    ) -> str:
        """브랜치 설명 생성"""
        try:
            type_descriptions = {
                "topics": "주제를 깊이 탐구",
                "details": "세부사항을 자세히 설명",
                "alternatives": "대안적 접근 방식 탐색",
                "questions": "추가 질문에 대한 답변",
                "examples": "구체적인 예시 제공"
            }
            
            base_description = type_descriptions.get(branch_type, "추가 탐구")
            return f"'{title}'에 대해 {base_description}합니다."
            
        except Exception as e:
            logger.error(f"브랜치 설명 생성 실패: {e}")
            return f"'{title}'에 대해 더 자세히 탐구합니다."
    
    async def create_smart_branches(
        self,
        parent_node_id: str,
        recommendations: List[Dict[str, Any]],
        auto_approve: bool = False
    ) -> List[Dict[str, Any]]:
        """스마트 브랜치 생성"""
        created_branches = []
        
        try:
            # 부모 노드 정보 가져오기
            parent_node = await self.node_service.get_node(parent_node_id)
            if not parent_node:
                logger.error(f"부모 노드를 찾을 수 없음: {parent_node_id}")
                return []
            
            # parent_node가 Pydantic 모델인지 dict인지 확인
            if hasattr(parent_node, 'session_id'):
                session_id = parent_node.session_id
            else:
                session_id = parent_node["session_id"]
            
            for recommendation in recommendations:
                if not auto_approve and recommendation["priority"] < 0.5:
                    continue  # 우선순위가 낮으면 자동 승인 모드가 아닐 때 건너뜀
                
                try:
                    # 브랜치 노드 생성
                    # recommendation에서 node_type 필드 확인, 없으면 'topic' 사용
                    # type 매핑: branch_type을 node_type으로 변환
                    branch_type = recommendation.get("type", "topics")
                    node_type_mapping = {
                        "topics": "topic",
                        "details": "exploration",
                        "alternatives": "exploration",
                        "questions": "question",
                        "examples": "exploration"
                    }
                    node_type = recommendation.get("node_type", node_type_mapping.get(branch_type, "topic"))
                    
                    branch_node = await self.node_service.create_node(
                        session_id=session_id,
                        node_data=NodeCreate(
                            session_id=session_id,
                            parent_id=parent_node_id,
                            title=recommendation["title"],
                            content=recommendation.get("description", ""),
                            type=node_type,
                            metadata={
                                "branch_type": recommendation.get("type", "topics"),
                                "priority": recommendation.get("priority", 0.5),
                                "estimated_depth": recommendation.get("estimated_depth", 3),
                                "auto_generated": True,
                                "created_at": datetime.now(timezone.utc).isoformat()
                            }
                        )
                    )
                    
                    if branch_node:
                        # WebSocket을 통해 노드 생성 이벤트 브로드캐스트
                        from backend.api.websocket.connection_manager import connection_manager
                        
                        # branch_node가 Pydantic 모델인지 dict인지 확인
                        if hasattr(branch_node, 'id'):
                            node_id = branch_node.id
                            # Pydantic 모델을 dict로 변환
                            branch_dict = branch_node.model_dump() if hasattr(branch_node, 'model_dump') else branch_node.dict()
                        else:
                            node_id = branch_node["id"]
                            branch_dict = branch_node
                        
                        # WebSocket 이벤트 전송
                        node_event = {
                            "type": "node_created",
                            "session_id": session_id,
                            "node": branch_dict,
                            "parent_id": parent_node_id
                        }
                        logger.info(f"[브랜치 생성] WebSocket 이벤트 전송 준비: node_id={node_id}, parent_id={parent_node_id}, session_id={session_id}")
                        await connection_manager.broadcast(node_event, session_id)
                        logger.info(f"[브랜치 생성] WebSocket 이벤트 전송 완료: {node_event['type']}")
                        
                        # 초기 시스템 메시지 추가
                        await self.message_service.create_message(
                            MessageCreate(
                                node_id=node_id,
                                content=f"이 브랜치는 '{recommendation['title']}'에 대해 탐구합니다. {recommendation.get('description', '')}",
                                role="system"
                            )
                        )
                        
                        created_branches.append(branch_dict)
                        logger.info(f"[브랜치 생성] 스마트 브랜치 생성 완료: {recommendation['title']}, node_id={node_id}")
                        
                except Exception as e:
                    logger.error(f"브랜치 생성 실패: {recommendation['title']}, 오류: {e}")
                    continue
            
            return created_branches
            
        except Exception as e:
            logger.error(f"스마트 브랜치 생성 실패: {e}")
            return []
    
    def _build_context(
        self,
        user_message: str,
        ai_response: str,
        history: List[Dict[str, Any]] = None
    ) -> str:
        """컨텍스트 구성"""
        context_parts = []
        
        if history:
            for msg in history[-5:]:  # 최근 5개 메시지
                role = msg.get("role", "user")
                content = msg.get("content", "")
                context_parts.append(f"{role}: {content}")
        
        context_parts.append(f"사용자: {user_message}")
        context_parts.append(f"AI: {ai_response}")
        
        return "\n\n".join(context_parts)
    
    def _calculate_priority(self, branch_type: str, complexity_score: float) -> float:
        """브랜치 우선순위 계산"""
        type_weights = {
            "topics": 0.9,
            "details": 0.7,
            "questions": 0.6,
            "alternatives": 0.5,
            "examples": 0.4
        }
        
        base_priority = type_weights.get(branch_type, 0.3)
        return base_priority * complexity_score
    
    def _estimate_depth(self, branch_type: str) -> int:
        """예상 깊이 추정"""
        depth_map = {
            "topics": 5,
            "details": 3,
            "questions": 2,
            "alternatives": 4,
            "examples": 2
        }
        
        return depth_map.get(branch_type, 3)
    
    def _generate_reasoning(
        self,
        complexity_score: float,
        branch_analysis: Dict[str, List[str]]
    ) -> str:
        """분기 추천 이유 생성"""
        total_branches = sum(len(v) for v in branch_analysis.values())
        
        if complexity_score >= 0.8:
            return f"매우 복잡한 주제로 {total_branches}개의 잠재적 분기점이 발견되었습니다."
        elif complexity_score >= 0.6:
            return f"중간 복잡도의 주제로 {total_branches}개의 탐구 가능한 방향이 있습니다."
        elif complexity_score >= 0.4:
            return f"일부 추가 탐구가 가능한 {total_branches}개의 하위 주제가 있습니다."
        else:
            return "단순한 주제로 분기가 필요하지 않을 수 있습니다."
    
    async def summarize_messages(self, messages: List[Any]) -> str:
        """메시지 목록을 요약"""
        try:
            # 메시지를 텍스트로 변환 (Message 객체만 처리)
            conversation_parts = []
            for msg in messages:
                # Message 객체인 경우만 처리
                if hasattr(msg, 'role') and hasattr(msg, 'content'):
                    conversation_parts.append(f"{msg.role}: {msg.content}")
                else:
                    logger.warning(f"Expected Message object, got: {type(msg)}")
            
            if not conversation_parts:
                return "대화 내용이 없습니다."
            
            conversation = "\n".join(conversation_parts)
            
            # 대화 내용이 너무 짧으면 요약하지 않음
            if len(conversation) < 100:
                return conversation[:200] if len(conversation) > 200 else conversation
            
            prompt = f"""
            다음 대화를 간결하게 요약해주세요. 핵심 주제와 중요한 결정사항을 포함해주세요.
            
            대화:
            {conversation[:2000]}  # 너무 긴 대화는 잘라서 전송
            
            요약 (3-5문장):
            """
            
            # Gemini API 직접 호출 (mock_mode 체크 없음 - GeminiService에서 처리)
            response = await self.gemini.chat_completion(
                messages=[
                    {"role": "system", "content": "대화를 간결하고 명확하게 요약하세요."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3
            )
            
            # ChatResponse 객체에서 content 추출
            if response and hasattr(response, 'content'):
                summary = response.content
                # 요약이 너무 길면 잘라서 반환
                return summary[:500] if len(summary) > 500 else summary
            else:
                return "이전 대화가 있습니다."
                
        except Exception as e:
            logger.error(f"메시지 요약 실패: {e}")
            return "이전 대화가 있습니다."
    
    async def check_context_limit(
        self,
        node_id: str,
        token_limit: int = 4000
    ) -> Tuple[bool, int, Optional[str]]:
        """컨텍스트 한계 확인 및 요약 필요성 판단"""
        try:
            # 노드의 전체 대화 기록 가져오기
            conversation = await self.message_service.get_conversation_history(node_id)
            
            # ConversationHistory 객체에서 messages 추출
            if hasattr(conversation, 'messages'):
                history = conversation.messages
            else:
                history = conversation if isinstance(conversation, list) else []
            
            # 토큰 수 추정 (간단한 방법: 문자 수 / 4)
            total_chars = 0
            for msg in history:
                if hasattr(msg, 'content'):
                    total_chars += len(msg.content)
                elif isinstance(msg, dict):
                    total_chars += len(msg.get("content", ""))
            estimated_tokens = total_chars // 4
            
            # 한계 도달 여부
            is_near_limit = estimated_tokens > (token_limit * 0.8)
            
            # 요약이 필요한 경우 요약 생성
            summary = None
            if is_near_limit:
                contents = []
                for msg in history:
                    if hasattr(msg, 'content'):
                        contents.append(msg.content)
                    elif isinstance(msg, dict):
                        contents.append(msg.get("content", ""))
                summary = await self._generate_context_summary(contents)
            
            return is_near_limit, estimated_tokens, summary
            
        except Exception as e:
            logger.error(f"컨텍스트 한계 확인 실패: {e}")
            return False, 0, None
    
    async def _generate_context_summary(self, contents: List[str]) -> str:
        """컨텍스트 요약 생성"""
        try:
            combined = "\n\n".join(contents[:20])  # 최대 20개 메시지
            
            prompt = f"""
            다음 대화를 간결하게 요약해주세요. 핵심 주제와 중요한 결론만 포함하세요.
            
            대화:
            {combined[:3000]}  # 최대 3000자
            
            200자 이내로 요약하세요.
            """
            
            response = await self.gemini.chat_completion(
                messages=[
                    {"role": "system", "content": "간결하고 핵심적인 요약을 제공하세요."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                structured=False
            )
            
            if response and "choices" in response:
                return response["choices"][0]["message"]["content"]
            
            return "대화 요약을 생성할 수 없습니다."
            
        except Exception as e:
            logger.error(f"컨텍스트 요약 생성 실패: {e}")
            return "요약 생성 실패"