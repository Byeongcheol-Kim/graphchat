"""
세션 관리 서비스
"""

import json
import logging
import uuid
from datetime import UTC, datetime

from backend.db.falkordb import FalkorDBManager
from backend.schemas.node import Node
from backend.schemas.session import Session, SessionCreate, SessionUpdate, SessionWithNodes

logger = logging.getLogger(__name__)


class SessionService:
    """세션 관련 비즈니스 로직"""

    def __init__(self, db: FalkorDBManager) -> None:
        self.db = db

    async def create_session(self, session_data: SessionCreate) -> Session:
        """새 세션 생성 (루트 노드 포함)"""
        session_id = str(uuid.uuid4())
        root_node_id = str(uuid.uuid4())
        now = datetime.now(UTC)

        # metadata를 JSON 문자열로 변환 (FalkorDB는 primitive 타입만 지원)
        metadata_str = json.dumps(session_data.metadata or {})

        # 세션과 루트 노드를 함께 생성
        query = """
        CREATE (s:Session {
            id: $session_id,
            title: $title,
            user_id: $user_id,
            root_node_id: $root_node_id,
            created_at: $created_at,
            updated_at: $updated_at,
            node_count: $node_count,
            metadata_str: $metadata_str
        })
        CREATE (n:Node {
            id: $root_node_id,
            session_id: $session_id,
            title: 'Root',
            content: '',
            type: 'root',
            created_at: $created_at,
            updated_at: $updated_at,
            metadata_str: '{}'
        })
        CREATE (s)-[:HAS_NODE]->(n)
        CREATE (s)-[:ROOT_NODE]->(n)
        RETURN s
        """

        params = {
            "session_id": session_id,
            "root_node_id": root_node_id,
            "title": session_data.title,
            "user_id": session_data.user_id,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "node_count": 1,
            "metadata_str": metadata_str,
        }

        result = await self.db.execute_query(query, params)
        if result and len(result) > 0:
            session_data = result[0]["s"]
            # root_node_id가 결과에 없으면 추가
            if "root_node_id" not in session_data:
                session_data["root_node_id"] = root_node_id
            # metadata_str를 다시 딕셔너리로 변환
            if "metadata_str" in session_data:
                session_data["metadata"] = json.loads(session_data.get("metadata_str", "{}"))
                del session_data["metadata_str"]

            # Pydantic 모델로 변환
            return Session(
                id=session_data["id"],
                title=session_data["title"],
                user_id=session_data.get("user_id"),
                root_node_id=session_data["root_node_id"],
                created_at=datetime.fromisoformat(session_data["created_at"]),
                updated_at=datetime.fromisoformat(session_data["updated_at"]),
                node_count=session_data.get("node_count", 1),
                metadata=session_data.get("metadata", {}),
            )

        raise Exception("세션 생성에 실패했습니다")

    async def get_session(self, session_id: str) -> Session | None:
        """세션 조회"""
        try:
            query = """
            MATCH (s:Session {id: $id})
            RETURN s
            """

            result = await self.db.execute_query(query, {"id": session_id})
            if result and len(result) > 0:
                session_data = result[0]["s"]
                # metadata_str를 다시 딕셔너리로 변환
                if "metadata_str" in session_data:
                    session_data["metadata"] = json.loads(session_data.get("metadata_str", "{}"))
                    del session_data["metadata_str"]

                # Pydantic 모델로 변환
                return Session(
                    id=session_data["id"],
                    title=session_data["title"],
                    user_id=session_data.get("user_id"),
                    root_node_id=session_data.get("root_node_id", ""),
                    created_at=datetime.fromisoformat(session_data["created_at"]),
                    updated_at=datetime.fromisoformat(session_data["updated_at"]),
                    node_count=session_data.get("node_count", 0),
                    metadata=session_data.get("metadata", {}),
                )
            return None

        except Exception as e:
            logger.error(f"세션 조회 실패: {e}")
            return None

    async def list_sessions(
        self, user_id: str | None = None, skip: int = 0, limit: int = 10
    ) -> list[Session]:
        """세션 목록 조회"""
        try:
            if user_id:
                query = """
                MATCH (s:Session {user_id: $user_id})
                RETURN s
                ORDER BY s.updated_at DESC
                SKIP $skip
                LIMIT $limit
                """
                params = {"user_id": user_id, "skip": skip, "limit": limit}
            else:
                query = """
                MATCH (s:Session)
                RETURN s
                ORDER BY s.updated_at DESC
                SKIP $skip
                LIMIT $limit
                """
                params = {"skip": skip, "limit": limit}

            result = await self.db.execute_query(query, params)
            sessions = []
            for r in result:
                session_data = r["s"]
                # metadata_str를 다시 딕셔너리로 변환
                if "metadata_str" in session_data:
                    session_data["metadata"] = json.loads(session_data.get("metadata_str", "{}"))
                    del session_data["metadata_str"]

                # Pydantic 모델로 변환
                session = Session(
                    id=session_data["id"],
                    title=session_data["title"],
                    user_id=session_data.get("user_id"),
                    root_node_id=session_data.get("root_node_id", ""),
                    created_at=datetime.fromisoformat(session_data["created_at"]),
                    updated_at=datetime.fromisoformat(session_data["updated_at"]),
                    node_count=session_data.get("node_count", 0),
                    metadata=session_data.get("metadata", {}),
                )
                sessions.append(session)
            return sessions

        except Exception as e:
            logger.error(f"세션 목록 조회 실패: {e}")
            return []

    async def update_session(
        self, session_id: str, update_data: SessionUpdate
    ) -> Session | None:
        """세션 업데이트"""
        try:
            set_clauses = []
            params = {"id": session_id, "updated_at": datetime.now(UTC).isoformat()}

            if update_data.title is not None:
                set_clauses.append("s.title = $title")
                params["title"] = update_data.title

            if update_data.metadata is not None:
                set_clauses.append("s.metadata_str = $metadata_str")
                params["metadata_str"] = json.dumps(update_data.metadata)

            set_clauses.append("s.updated_at = $updated_at")

            query = f"""
            MATCH (s:Session {{id: $id}})
            SET {", ".join(set_clauses)}
            RETURN s
            """

            result = await self.db.execute_query(query, params)
            if result and len(result) > 0:
                session_data = result[0]["s"]
                # metadata_str를 다시 딕셔너리로 변환
                if "metadata_str" in session_data:
                    session_data["metadata"] = json.loads(session_data.get("metadata_str", "{}"))
                    del session_data["metadata_str"]

                # Pydantic 모델로 변환
                return Session(
                    id=session_data["id"],
                    title=session_data["title"],
                    user_id=session_data.get("user_id"),
                    root_node_id=session_data.get("root_node_id", ""),
                    created_at=datetime.fromisoformat(session_data["created_at"]),
                    updated_at=datetime.fromisoformat(session_data["updated_at"]),
                    node_count=session_data.get("node_count", 0),
                    metadata=session_data.get("metadata", {}),
                )
            return None

        except Exception as e:
            logger.error(f"세션 업데이트 실패: {e}")
            return None

    async def delete_session(self, session_id: str) -> bool:
        """세션 삭제"""
        try:
            # 먼저 세션이 존재하는지 확인
            check_query = """
            MATCH (s:Session {id: $id})
            RETURN s.id as id
            """
            check_result = await self.db.execute_query(check_query, {"id": session_id})

            if not check_result:
                logger.warning(f"삭제할 세션을 찾을 수 없음: {session_id}")
                return False

            # 세션과 관련된 모든 노드, 메시지 삭제
            # FalkorDB는 순차적으로 삭제하는 것이 더 안전할 수 있음

            # 1. 먼저 메시지 삭제
            delete_messages_query = """
            MATCH (s:Session {id: $id})-[:HAS_NODE]->(n:Node)-[:HAS_MESSAGE]->(m:Message)
            DELETE m
            """
            await self.db.execute_query(delete_messages_query, {"id": session_id})

            # 2. 노드 삭제
            delete_nodes_query = """
            MATCH (s:Session {id: $id})-[:HAS_NODE]->(n:Node)
            DETACH DELETE n
            """
            await self.db.execute_query(delete_nodes_query, {"id": session_id})

            # 3. 마지막으로 세션 삭제
            delete_session_query = """
            MATCH (s:Session {id: $id})
            DELETE s
            """
            await self.db.execute_query(delete_session_query, {"id": session_id})

            logger.info(f"세션 삭제 완료: {session_id}")
            return True

        except Exception as e:
            logger.error(f"세션 삭제 실패: {e}")
            import traceback

            logger.error(traceback.format_exc())
            return False

    async def get_session_nodes(self, session_id: str) -> list[Node]:
        """세션의 노드 목록 조회"""
        try:
            # NodeService를 통해 노드 목록 조회
            from backend.services.node_service import NodeService

            node_service = NodeService(self.db)

            # 세션의 모든 노드 ID 조회
            query = """
            MATCH (s:Session {id: $id})-[:HAS_NODE]->(n:Node)
            RETURN n.id as node_id
            ORDER BY n.created_at
            """

            result = await self.db.execute_query(query, {"id": session_id})

            # 각 노드를 NodeService를 통해 Node 객체로 가져오기
            nodes = []
            for r in result:
                node = await node_service.get_node(r["node_id"])
                if node:
                    nodes.append(node)

            return nodes

        except Exception as e:
            logger.error(f"세션 노드 조회 실패: {e}")
            return []

    async def get_session_with_nodes(self, session_id: str) -> SessionWithNodes | None:
        """노드를 포함한 세션 조회"""
        try:
            session = await self.get_session(session_id)
            if not session:
                return None

            # 세션의 모든 노드 조회
            nodes = await self.get_session_nodes(session_id)

            # SessionWithNodes 모델로 변환
            return SessionWithNodes(
                id=session.id,
                title=session.title,
                user_id=session.user_id,
                root_node_id=session.root_node_id,
                created_at=session.created_at,
                updated_at=session.updated_at,
                node_count=session.node_count,
                metadata=session.metadata,
                nodes=nodes,
            )

        except Exception as e:
            logger.error(f"노드 포함 세션 조회 실패: {e}")
            return None
