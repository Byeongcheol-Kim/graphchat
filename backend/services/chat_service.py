"""
채팅 및 AI 서비스
"""

import json
import logging
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from typing import Any

from backend.db.falkordb import FalkorDBManager
from backend.schemas.ai_models import Message as AIMessage
from backend.schemas.message import ChatRequest, Message, MessageCreate
from backend.schemas.service_responses import (
    BranchRecommendation,
    ChatProcessResult,
    SummaryResult,
    TokenUsage,
)
from backend.services.branching_service import BranchingService
from backend.services.gemini_service import GeminiService
from backend.services.message_service import MessageService
from backend.services.node_service import NodeService

# get_settings는 __init__에서 동적으로 import

logger = logging.getLogger(__name__)


class ChatService:
    """채팅 및 AI 관련 비즈니스 로직"""

    def __init__(
        self,
        db: FalkorDBManager,
        gemini_service: GeminiService | None = None,
        branching_service: BranchingService | None = None,
        google_api_key: str | None = None,
        gemini_model: str = "gemini-2.0-flash-exp",
    ) -> None:
        self.db = db
        self.message_service = MessageService(db)
        self.node_service = NodeService(db, chat_service=self)  # 순환 참조 방지를 위해 self 전달

        # GeminiService 주입 또는 생성
        if gemini_service:
            self.gemini = gemini_service
        else:
            self.gemini = GeminiService(api_key=google_api_key, model=gemini_model)

        # BranchingService 주입 또는 생성
        if branching_service:
            self.branching_service = branching_service
        else:
            # BranchingService에도 동일한 GeminiService 전달
            self.branching_service = BranchingService(db, gemini_service=self.gemini)

    async def process_chat(
        self,
        session_id: str | None = None,
        node_id: str | None = None,
        message: str | None = None,
        auto_branch: bool = False,
        request: ChatRequest | None = None,
    ) -> ChatProcessResult:
        """채팅 메시지 처리 - 실제 LLM 연동 및 자동 분기"""
        try:
            # request 객체가 없으면 생성
            if request is None and all([session_id, node_id, message]):
                request = ChatRequest(
                    session_id=session_id, node_id=node_id, message=message, auto_branch=auto_branch
                )
            elif request is None:
                # 필수 파라미터가 없으면 에러
                raise ValueError("ChatRequest 또는 필수 파라미터가 필요합니다")

            # 1. 사용자 메시지 저장
            await self.message_service.create_message(
                MessageCreate(node_id=request.node_id, content=request.message, role="user")
            )

            # 2. 대화 기록 가져오기 (부모 노드 포함)
            conversation = await self.message_service.get_conversation_history(
                request.node_id, include_ancestors=True
            )
            history = conversation.messages  # ConversationHistory 객체에서 messages 리스트 추출

            # 3. 토큰 수 계산 및 제한 확인 (Message 객체는 dict가 아니므로 속성으로 접근)
            total_tokens = sum(len(msg.content.split()) * 1.5 for msg in history)
            total_tokens += len(request.message.split()) * 1.5

            # 토큰 제한 (4000 토큰)
            TOKEN_LIMIT = 4000

            if total_tokens > TOKEN_LIMIT:
                # 토큰 제한 초과 시 부모 노드들의 메시지 요약
                logger.info(f"토큰 제한 초과: {total_tokens} > {TOKEN_LIMIT}, 요약 생성")

                # 부모 노드들의 메시지만 요약 (Message 객체는 속성으로 접근)
                parent_messages = [msg for msg in history if msg.node_id != request.node_id]
                current_messages = [msg for msg in history if msg.node_id == request.node_id]

                if parent_messages:
                    # 부모 메시지 요약 생성 (Message 객체 전달)
                    summary = await self.branching_service.summarize_messages(parent_messages)

                    # 요약을 시스템 메시지로 추가
                    summarized_history = []
                    # 요약을 Message 객체로 추가
                    summary_msg = Message(
                        id="summary",
                        node_id="summary",
                        role="system",
                        content=f"이전 대화 요약: {summary}",
                        timestamp=datetime.utcnow(),
                    )
                    summarized_history.append(summary_msg)
                    summarized_history.extend(current_messages)

                    messages = self._prepare_messages(summarized_history)
                else:
                    # 현재 노드 메시지만 사용
                    messages = self._prepare_messages(current_messages)
            else:
                # 토큰 제한 내에서는 전체 히스토리 사용
                messages = self._prepare_messages(history)

            messages.append(AIMessage(role="user", content=request.message))

            # 4. 먼저 메시지 응답 생성
            response = await self.gemini.chat_completion(messages=messages, temperature=0.7)

            ai_response = response.content if response else "죄송합니다. 응답을 생성할 수 없습니다."

            # 5. AI 응답 메시지 저장
            ai_message = await self.message_service.create_message(
                MessageCreate(node_id=request.node_id, content=ai_response, role="assistant")
            )

            # 6. 브랜치 추천 (자동 생성 대신 추천만)
            new_nodes = []
            branched = False
            recommended_branches = []

            if request.auto_branch:
                # AI 응답을 포함한 전체 메시지로 브랜칭 분석
                messages_with_response = messages.copy()
                messages_with_response.append(AIMessage(role="assistant", content=ai_response))

                # 브랜칭 분석 수행
                branch_analysis = await self.gemini.analyze_branching(
                    messages=messages_with_response, temperature=0.3
                )

                # Pydantic 모델에서 직접 추출하고 엣지 이름 추가
                recommended_branches = []
                for idx, branch in enumerate(branch_analysis.recommended_branches):
                    branch_data = {
                        "title": branch.title,
                        "type": branch.type.value,
                        "description": branch.description,
                        "priority": branch.priority or (0.8 - (idx * 0.1)),
                        "estimated_depth": branch.estimated_depth or 3,
                        "edge_label": branch.title[:20],  # 엣지 이름을 브랜치 제목으로 추천
                    }
                    recommended_branches.append(branch_data)

                # 브랜치를 자동 생성하지 않고 추천만 반환
                if recommended_branches:
                    logger.info(f"브랜치 {len(recommended_branches)}개 추천됨")

                    # 현재 노드가 부모가 될 예정이면 요약 생성
                    await self._generate_node_summary_if_needed(request.node_id)

                # 컨텍스트 한계 확인
                (
                    is_near_limit,
                    token_count,
                    summary,
                ) = await self.branching_service.check_context_limit(
                    node_id=request.node_id, token_limit=4000
                )

                if is_near_limit and summary:
                    # 요약 노드 생성 (옵션)
                    logger.info(f"컨텍스트 한계 접근: {token_count} 토큰, 요약 생성됨")

            # 7. 토큰 사용량 추적
            token_usage = TokenUsage(total_tokens=int(total_tokens))

            # 브랜치 추천을 Pydantic 모델로 변환
            pydantic_recommendations = (
                [BranchRecommendation(**rec) for rec in recommended_branches]
                if request.auto_branch
                else []
            )

            return ChatProcessResult(
                response=ai_response,
                node_id=request.node_id,
                new_nodes=new_nodes,
                branched=branched,
                token_usage=token_usage,
                message_id=ai_message.id if ai_message else None,
                recommended_branches=pydantic_recommendations,
            )

        except Exception as e:
            logger.error(f"채팅 처리 실패: {e}")
            return ChatProcessResult(
                response="죄송합니다. 응답 생성 중 오류가 발생했습니다.",
                node_id=node_id or (request.node_id if request else "unknown"),
                new_nodes=[],
                branched=False,
                token_usage=TokenUsage(),
                message_id=None,
                recommended_branches=[],
            )

    async def generate_summary(self, contents: list[str]) -> SummaryResult:
        """내용 자동 요약 생성 (타이틀 포함)"""
        try:
            # 각 노드의 내용을 명확히 구분
            formatted_contents = []
            for i, content in enumerate(contents, 1):
                formatted_contents.append(f"[노드 {i}]\n{content}")

            prompt = f"""다음 {len(contents)}개 노드의 대화 내용을 종합적으로 요약해주세요.

각 노드에서 중요한 주제와 논점을 파악하고, 전체적인 흐름을 이해하기 쉽게 정리해주세요.

대화 내용:
{chr(10).join(formatted_contents)}

JSON 형식으로 다음 두 가지를 반환해주세요:
1. title: 요약의 핵심을 나타내는 20자 이내의 제목
2. summary: 대화 내용의 종합적인 요약"""

            # Message 타입 사용 (AIMessage 대신)
            from backend.schemas.message import Message as SchemaMessage

            response = await self.gemini.chat_completion(
                messages=[
                    SchemaMessage(
                        id="system_summary",
                        node_id="",
                        role="system",
                        content="당신은 대화 내용을 명확하고 간결하게 요약하는 전문가입니다. 반드시 JSON 형식으로 응답하세요.",
                        timestamp=datetime.now(UTC),
                    ),
                    SchemaMessage(
                        id="user_summary",
                        node_id="",
                        role="user",
                        content=prompt,
                        timestamp=datetime.now(UTC),
                    ),
                ],
                temperature=0.3,
            )

            if response and response.content:
                try:
                    # JSON 파싱 시도
                    import json

                    content = response.content
                    if "```json" in content:
                        content = content.split("```json")[1].split("```")[0]
                    elif "```" in content:
                        content = content.split("```")[1].split("```")[0]

                    result = json.loads(content.strip())
                    summary_text = result.get("summary", "")
                    title_text = result.get("title", "")[:20]  # 20자 제한

                    if not title_text:
                        title_text = "요약 노드"

                except (json.JSONDecodeError, KeyError):
                    # JSON 파싱 실패시 전체 응답을 요약으로 사용
                    summary_text = response.content
                    title_text = "요약 노드"

                token_count = len(summary_text.split()) * 1.5  # 대략적인 토큰 계산
                return SummaryResult(
                    summary=summary_text,
                    title=title_text,
                    original_message_count=len(contents),
                    token_count=int(token_count),
                )
            else:
                fallback_summary = f"{len(contents)}개 노드의 대화 내용을 종합하여 요약했습니다."
                return SummaryResult(
                    summary=fallback_summary,
                    title="요약 노드",
                    original_message_count=len(contents),
                    token_count=len(fallback_summary.split()),
                )

        except Exception as e:
            logger.error(f"요약 생성 실패: {e}")
            error_summary = "요약 생성에 실패했습니다."
            return SummaryResult(
                summary=error_summary,
                title="요약 생성 실패",
                original_message_count=len(contents),
                token_count=len(error_summary.split()),
            )

    async def generate_summary_with_instructions(
        self, contents: list[str], instructions: str
    ) -> SummaryResult:
        """지침 기반 요약 생성 (타이틀 포함)"""
        try:
            # 각 노드의 내용을 명확히 구분
            formatted_contents = []
            for i, content in enumerate(contents, 1):
                formatted_contents.append(f"[노드 {i}]\n{content}")

            prompt = f"""다음 {len(contents)}개 노드의 대화 내용을 아래 지침에 따라 요약해주세요.

지침: {instructions}

대화 내용:
{chr(10).join(formatted_contents)}

JSON 형식으로 다음 두 가지를 반환해주세요:
1. title: 요약의 핵심을 나타내는 20자 이내의 제목
2. summary: 지침에 따른 대화 내용 요약"""

            # Message 타입 사용
            from backend.schemas.message import Message as SchemaMessage

            response = await self.gemini.chat_completion(
                messages=[
                    SchemaMessage(
                        id="system_summary",
                        node_id="",
                        role="system",
                        content="당신은 사용자의 지침에 따라 대화 내용을 정확하게 요약하는 전문가입니다. 반드시 JSON 형식으로 응답하세요.",
                        timestamp=datetime.now(UTC),
                    ),
                    SchemaMessage(
                        id="user_summary",
                        node_id="",
                        role="user",
                        content=prompt,
                        timestamp=datetime.now(UTC),
                    ),
                ],
                temperature=0.3,
            )

            if response and response.content:
                try:
                    # JSON 파싱 시도
                    import json

                    content = response.content
                    if "```json" in content:
                        content = content.split("```json")[1].split("```")[0]
                    elif "```" in content:
                        content = content.split("```")[1].split("```")[0]

                    result = json.loads(content.strip())
                    summary_text = result.get("summary", "")
                    title_text = result.get("title", "")[:20]  # 20자 제한

                    if not title_text:
                        # 지침에서 타이틀 추출
                        title_text = (
                            instructions[:20]
                            if len(instructions) <= 20
                            else instructions[:17] + "..."
                        )

                except (json.JSONDecodeError, KeyError):
                    # JSON 파싱 실패시 전체 응답을 요약으로 사용
                    summary_text = response.content
                    title_text = (
                        instructions[:20] if len(instructions) <= 20 else instructions[:17] + "..."
                    )

                token_count = len(summary_text.split()) * 1.5
                return SummaryResult(
                    summary=summary_text,
                    title=title_text,
                    original_message_count=len(contents),
                    token_count=int(token_count),
                )
            else:
                # 지침을 그대로 반환
                title_text = (
                    instructions[:20] if len(instructions) <= 20 else instructions[:17] + "..."
                )
                return SummaryResult(
                    summary=f"[지침 기반 요약] {instructions}",
                    title=title_text,
                    original_message_count=len(contents),
                    token_count=len(instructions.split()),
                )

        except Exception as e:
            logger.error(f"지침 기반 요약 생성 실패: {e}")
            # 지침을 그대로 반환
            title_text = "요약 생성 실패"
            return SummaryResult(
                summary=f"[요약 실패] {instructions}",
                title=title_text,
                original_message_count=len(contents),
                token_count=len(instructions.split()),
            )

    async def _detect_branches(self, user_message: str, ai_response: str) -> list[str]:
        """대화에서 분기 가능한 주제 감지 - 향상된 버전"""
        try:
            prompt = f"""
            다음 대화를 분석하여 별도로 깊이 탐구할 수 있는 구체적인 주제들을 찾아주세요.

            사용자 질문: {user_message}
            AI 응답: {ai_response}

            기준:
            1. 각 주제는 독립적으로 탐구할 가치가 있어야 함
            2. 너무 일반적이거나 광범위한 주제는 피할 것
            3. 대화에서 실제로 언급된 구체적인 개념이나 주제여야 함
            4. 최대 3개까지만 선정

            JSON 배열 형식으로만 반환하세요.
            예시: ["구체적 주제1", "기술적 세부사항", "관련 개념"]

            분기할 주제가 없으면 빈 배열 반환: []
            """

            response = await self.gemini.chat_completion(
                messages=[
                    AIMessage(
                        role="system",
                        content="당신은 대화 분석 전문가입니다. 오직 JSON 배열만 반환하세요. 설명이나 추가 텍스트 없이 배열만 반환하세요.",
                    ),
                    AIMessage(role="user", content=prompt),
                ],
                temperature=0.3,  # 더 일관된 결과를 위해 온도 낮춤
            )

            if response and response.content:
                try:
                    content = response.content.strip()

                    # JSON 추출 개선
                    # 마크다운 코드 블록 제거
                    if "```json" in content:
                        content = content.split("```json")[1].split("```")[0].strip()
                    elif "```" in content:
                        content = content.split("```")[1].split("```")[0].strip()

                    # JSON 파싱 시도
                    try:
                        branches = json.loads(content)
                    except json.JSONDecodeError:
                        # 대괄호로 시작하고 끝나는 부분만 추출
                        import re

                        match = re.search(r"\[.*?]", content, re.DOTALL)
                        if match:
                            branches = json.loads(match.group())
                        else:
                            return []

                    # 유효성 검증
                    if isinstance(branches, list):
                        # 문자열만 필터링하고 최대 3개로 제한
                        valid_branches = [
                            str(branch).strip()
                            for branch in branches
                            if branch and str(branch).strip()
                        ][:3]

                        logger.info(f"감지된 브랜치: {valid_branches}")
                        return valid_branches

                except Exception as parse_error:
                    logger.warning(f"브랜치 파싱 실패: {parse_error}, 내용: {content}")
                    return []

            return []

        except Exception as e:
            logger.error(f"브랜치 감지 실패: {e}")
            return []

    async def _create_branch_nodes(
        self, parent_id: str, branches: list[str]
    ) -> list[dict[str, Any]]:
        """브랜치 노드 생성"""
        try:
            branch_data = [
                {
                    "title": branch,
                    "content": f"{branch}에 대해 더 자세히 탐구합니다.",
                    "metadata": {"auto_generated": True},
                }
                for branch in branches
            ]

            return await self.node_service.create_branch(parent_id, branch_data)

        except Exception as e:
            logger.error(f"브랜치 노드 생성 실패: {e}")
            return []

    async def _generate_node_summary_if_needed(self, node_id: str) -> SummaryResult | None:
        """노드가 부모가 될 때 요약 생성"""
        try:
            # 현재 노드의 메시지 가져오기
            messages = await self.message_service.get_messages_by_node(node_id)

            if len(messages) < 2:  # 메시지가 너무 적으면 요약 불필요
                return None

            # 요약 생성 (Message 객체 전달)
            summary_text = await self.branching_service.summarize_messages(messages)

            # 노드에 요약 저장
            node = await self.node_service.get_node(node_id)
            if node:
                from backend.schemas.node import NodeUpdate

                # node가 dict인 경우와 객체인 경우 모두 처리
                if hasattr(node, "metadata"):
                    existing_metadata = node.metadata or {}
                else:
                    existing_metadata = node.get("metadata", {}) if isinstance(node, dict) else {}

                await self.node_service.update_node(
                    node_id,
                    NodeUpdate(
                        metadata={
                            **existing_metadata,
                            "summary": summary_text,
                            "summary_generated_at": datetime.utcnow().isoformat(),
                            "summary_token_count": len(summary_text.split()) * 2,
                            "summary_original_count": len(messages),
                        }
                    ),
                )
                logger.info(f"노드 {node_id}에 요약 생성 완료")
                return SummaryResult(
                    summary=summary_text,
                    original_message_count=len(messages),
                    token_count=len(summary_text.split()) * 2,
                    created_at=datetime.utcnow(),
                )

            return None

        except Exception as e:
            logger.error(f"노드 요약 생성 실패: {e}")
            return None

    def _prepare_messages(self, history: list[Message]) -> list[AIMessage]:
        """대화 기록을 Pydantic 메시지 모델로 변환"""
        messages = [AIMessage(role="system", content="당신은 도움이 되는 AI 어시스턴트입니다.")]

        for msg in history:
            # Message 객체만 처리
            messages.append(AIMessage(role=msg.role, content=msg.content))

        # 컨텍스트 길이 제한 (최근 20개 메시지만)
        if len(messages) > 21:
            messages = [messages[0]] + messages[-20:]

        return messages

    async def stream_chat(self, messages: list[Message]) -> AsyncGenerator[str, None]:
        """스트리밍 채팅 응답"""
        try:
            # Message를 AIMessage로 변환
            ai_messages = [AIMessage(role=msg.role, content=msg.content) for msg in messages]

            async for chunk in self.gemini.stream_chat_completion(
                messages=ai_messages, temperature=0.7
            ):
                yield chunk

        except Exception as e:
            logger.error(f"스트리밍 실패: {e}")
            yield "스트리밍 중 오류가 발생했습니다."
