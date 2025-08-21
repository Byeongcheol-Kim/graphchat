"""
노드 관리 서비스
"""

import json
import logging
import uuid
from datetime import UTC, datetime
from typing import Any, Optional

from backend.db.falkordb import FalkorDBManager
from backend.schemas.node import (
    Node,
    NodeCreate,
    NodeRelations,
    NodeTree,
    NodeUpdate,
)
from backend.schemas.service_responses import DeleteNodesResult

logger = logging.getLogger(__name__)

# TYPE_CHECKING을 사용하여 순환 import 방지
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.services.branching_service import BranchingService
    from backend.services.chat_service import ChatService


class NodeService:
    """노드 관련 비즈니스 로직"""

    def __init__(
        self,
        db: FalkorDBManager,
        chat_service: Optional["ChatService"] = None,
        branching_service: Optional["BranchingService"] = None,
    ) -> None:
        self.db = db
        self.chat_service = chat_service
        self.branching_service = branching_service

    async def create_node(self, session_id: str, node_data: NodeCreate) -> Node:
        """새 노드 생성"""
        node_id = str(uuid.uuid4())
        now = datetime.now(UTC)

        # 부모 노드가 있으면 depth 계산
        depth = 0
        if node_data.parent_id:
            parent = await self.get_node(node_data.parent_id)
            if parent:
                # parent는 이미 Node 객체이므로 속성으로 직접 접근
                depth = parent.depth + 1

        try:
            query = """
            CREATE (n:Node {
                id: $id,
                session_id: $session_id,
                title: $title,
                type: $type,
                parent_id: $parent_id,
                created_at: $created_at,
                token_count: 0,
                depth: $depth,
                is_active: true,
                is_summary: $is_summary,
                summary_content: $summary_content,
                metadata: $metadata
            })
            WITH n
            MATCH (s:Session {id: $session_id})
            CREATE (s)-[:HAS_NODE]->(n)
            """

            # 부모 노드와 연결 및 children 배열 업데이트
            if node_data.parent_id:
                query += """
                WITH n
                MATCH (p:Node {id: $parent_id})
                CREATE (p)-[:HAS_CHILD]->(n)
                WITH n, p
                SET p.children = CASE
                    WHEN p.children IS NULL THEN [$id]
                    WHEN NOT $id IN p.children THEN p.children + $id
                    ELSE p.children
                END
                """

            query += " RETURN n"

            # metadata를 JSON 문자열로 변환
            import json

            metadata_str = json.dumps(node_data.metadata) if node_data.metadata else "{}"

            params = {
                "id": node_id,
                "session_id": session_id,
                "title": node_data.title,
                "type": node_data.type,
                "parent_id": node_data.parent_id,
                "created_at": now.isoformat(),
                "depth": depth,
                "is_summary": node_data.is_summary,
                "summary_content": node_data.summary_content,
                "metadata": metadata_str,  # JSON 문자열로 저장
            }

            result = await self.db.execute_query(query, params)
            if result:
                node_data_raw = result[0]["n"]

                # FalkorDB가 반환한 객체를 dict로 변환 (필요한 경우)
                if hasattr(node_data_raw, "__dict__"):
                    node_dict = node_data_raw.__dict__
                elif hasattr(node_data_raw, "properties"):
                    node_dict = node_data_raw.properties
                else:
                    node_dict = (
                        dict(node_data_raw)
                        if not isinstance(node_data_raw, dict)
                        else node_data_raw
                    )

                # metadata가 문자열로 반환된 경우 딕셔너리로 변환
                metadata = {}
                metadata_value = (
                    node_dict.get("metadata")
                    if hasattr(node_dict, "get")
                    else node_dict["metadata"]
                )
                if isinstance(metadata_value, str):
                    try:
                        metadata = json.loads(metadata_value)
                    except:
                        metadata = {}
                elif isinstance(metadata_value, dict):
                    metadata = metadata_value

                # Pydantic 모델로 변환
                def safe_get(d, key, default=None):
                    if hasattr(d, "get"):
                        return d.get(key, default)
                    elif hasattr(d, "__getitem__"):
                        try:
                            return d[key]
                        except (KeyError, TypeError):
                            return default
                    else:
                        return default

                created_node = Node(
                    id=safe_get(node_dict, "id"),
                    session_id=safe_get(node_dict, "session_id"),
                    title=safe_get(node_dict, "title"),
                    content=safe_get(node_dict, "content", ""),
                    type=safe_get(node_dict, "type"),
                    parent_id=safe_get(node_dict, "parent_id"),
                    created_at=datetime.fromisoformat(safe_get(node_dict, "created_at")),
                    updated_at=datetime.fromisoformat(
                        safe_get(node_dict, "updated_at", safe_get(node_dict, "created_at"))
                    ),
                    token_count=safe_get(node_dict, "token_count", 0),
                    depth=safe_get(node_dict, "depth", depth),
                    is_active=safe_get(node_dict, "is_active", True),
                    is_summary=safe_get(node_dict, "is_summary", False),
                    summary_content=safe_get(node_dict, "summary_content"),
                    metadata=metadata,
                )

                # 부모 노드가 있고 요약이 없다면 요약 생성
                if node_data.parent_id:
                    await self._generate_parent_summary_if_needed(node_data.parent_id)

                return created_node

        except Exception as e:
            import traceback

            logger.error(f"노드 생성 실패: {e}\n{traceback.format_exc()}")
            raise

    async def get_node(self, node_id: str) -> Node | None:
        """노드 조회"""
        try:
            # 노드와 메시지 카운트를 함께 조회
            query = """
            MATCH (n:Node {id: $id})
            OPTIONAL MATCH (n)-[:HAS_MESSAGE]->(m:Message)
            WITH n, COUNT(m) as message_count
            RETURN n, message_count
            """

            result = await self.db.execute_query(query, {"id": node_id})
            if result:
                node_data = result[0]["n"]
                message_count = result[0]["message_count"]

                # FalkorDB가 반환한 객체를 dict로 변환 (필요한 경우)
                if hasattr(node_data, "__dict__"):
                    node_dict = node_data.__dict__
                elif hasattr(node_data, "properties"):
                    node_dict = node_data.properties
                else:
                    node_dict = dict(node_data) if not isinstance(node_data, dict) else node_data

                # metadata 처리
                metadata = {}

                def safe_get(d, key, default=None):
                    if hasattr(d, "get"):
                        return d.get(key, default)
                    elif hasattr(d, "__getitem__"):
                        try:
                            return d[key]
                        except (KeyError, TypeError):
                            return default
                    else:
                        return default

                metadata_value = safe_get(node_dict, "metadata")
                if isinstance(metadata_value, str):
                    try:
                        metadata = json.loads(metadata_value)
                    except:
                        metadata = {}
                elif isinstance(metadata_value, dict):
                    metadata = metadata_value

                # metadata에 message_count 추가
                if metadata is None:
                    metadata = {}
                metadata["message_count"] = message_count

                # source_node_ids 처리
                source_node_ids = safe_get(node_dict, "source_node_ids")
                if source_node_ids and isinstance(source_node_ids, str):
                    try:
                        source_node_ids = json.loads(source_node_ids)
                    except:
                        source_node_ids = None

                # Pydantic 모델로 변환
                return Node(
                    id=safe_get(node_dict, "id"),
                    session_id=safe_get(node_dict, "session_id"),
                    title=safe_get(node_dict, "title"),
                    content=safe_get(node_dict, "content", ""),
                    type=safe_get(node_dict, "type"),
                    parent_id=safe_get(node_dict, "parent_id"),
                    source_node_ids=source_node_ids,  # source_node_ids 추가
                    created_at=datetime.fromisoformat(safe_get(node_dict, "created_at")),
                    updated_at=datetime.fromisoformat(
                        safe_get(node_dict, "updated_at", safe_get(node_dict, "created_at"))
                    ),
                    token_count=safe_get(
                        node_dict, "token_count", message_count * 100
                    ),  # 메시지 기반 토큰 추정
                    depth=safe_get(node_dict, "depth", 0),
                    is_active=safe_get(node_dict, "is_active", True),
                    is_summary=safe_get(node_dict, "is_summary", False),
                    summary_content=safe_get(node_dict, "summary_content"),  # summary_content 추가
                    metadata=metadata,
                    message_count=message_count,  # message_count 직접 설정
                )
            return None

        except Exception as e:
            logger.error(f"노드 조회 실패: {e}")
            return None

    async def get_node_with_messages(self, node_id: str) -> dict[str, Any] | None:
        """메시지를 포함한 노드 조회"""
        try:
            node = await self.get_node(node_id)
            if not node:
                return None

            # 노드의 메시지 조회
            query = """
            MATCH (n:Node {id: $id})-[:HAS_MESSAGE]->(m:Message)
            RETURN m
            ORDER BY m.timestamp
            """

            result = await self.db.execute_query(query, {"id": node_id})
            node["messages"] = [r["m"] for r in result]

            return node

        except Exception as e:
            logger.error(f"메시지 포함 노드 조회 실패: {e}")
            return None

    async def get_node_tree(self, node_id: str) -> NodeTree | None:
        """노드 트리 구조 조회 - NodeTree 객체 반환"""
        try:
            from backend.schemas.node import NodeTree

            node = await self.get_node(node_id)
            if not node:
                return None

            async def build_tree(current_node: Node) -> NodeTree:
                """재귀적으로 트리 구성"""
                children = await self.get_children(current_node.id)

                children_trees = []
                for child in children:
                    child_tree = await build_tree(child)
                    children_trees.append(child_tree)

                return NodeTree(node=current_node, children=children_trees)

            return await build_tree(node)

        except Exception as e:
            logger.error(f"노드 트리 조회 실패: {e}")
            return None

    async def get_children(self, node_id: str) -> list[Node]:
        """자식 노드 조회 - Node 객체 리스트 반환"""
        try:
            query = """
            MATCH (p:Node {id: $id})-[:HAS_CHILD]->(c:Node)
            RETURN c
            ORDER BY c.created_at
            """

            result = await self.db.execute_query(query, {"id": node_id})
            children = []
            for r in result:
                child_data = r["c"]
                # metadata 문자열을 다시 딕셔너리로 변환
                metadata = {}
                if "metadata" in child_data:
                    try:
                        import json

                        metadata = (
                            json.loads(child_data["metadata"])
                            if isinstance(child_data["metadata"], str)
                            else child_data.get("metadata", {})
                        )
                    except:
                        metadata = {}

                children.append(
                    Node(
                        id=child_data["id"],
                        session_id=child_data["session_id"],
                        parent_id=child_data.get("parent_id"),
                        title=child_data["title"],
                        content=child_data.get("content", ""),
                        type=child_data["type"],
                        is_active=child_data.get("is_active", True),
                        created_at=datetime.fromisoformat(child_data["created_at"]),
                        updated_at=datetime.fromisoformat(
                            child_data.get("updated_at", child_data["created_at"])
                        ),
                        message_count=child_data.get("message_count", 0),
                        token_count=child_data.get("token_count", 0),
                        metadata=metadata,
                    )
                )
            return children

        except Exception as e:
            logger.error(f"자식 노드 조회 실패: {e}")
            return []

    async def has_children(self, node_id: str) -> bool:
        """노드가 자식 노드를 가지고 있는지 확인"""
        try:
            query = """
            MATCH (parent:Node {id: $node_id})-[:HAS_CHILD]->(child:Node)
            RETURN count(child) as child_count
            """

            result = await self.db.execute_query(query, {"node_id": node_id})
            if result and len(result) > 0:
                child_count = result[0].get("child_count", 0)
                return child_count > 0
            return False
        except Exception as e:
            logger.error(f"자식 노드 확인 실패: {e}")
            return False

    async def list_nodes(
        self, session_id: str, parent_id: str | None = None, skip: int = 0, limit: int = 50
    ) -> list[Node]:
        """세션의 노드 목록 조회"""
        try:
            # 세션의 모든 노드와 메시지 카운트를 함께 조회
            if parent_id:
                query = """
                MATCH (s:Session {id: $session_id})-[:HAS_NODE]->(n:Node {parent_id: $parent_id})
                OPTIONAL MATCH (n)-[:HAS_MESSAGE]->(m:Message)
                WITH n, COUNT(m) as message_count
                RETURN n, message_count
                ORDER BY n.created_at
                SKIP $skip
                LIMIT $limit
                """
                params = {
                    "session_id": session_id,
                    "parent_id": parent_id,
                    "skip": skip,
                    "limit": limit,
                }
            else:
                query = """
                MATCH (s:Session {id: $session_id})-[:HAS_NODE]->(n:Node)
                OPTIONAL MATCH (n)-[:HAS_MESSAGE]->(m:Message)
                WITH n, COUNT(m) as message_count
                RETURN n, message_count
                ORDER BY n.created_at
                SKIP $skip
                LIMIT $limit
                """
                params = {"session_id": session_id, "skip": skip, "limit": limit}

            result = await self.db.execute_query(query, params)
            nodes = []
            for row in result:
                node_data = row["n"]
                message_count = row["message_count"]

                # FalkorDB가 반환한 객체를 dict로 변환 (필요한 경우)
                if hasattr(node_data, "__dict__"):
                    node_dict = node_data.__dict__
                elif hasattr(node_data, "properties"):
                    node_dict = node_data.properties
                else:
                    node_dict = dict(node_data) if not isinstance(node_data, dict) else node_data

                # metadata 처리
                metadata = {}

                def safe_get(d, key, default=None):
                    if hasattr(d, "get"):
                        return d.get(key, default)
                    elif hasattr(d, "__getitem__"):
                        try:
                            return d[key]
                        except (KeyError, TypeError):
                            return default
                    else:
                        return default

                metadata_value = safe_get(node_dict, "metadata")
                if isinstance(metadata_value, str):
                    try:
                        metadata = json.loads(metadata_value)
                    except:
                        metadata = {}
                elif isinstance(metadata_value, dict):
                    metadata = metadata_value

                # metadata에 message_count 추가
                if metadata is None:
                    metadata = {}
                metadata["message_count"] = message_count

                # source_node_ids 처리
                source_node_ids = node_data.get("source_node_ids")
                if source_node_ids and isinstance(source_node_ids, str):
                    try:
                        source_node_ids = json.loads(source_node_ids)
                    except:
                        source_node_ids = None

                # Pydantic 모델로 변환
                node = Node(
                    id=node_data["id"],
                    session_id=node_data["session_id"],
                    title=node_data["title"],
                    content=node_data.get("content", ""),
                    type=node_data["type"],
                    parent_id=node_data.get("parent_id"),
                    source_node_ids=source_node_ids,  # source_node_ids 추가
                    created_at=datetime.fromisoformat(node_data["created_at"]),
                    updated_at=datetime.fromisoformat(
                        node_data.get("updated_at", node_data["created_at"])
                    ),
                    token_count=node_data.get(
                        "token_count", message_count * 100
                    ),  # 메시지 기반 토큰 추정
                    depth=node_data.get("depth", 0),
                    is_active=node_data.get("is_active", True),
                    is_summary=node_data.get("is_summary", False),
                    summary_content=node_data.get("summary_content"),  # summary_content 추가
                    metadata=metadata,
                    message_count=message_count,  # message_count 직접 설정
                )
                nodes.append(node)

            return nodes

        except Exception as e:
            logger.error(f"노드 목록 조회 실패: {e}")
            return []

    async def update_node(self, node_id: str, update_data: NodeUpdate) -> Node | None:
        """노드 업데이트"""
        try:
            set_clauses = []
            params = {"id": node_id}

            if update_data.title is not None:
                set_clauses.append("n.title = $title")
                params["title"] = update_data.title

            if update_data.is_active is not None:
                set_clauses.append("n.is_active = $is_active")
                params["is_active"] = update_data.is_active

            if update_data.metadata is not None:
                set_clauses.append("n.metadata = $metadata")
                # metadata를 JSON 문자열로 변환
                import json

                metadata_str = (
                    json.dumps(update_data.metadata)
                    if isinstance(update_data.metadata, dict)
                    else update_data.metadata
                )
                params["metadata"] = metadata_str

            if not set_clauses:
                return await self.get_node(node_id)

            query = f"""
            MATCH (n:Node {{id: $id}})
            SET {", ".join(set_clauses)}
            RETURN n
            """

            result = await self.db.execute_query(query, params)
            if result:
                # 업데이트된 노드를 다시 조회하여 Pydantic 모델로 반환
                return await self.get_node(node_id)
            return None

        except Exception as e:
            logger.error(f"노드 업데이트 실패: {e}")
            return None

    async def delete_node(self, node_id: str, include_descendants: bool = False) -> bool:
        """노드 삭제

        Args:
            node_id: 삭제할 노드 ID
            include_descendants: True면 모든 하위 노드도 함께 삭제
        """
        try:
            if include_descendants:
                # 하위 노드 포함 삭제: 재귀적으로 모든 자손 노드 찾기
                query = """
                MATCH path = (n:Node {id: $id})-[:HAS_CHILD*0..]->(descendant:Node)
                WITH descendant
                OPTIONAL MATCH (descendant)-[:HAS_MESSAGE]->(m:Message)
                DETACH DELETE descendant, m
                """
            else:
                # 단일 노드만 삭제
                query = """
                MATCH (n:Node {id: $id})
                OPTIONAL MATCH (n)-[:HAS_MESSAGE]->(m:Message)
                DETACH DELETE n, m
                """

            await self.db.execute_write(query, {"id": node_id})
            return True

        except Exception as e:
            logger.error(f"노드 삭제 실패: {e}")
            return False

    async def delete_nodes(
        self, node_ids: list[str], include_descendants: bool = False
    ) -> DeleteNodesResult:
        """여러 노드 삭제

        Args:
            node_ids: 삭제할 노드 ID 리스트
            include_descendants: True면 각 노드의 모든 하위 노드도 함께 삭제

        Returns:
            삭제 결과 정보
        """
        result = DeleteNodesResult(
            success=False,
            deleted_count=0,
            deleted_node_ids=[],
            deleted_with_descendants={},
            failed_node_ids=[],
        )

        try:
            if include_descendants:
                # 각 노드와 하위 노드 모두 삭제
                for node_id in node_ids:
                    # 먼저 하위 노드들 조회
                    descendants = await self.get_node_descendants(node_id)
                    descendant_ids = [d.id for d in descendants]

                    # 삭제 시도
                    success = await self.delete_node(node_id, include_descendants=True)

                    if success:
                        result.deleted_node_ids.append(node_id)
                        result.deleted_count += 1

                        if descendant_ids:
                            result.deleted_with_descendants[node_id] = descendant_ids
                            result.deleted_count += len(descendant_ids)
                            result.deleted_node_ids.extend(descendant_ids)
                    else:
                        result.failed_node_ids.append(node_id)
            else:
                # 여러 노드를 한 번에 삭제 (더 효율적)
                query = """
                MATCH (n:Node)
                WHERE n.id IN $node_ids
                WITH n
                OPTIONAL MATCH (n)-[:HAS_MESSAGE]->(m:Message)
                WITH n, collect(m) as messages
                DETACH DELETE n
                FOREACH (msg IN messages | DETACH DELETE msg)
                RETURN count(n) as deleted_count
                """

                delete_result = await self.db.execute_write(query, {"node_ids": node_ids})

                if delete_result and len(delete_result) > 0:
                    deleted_count = delete_result[0].get("deleted_count", 0)
                    result.deleted_count = deleted_count
                    result.deleted_node_ids = node_ids[:deleted_count]

                    # 삭제 실패한 노드 확인
                    if deleted_count < len(node_ids):
                        # 실제로 어떤 노드가 삭제되었는지 확인
                        check_query = "MATCH (n:Node) WHERE n.id IN $node_ids RETURN n.id as id"
                        remaining = await self.db.execute_query(check_query, {"node_ids": node_ids})
                        remaining_ids = [r["id"] for r in remaining]

                        result.deleted_node_ids = [
                            nid for nid in node_ids if nid not in remaining_ids
                        ]
                        result.failed_node_ids = remaining_ids
                    else:
                        result.deleted_node_ids = node_ids

            result.success = len(result.failed_node_ids) == 0

            if result.success:
                result.message = f"{result.deleted_count}개 노드가 성공적으로 삭제되었습니다"
            else:
                result.message = (
                    f"{result.deleted_count}개 노드 삭제, {len(result.failed_node_ids)}개 실패"
                )

        except Exception as e:
            logger.error(f"여러 노드 삭제 실패: {e}")
            result.success = False
            result.failed_node_ids = node_ids
            result.message = f"삭제 중 오류 발생: {str(e)}"

        return result

    async def create_branch(
        self, parent_id: str, branches: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """브랜치 생성"""
        try:
            parent = await self.get_node(parent_id)
            if not parent:
                return []

            created_nodes = []
            for branch_data in branches:
                node_create = NodeCreate(
                    session_id=parent.session_id,  # Node 객체의 속성 직접 접근
                    title=branch_data["title"],
                    type="solution",  # assistant -> solution으로 변경
                    parent_id=parent_id,
                    content=branch_data.get("content"),
                    metadata=branch_data.get("metadata", {}),
                )

                node = await self.create_node(parent.session_id, node_create)
                created_nodes.append(node)

            return created_nodes

        except Exception as e:
            logger.error(f"브랜치 생성 실패: {e}")
            return []

    async def create_summary(
        self, node_ids: list[str], is_manual: bool = False, summary_content: str | None = None
    ) -> Node | None:
        """요약 노드 생성 (즉시 플레이스홀더 반환, 백그라운드에서 내용 생성)"""
        try:
            if not node_ids:
                return None

            # 모든 소스 노드 가져오기
            source_nodes = []
            for node_id in node_ids:
                node = await self.get_node(node_id)
                if node:
                    source_nodes.append(node)

            if not source_nodes:
                return None

            session_id = source_nodes[0].session_id

            # SummaryNodeService 사용
            from backend.services.node_service_summary import SummaryNodeService

            summary_service = SummaryNodeService(self.db, self.chat_service)

            # 1. 즉시 플레이스홀더 노드 생성 및 반환
            placeholder_node = await summary_service.create_summary_placeholder(
                node_ids=node_ids,
                session_id=session_id,
                is_manual=is_manual,
                instructions=summary_content,
            )

            if not placeholder_node:
                return None

            # 2. 백그라운드에서 요약 내용 생성
            import asyncio

            asyncio.create_task(
                summary_service.generate_summary_content(
                    node_id=placeholder_node.id,
                    source_nodes=source_nodes,
                    is_manual=is_manual,
                    instructions=summary_content,
                )
            )

            return placeholder_node

        except Exception as e:
            logger.error(f"요약 노드 생성 실패: {e}")
            return None

    async def create_summary_old(
        self, node_ids: list[str], is_manual: bool = False, summary_content: str | None = None
    ) -> dict[str, Any] | None:
        """요약 노드 생성 (이전 버전 - 삭제 예정)"""
        try:
            if not node_ids:
                return None

            # 모든 소스 노드 가져오기
            source_nodes = []
            for node_id in node_ids:
                node = await self.get_node(node_id)
                if node:
                    source_nodes.append(node)

            if not source_nodes:
                return None

            session_id = source_nodes[0].session_id

            # 자동 요약인 경우 또는 지침이 제공된 경우 LLM으로 내용 생성
            if not is_manual or (is_manual and summary_content):
                # 각 노드의 내용 수집
                contents = []
                for node in source_nodes:
                    node_content = f"[{node.title or 'Untitled'}]"
                    if node.content:
                        node_content += f"\n{node.content}"
                    # 노드의 메시지도 포함 (메시지는 별도 조회 필요)
                    messages = []  # 현재 Node 객체에는 messages가 없음
                    if messages:
                        for msg in messages[:5]:  # 처음 5개 메시지만
                            node_content += f"\n- {msg.get('role', 'unknown')}: {msg.get('content', '')[:100]}..."
                    contents.append(node_content)

                # ChatService 사용하여 요약 생성
                if not self.chat_service:
                    # chat_service가 주입되지 않은 경우 컨테이너에서 가져오기
                    from backend.core.container import get_container

                    container = get_container()
                    self.chat_service = container.chat_service()

                chat_service = self.chat_service

                try:
                    # 지침이 있으면 지침 기반 요약, 없으면 자동 요약
                    if is_manual and summary_content:
                        # 지침 기반 요약
                        summary_result = await chat_service.generate_summary_with_instructions(
                            contents=contents, instructions=summary_content
                        )
                    else:
                        # 자동 요약
                        summary_result = await chat_service.generate_summary(contents)

                    summary_content = summary_result.summary
                except Exception as e:
                    logger.error(f"LLM 요약 생성 실패: {e}")
                    # 지침이 있으면 지침을 요약으로, 없으면 기본 메시지
                    if is_manual and summary_content:
                        summary_content = f"[지침 기반 요약 실패] {summary_content}"
                    else:
                        summary_content = f"선택된 {len(node_ids)}개 노드의 요약"

            # 요약 노드 생성 (parent_id 없이, source_node_ids 포함)
            node_id = str(uuid.uuid4())
            query = """
            CREATE (n:Node {
                id: $id,
                session_id: $session_id,
                title: $title,
                type: $type,
                content: $content,
                created_at: $created_at,
                token_count: $token_count,
                depth: $depth,
                is_active: true,
                is_summary: true,
                summary_content: $summary_content,
                source_node_ids: $source_node_ids,
                metadata: $metadata
            })
            RETURN n
            """

            now = datetime.now(UTC)
            params = {
                "id": node_id,
                "session_id": session_id,
                "title": "요약",
                "type": "summary",
                "content": summary_content,
                "created_at": now.isoformat(),
                "token_count": len(summary_content or "") // 4,
                "depth": max(node.depth for node in source_nodes) + 1,
                "summary_content": summary_content,
                "source_node_ids": json.dumps(node_ids),  # 직접 속성으로 저장
                "metadata": json.dumps({"is_manual": is_manual}),  # 메타데이터는 수동 여부만
            }

            result = await self.db.execute_query(query, params)
            if not result:
                return None

            summary_node = result[0]["n"]

            # 모든 소스 노드와 요약 노드를 연결
            for source_id in node_ids:
                link_query = """
                MATCH (source:Node {id: $source_id})
                MATCH (summary:Node {id: $summary_id})
                CREATE (source)-[:SUMMARIZED_TO]->(summary)
                """
                await self.db.execute_write(
                    link_query, {"source_id": source_id, "summary_id": node_id}
                )

            # 세션과 요약 노드 연결
            session_link_query = """
            MATCH (s:Session {id: $session_id})
            MATCH (n:Node {id: $node_id})
            CREATE (s)-[:HAS_NODE]->(n)
            """
            await self.db.execute_write(
                session_link_query, {"session_id": session_id, "node_id": node_id}
            )

            # source_node_ids 파싱
            source_node_ids = summary_node.get("source_node_ids")
            if source_node_ids and isinstance(source_node_ids, str):
                try:
                    source_node_ids = json.loads(source_node_ids)
                except:
                    source_node_ids = node_ids
            else:
                source_node_ids = node_ids

            # 요약 내용을 메시지로 추가
            from backend.schemas.message import MessageCreate
            from backend.services.message_service import MessageService

            message_service = MessageService(self.db)

            # assistant 메시지로 요약 내용 추가
            await message_service.create_message(
                MessageCreate(node_id=node_id, role="assistant", content=summary_content)
            )

            # Node 객체로 변환하여 반환
            return Node(
                id=summary_node["id"],
                session_id=summary_node["session_id"],
                parent_id=None,
                title=summary_node["title"],
                content=summary_node["content"],
                type=summary_node["type"],
                is_active=summary_node.get("is_active", True),
                is_summary=True,
                source_node_ids=source_node_ids,  # source_node_ids 추가
                created_at=datetime.fromisoformat(summary_node["created_at"]),
                updated_at=datetime.fromisoformat(
                    summary_node.get("updated_at", summary_node["created_at"])
                ),
                message_count=1,  # 요약 메시지 1개
                token_count=summary_node.get("token_count", 0),
                metadata={"is_manual": is_manual},
            )

        except Exception as e:
            logger.error(f"요약 생성 실패: {e}")
            return None

    async def create_reference(
        self, node_ids: list[str], title: str | None = None, content: str | None = None
    ) -> Node | None:
        """참조 노드 생성 - 여러 노드를 참조하는 노드"""
        try:
            if not node_ids:
                return None

            # 모든 소스 노드 가져오기
            source_nodes = []
            for node_id in node_ids:
                node = await self.get_node(node_id)
                if node:
                    source_nodes.append(node)

            if not source_nodes:
                return None

            session_id = source_nodes[0].session_id

            # 참조 노드 생성 (parent_id 없이, source_node_ids 포함)
            node_id = str(uuid.uuid4())
            query = """
            CREATE (n:Node {
                id: $id,
                session_id: $session_id,
                title: $title,
                type: $type,
                content: $content,
                created_at: $created_at,
                token_count: $token_count,
                depth: $depth,
                is_active: true,
                is_reference: true,
                source_node_ids: $source_node_ids,
                metadata: $metadata
            })
            RETURN n
            """

            now = datetime.now(UTC)
            params = {
                "id": node_id,
                "session_id": session_id,
                "title": title or f"참조 ({len(node_ids)}개 노드)",
                "type": "reference",
                "content": content or f"선택된 {len(node_ids)}개 노드에 대한 참조",
                "created_at": now.isoformat(),
                "token_count": 0,
                "depth": max(node.depth for node in source_nodes) + 1,
                "source_node_ids": json.dumps(node_ids),  # 직접 속성으로 저장
                "metadata": json.dumps({"referenced_node_ids": node_ids}),
            }

            result = await self.db.execute_query(query, params)
            if not result:
                return None

            reference_node = result[0]["n"]

            # 모든 소스 노드와 참조 노드를 연결
            for source_id in node_ids:
                link_query = """
                MATCH (source:Node {id: $source_id})
                MATCH (reference:Node {id: $reference_id})
                CREATE (source)-[:REFERENCED_BY]->(reference)
                """
                await self.db.execute_write(
                    link_query, {"source_id": source_id, "reference_id": node_id}
                )

            # 세션과 참조 노드 연결
            session_link_query = """
            MATCH (s:Session {id: $session_id})
            MATCH (n:Node {id: $node_id})
            CREATE (s)-[:HAS_NODE]->(n)
            """
            await self.db.execute_write(
                session_link_query, {"session_id": session_id, "node_id": node_id}
            )

            # source_node_ids 파싱
            source_node_ids = reference_node.get("source_node_ids")
            if source_node_ids and isinstance(source_node_ids, str):
                try:
                    source_node_ids = json.loads(source_node_ids)
                except:
                    source_node_ids = node_ids
            else:
                source_node_ids = node_ids

            # Node 객체로 변환하여 반환
            return Node(
                id=reference_node["id"],
                session_id=reference_node["session_id"],
                parent_id=None,
                title=reference_node["title"],
                content=reference_node["content"],
                type=reference_node["type"],
                is_active=reference_node.get("is_active", True),
                is_summary=False,
                source_node_ids=source_node_ids,  # source_node_ids 추가
                created_at=datetime.fromisoformat(reference_node["created_at"]),
                updated_at=datetime.fromisoformat(
                    reference_node.get("updated_at", reference_node["created_at"])
                ),
                message_count=0,
                token_count=reference_node.get("token_count", 0),
                metadata={"referenced_node_ids": node_ids},
            )

        except Exception as e:
            logger.error(f"참조 노드 생성 실패: {e}")
            return None

    async def get_node_descendants(
        self, node_id: str, max_depth: int | None = None
    ) -> list[Node]:
        """노드의 모든 하위 노드(자손) 가져오기

        Args:
            node_id: 노드 ID
            max_depth: 최대 깊이 (None이면 제한 없음)

        Returns:
            하위 노드 리스트
        """
        try:
            if max_depth is not None:
                query = """
                MATCH path = (n:Node {id: $id})-[:HAS_CHILD*1..$max_depth]->(descendant:Node)
                RETURN DISTINCT descendant
                ORDER BY descendant.depth ASC, descendant.created_at ASC
                """
                params = {"id": node_id, "max_depth": max_depth}
            else:
                query = """
                MATCH path = (n:Node {id: $id})-[:HAS_CHILD*]->(descendant:Node)
                RETURN DISTINCT descendant
                ORDER BY descendant.depth ASC, descendant.created_at ASC
                """
                params = {"id": node_id}

            result = await self.db.execute_query(query, params)

            descendants = []
            for record in result:
                descendant_data = dict(record["descendant"])
                descendants.append(self._node_from_dict(descendant_data))

            return descendants

        except Exception as e:
            logger.error(f"하위 노드 조회 실패: {e}")
            return []

    async def get_node_ancestors(self, node_id: str) -> list[Node]:
        """노드의 모든 상위 노드(조상) 가져오기

        Args:
            node_id: 노드 ID

        Returns:
            상위 노드 리스트 (루트부터 순서대로)
        """
        try:
            query = """
            MATCH path = (n:Node {id: $id})<-[:HAS_CHILD*]-(ancestor:Node)
            RETURN DISTINCT ancestor
            ORDER BY ancestor.depth ASC
            """

            result = await self.db.execute_query(query, {"id": node_id})

            ancestors = []
            for record in result:
                ancestor_data = dict(record["ancestor"])
                ancestors.append(self._node_from_dict(ancestor_data))

            return ancestors

        except Exception as e:
            logger.error(f"상위 노드 조회 실패: {e}")
            return []

    async def get_node_path(self, node_id: str) -> list[Node]:
        """루트 노드부터 특정 노드까지의 경로 가져오기

        Args:
            node_id: 노드 ID

        Returns:
            경로상의 노드 리스트 (루트부터 현재 노드까지)
        """
        try:
            # 현재 노드 가져오기
            current_node = await self.get_node(node_id)
            if not current_node:
                return []

            # 조상 노드들 가져오기
            ancestors = await self.get_node_ancestors(node_id)

            # 루트부터 현재 노드까지 순서대로 정렬
            path = ancestors + [current_node]

            return path

        except Exception as e:
            logger.error(f"노드 경로 조회 실패: {e}")
            return []

    async def get_leaf_nodes(self, session_id: str) -> list[Node]:
        """세션의 모든 리프 노드(자식이 없는 노드) 가져오기

        Args:
            session_id: 세션 ID

        Returns:
            리프 노드 리스트
        """
        try:
            query = """
            MATCH (n:Node {session_id: $session_id})
            WHERE NOT (n)-[:HAS_CHILD]->(:Node)
            RETURN n
            ORDER BY n.created_at DESC
            """

            result = await self.db.execute_query(query, {"session_id": session_id})

            leaf_nodes = []
            for record in result:
                node_data = dict(record["n"])
                leaf_nodes.append(self._node_from_dict(node_data))

            return leaf_nodes

        except Exception as e:
            logger.error(f"리프 노드 조회 실패: {e}")
            return []

    async def calculate_total_tokens(self, node_id: str) -> int:
        """노드와 그 조상들의 총 토큰 수 계산

        Args:
            node_id: 노드 ID

        Returns:
            총 토큰 수
        """
        try:
            query = """
            MATCH path = (n:Node {id: $id})<-[:HAS_CHILD*0..]-(ancestor:Node)
            WITH n, ancestor
            RETURN SUM(n.token_count) + SUM(ancestor.token_count) as total_tokens
            """

            result = await self.db.execute_query(query, {"id": node_id})

            if result and len(result) > 0:
                return result[0].get("total_tokens", 0) or 0

            return 0

        except Exception as e:
            logger.error(f"토큰 수 계산 실패: {e}")
            return 0

    async def get_node_relations(self, node_id: str) -> NodeRelations:
        """노드의 모든 관계 정보 가져오기

        Args:
            node_id: 노드 ID

        Returns:
            노드 관계 정보
        """
        try:
            # 현재 노드
            current = await self.get_node(node_id)
            if not current:
                return NodeRelations(
                    current=None, ancestors=[], descendants=[], siblings=[], path=[]
                )

            # 조상 노드들
            ancestors = await self.get_node_ancestors(node_id)

            # 하위 노드들
            descendants = await self.get_node_descendants(node_id)

            # 형제 노드들 (같은 부모를 가진 노드들)
            siblings = []
            if current.parent_id:
                query = """
                MATCH (parent:Node {id: $parent_id})-[:HAS_CHILD]->(sibling:Node)
                WHERE sibling.id <> $node_id
                RETURN sibling
                ORDER BY sibling.created_at ASC
                """
                result = await self.db.execute_query(
                    query, {"parent_id": current.parent_id, "node_id": node_id}
                )

                for record in result:
                    sibling_data = dict(record["sibling"])
                    siblings.append(self._node_from_dict(sibling_data))

            # 경로
            path = await self.get_node_path(node_id)

            return NodeRelations(
                current=current,
                ancestors=ancestors,
                descendants=descendants,
                siblings=siblings,
                path=path,
            )

        except Exception as e:
            logger.error(f"노드 관계 조회 실패: {e}")
            return NodeRelations(current=None, ancestors=[], descendants=[], siblings=[], path=[])

    async def _generate_parent_summary_if_needed(self, parent_id: str) -> None:
        """부모 노드가 될 때 자동으로 요약 생성"""
        try:
            # 부모 노드 조회
            parent_node = await self.get_node(parent_id)
            if not parent_node:
                return

            # 이미 요약이 있으면 건너뛰기
            if parent_node.summary_content:
                return

            # 메시지 서비스를 통해 노드의 메시지 가져오기
            from backend.services.message_service import MessageService

            message_service = MessageService(self.db)
            messages = await message_service.get_messages_by_node(parent_id)

            if len(messages) < 2:  # 메시지가 너무 적으면 요약 불필요
                return

            # 컨테이너에서 브랜칭 서비스 가져오기
            if not self.branching_service:
                from backend.core.container import get_container

                container = get_container()
                self.branching_service = container.branching_service()

            # 요약 생성
            summary_text = await self.branching_service.summarize_messages(messages)

            # 부모 노드에 요약 저장
            update_query = """
            MATCH (n:Node {id: $id})
            SET n.summary_content = $summary_content,
                n.updated_at = $updated_at
            RETURN n
            """

            await self.db.execute_query(
                update_query,
                {
                    "id": parent_id,
                    "summary_content": summary_text,
                    "updated_at": datetime.now(UTC).isoformat(),
                },
            )

            logger.info(f"부모 노드 {parent_id}에 요약 생성 완료")

        except Exception as e:
            logger.error(f"부모 노드 요약 생성 실패: {e}")
            # 요약 생성 실패는 치명적이지 않으므로 에러를 전파하지 않음
