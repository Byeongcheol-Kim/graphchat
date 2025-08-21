"""
요약 노드 생성 관련 서비스 (분리된 파일)
"""

import json
import logging
import uuid
from datetime import UTC, datetime

from backend.schemas.message import MessageCreate
from backend.schemas.node import Node

logger = logging.getLogger(__name__)


class SummaryNodeService:
    """요약 노드 생성을 위한 서비스"""

    def __init__(self, db, chat_service=None):
        self.db = db
        self.chat_service = chat_service

    async def create_summary_placeholder(
        self,
        node_ids: list[str],
        session_id: str,
        is_manual: bool = False,
        instructions: str | None = None,
    ) -> Node | None:
        """빈 요약 노드를 즉시 생성 (플레이스홀더)"""
        try:
            # 1. 빈 요약 노드 생성
            node_id = str(uuid.uuid4())

            query = """
            CREATE (n:Node {
                id: $id,
                session_id: $session_id,
                title: $title,
                type: $type,
                content: $content,
                created_at: $created_at,
                updated_at: $created_at,
                token_count: 0,
                depth: 0,
                is_active: true,
                is_summary: true,
                is_generating: true,
                source_node_ids: $source_node_ids,
                metadata: $metadata
            })
            RETURN n
            """

            now = datetime.now(UTC)
            params = {
                "id": node_id,
                "session_id": session_id,
                "title": "요약 생성 중...",
                "type": "summary",
                "content": "AI가 요약을 생성하고 있습니다. 잠시만 기다려주세요...",
                "created_at": now.isoformat(),
                "source_node_ids": json.dumps(node_ids),
                "metadata": json.dumps(
                    {
                        "is_manual": is_manual,
                        "instructions": instructions,
                        "source_count": len(node_ids),
                    }
                ),
            }

            result = await self.db.execute_write(query, params)

            if not result:
                return None

            # 세션과 요약 노드 연결
            session_link_query = """
            MATCH (s:Session {id: $session_id})
            MATCH (n:Node {id: $node_id})
            CREATE (s)-[:HAS_NODE]->(n)
            """
            await self.db.execute_write(
                session_link_query, {"session_id": session_id, "node_id": node_id}
            )

            # 소스 노드들과 관계 생성
            for source_id in node_ids:
                rel_query = """
                MATCH (summary:Node {id: $summary_id}), (source:Node {id: $source_id})
                CREATE (source)-[:SUMMARIZED_TO]->(summary)
                """
                await self.db.execute_write(
                    rel_query, {"summary_id": node_id, "source_id": source_id}
                )

            # Node 객체로 변환
            created_node = Node(
                id=node_id,
                session_id=session_id,
                parent_id=None,
                title="요약 생성 중...",
                content="AI가 요약을 생성하고 있습니다. 잠시만 기다려주세요...",
                type="summary",
                is_active=True,
                is_summary=True,
                is_generating=True,  # 생성 중 플래그
                source_node_ids=node_ids,
                created_at=now,
                updated_at=now,
                message_count=0,
                token_count=0,
                metadata={
                    "is_manual": is_manual,
                    "instructions": instructions,
                    "source_count": len(node_ids),
                },
            )

            return created_node

        except Exception as e:
            logger.error(f"플레이스홀더 요약 노드 생성 실패: {e}")
            return None

    async def generate_summary_content(
        self,
        node_id: str,
        source_nodes: list[Node],
        is_manual: bool = False,
        instructions: str | None = None,
    ):
        """백그라운드에서 요약 내용 생성"""
        try:
            session_id = source_nodes[0].session_id

            # 각 노드의 내용 수집
            contents = []
            for node in source_nodes:
                node_content = f"[{node.title or 'Untitled'}]"
                if node.content:
                    node_content += f"\n{node.content}"
                contents.append(node_content)

            # ChatService 사용하여 요약 생성
            if not self.chat_service:
                from backend.core.container import get_container

                container = get_container()
                self.chat_service = container.chat_service()

            final_summary = None
            final_title = None

            try:
                # 지침이 있으면 지침 기반 요약, 없으면 자동 요약
                if is_manual and instructions:
                    # 지침 기반 요약
                    summary_result = await self.chat_service.generate_summary_with_instructions(
                        contents=contents, instructions=instructions
                    )
                else:
                    # 자동 요약
                    summary_result = await self.chat_service.generate_summary(contents)

                final_summary = summary_result.summary
                final_title = summary_result.title  # LLM이 생성한 타이틀 사용

            except Exception as e:
                logger.error(f"LLM 요약 생성 실패: {e}")
                if is_manual and instructions:
                    final_summary = f"[요약 생성 실패] {instructions}"
                else:
                    final_summary = f"선택된 {len(source_nodes)}개 노드의 요약 생성에 실패했습니다."
                final_title = "요약 생성 실패"

            # 노드 업데이트
            update_query = """
            MATCH (n:Node {id: $id})
            SET n.title = $title,
                n.content = $content,
                n.summary_content = $summary_content,
                n.token_count = $token_count,
                n.is_generating = false,
                n.updated_at = $updated_at
            RETURN n
            """

            params = {
                "id": node_id,
                "title": final_title,
                "content": final_summary,
                "summary_content": final_summary,
                "token_count": len(final_summary or "") // 4,
                "updated_at": datetime.now(UTC).isoformat(),
            }

            await self.db.execute_write(update_query, params)

            # 요약 내용을 메시지로 추가
            from backend.services.message_service import MessageService

            message_service = MessageService(self.db)

            await message_service.create_message(
                MessageCreate(node_id=node_id, role="assistant", content=final_summary)
            )

            # WebSocket으로 업데이트 알림
            try:
                from backend.api.websocket.connection_manager import manager

                await manager.broadcast_to_session(
                    session_id,
                    {
                        "type": "summary_completed",
                        "node_id": node_id,
                        "title": final_title,
                        "content": final_summary,
                        "is_generating": False,
                    },
                )
            except Exception as e:
                logger.error(f"WebSocket 알림 전송 실패: {e}")

        except Exception as e:
            logger.error(f"요약 내용 생성 실패: {e}")
            # 실패 시에도 노드 상태 업데이트
            try:
                update_query = """
                MATCH (n:Node {id: $id})
                SET n.is_generating = false,
                    n.title = '요약 생성 실패',
                    n.content = '요약 생성 중 오류가 발생했습니다.',
                    n.updated_at = $updated_at
                RETURN n
                """
                await self.db.execute_write(
                    update_query,
                    {"id": node_id, "updated_at": datetime.now(UTC).isoformat()},
                )
            except:
                pass
