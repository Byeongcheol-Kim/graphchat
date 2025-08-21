"""
메시지 관리 서비스
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import logging

from backend.schemas.message import MessageCreate, Message
from backend.schemas.service_responses import ConversationHistory, NodeStatistics
from backend.db.falkordb import FalkorDBManager

logger = logging.getLogger(__name__)


class MessageService:
    """메시지 관련 비즈니스 로직"""
    
    def __init__(self, db: FalkorDBManager) -> None:
        self.db = db
        self._vector_service = None  # Lazy loading to avoid circular import
        
    async def create_message(self, message_data: MessageCreate) -> Message:
        """새 메시지 생성"""
        message_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        try:
            query = """
            CREATE (m:Message {
                id: $id,
                node_id: $node_id,
                role: $role,
                content: $content,
                timestamp: $timestamp,
                token_count: $token_count,
                embedding: null
            })
            WITH m
            MATCH (n:Node {id: $node_id})
            CREATE (n)-[:HAS_MESSAGE]->(m)
            RETURN m
            """
            
            # 토큰 수 추정 (간단히 단어 수 * 1.5)
            token_count = int(len(message_data.content.split()) * 1.5)
            
            params = {
                "id": message_id,
                "node_id": message_data.node_id,
                "role": message_data.role,
                "content": message_data.content,
                "timestamp": now.isoformat(),
                "token_count": token_count
            }
            
            result = await self.db.execute_query(query, params)
            if result:
                created_message = result[0]["m"]
                
                # 노드의 메시지 카운트와 토큰 카운트 업데이트
                await self._update_node_message_stats(created_message["node_id"])
                
                # 벡터 임베딩 생성 및 저장 (MVP에서는 비활성화)
                # await self._store_message_embedding(created_message["id"], created_message["content"])
                
                # Pydantic 모델로 변환
                return Message(
                    id=created_message["id"],
                    node_id=created_message["node_id"],
                    role=created_message["role"],
                    content=created_message["content"],
                    timestamp=datetime.fromisoformat(created_message["timestamp"])
                )
                
        except Exception as e:
            logger.error(f"메시지 생성 실패: {e}")
            raise
    
    async def get_message(self, message_id: str) -> Optional[Message]:
        """메시지 조회"""
        try:
            query = """
            MATCH (m:Message {id: $id})
            RETURN m
            """
            
            result = await self.db.execute_query(query, {"id": message_id})
            if result:
                message_data = result[0]["m"]
                # Pydantic 모델로 변환
                return Message(
                    id=message_data["id"],
                    node_id=message_data["node_id"],
                    role=message_data["role"],
                    content=message_data["content"],
                    timestamp=datetime.fromisoformat(message_data["timestamp"])
                )
            return None
            
        except Exception as e:
            logger.error(f"메시지 조회 실패: {e}")
            return None
    
    async def get_messages_by_node(self, node_id: str) -> List[Message]:
        """노드의 메시지 목록 조회"""
        return await self.list_messages(node_id=node_id)
    
    async def list_messages(
        self,
        node_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Message]:
        """메시지 목록 조회"""
        try:
            if node_id:
                query = """
                MATCH (n:Node {id: $node_id})-[:HAS_MESSAGE]->(m:Message)
                RETURN m
                ORDER BY m.timestamp
                SKIP $skip
                LIMIT $limit
                """
                params = {"node_id": node_id, "skip": skip, "limit": limit}
            else:
                query = """
                MATCH (m:Message)
                RETURN m
                ORDER BY m.timestamp DESC
                SKIP $skip
                LIMIT $limit
                """
                params = {"skip": skip, "limit": limit}
            
            result = await self.db.execute_query(query, params)
            messages = []
            for r in result:
                message_data = r["m"]
                message = Message(
                    id=message_data["id"],
                    node_id=message_data["node_id"],
                    role=message_data["role"],
                    content=message_data["content"],
                    timestamp=datetime.fromisoformat(message_data["timestamp"])
                )
                messages.append(message)
            return messages
            
        except Exception as e:
            logger.error(f"메시지 목록 조회 실패: {e}")
            return []
    
    async def delete_message(self, message_id: str) -> bool:
        """메시지 삭제"""
        try:
            query = """
            MATCH (m:Message {id: $id})
            DETACH DELETE m
            """
            
            await self.db.execute_write(query, {"id": message_id})
            return True
            
        except Exception as e:
            logger.error(f"메시지 삭제 실패: {e}")
            return False
    
    async def get_conversation_history(
        self,
        node_id: str,
        include_ancestors: bool = True
    ) -> ConversationHistory:
        """대화 기록 조회 - 요약/참조 노드를 고려한 최적화 버전"""
        try:
            # 먼저 노드 타입 확인
            node_check_query = """
            MATCH (n:Node {id: $node_id})
            RETURN n.type as type, 
                   n.is_summary as is_summary,
                   n.is_reference as is_reference,
                   n.source_node_ids as source_node_ids
            """
            node_result = await self.db.execute_query(node_check_query, {"node_id": node_id})
            
            if node_result:
                node_data = node_result[0]
                node_type = node_data.get("type")
                is_reference = node_data.get("is_reference") or node_type == "reference"
                
                # 참조 노드인 경우 특별 처리
                if is_reference:
                    return await self._get_reference_node_history(node_id, node_data.get("source_node_ids"))
            
            messages = []
            is_summarized = False
            
            if include_ancestors:
                # 한 번의 쿼리로 조상 경로와 요약 노드 확인
                path_query = """
                MATCH path = (target:Node {id: $node_id})<-[:HAS_CHILD*0..]-(ancestor:Node)
                RETURN ancestor.id as id, 
                       ancestor.type as type,
                       ancestor.is_summary as is_summary,
                       length(path) as distance
                ORDER BY distance
                """
                
                path_result = await self.db.execute_query(path_query, {"node_id": node_id})
                
                # 요약 노드를 만나면 그 이후 부모는 제외
                node_ids_to_fetch = []
                for node in path_result:
                    node_ids_to_fetch.append(node["id"])
                    # 요약 노드를 만나면 중단 (요약 노드의 부모는 제외)
                    if node.get("is_summary") or node.get("type") == "summary":
                        is_summarized = True
                        break
                
                # 선택된 노드들의 메시지를 한 번에 가져오기
                if node_ids_to_fetch:
                    messages_query = """
                    MATCH (n:Node)-[:HAS_MESSAGE]->(m:Message)
                    WHERE n.id IN $node_ids
                    RETURN m
                    ORDER BY m.timestamp
                    """
                    
                    messages_result = await self.db.execute_query(
                        messages_query, 
                        {"node_ids": node_ids_to_fetch}
                    )
                    
                    for record in messages_result:
                        msg_data = record["m"]
                        messages.append(Message(
                            id=msg_data["id"],
                            node_id=msg_data["node_id"],
                            role=msg_data["role"],
                            content=msg_data["content"],
                            timestamp=datetime.fromisoformat(msg_data["timestamp"])
                        ))
            else:
                messages = await self.list_messages(node_id=node_id)
            
            # 토큰 수 계산
            total_tokens = sum(len(msg.content.split()) * 1.5 for msg in messages)
            
            return ConversationHistory(
                messages=messages,
                total_tokens=int(total_tokens),
                is_summarized=is_summarized
            )
            
        except Exception as e:
            logger.error(f"대화 기록 조회 실패: {e}")
            return ConversationHistory(
                messages=[],
                total_tokens=0,
                is_summarized=False
            )
    
    async def _get_reference_node_history(
        self,
        node_id: str,
        source_node_ids_str: Optional[str] = None
    ) -> ConversationHistory:
        """참조 노드의 대화 기록 조회 - 소스 노드들의 메시지를 시간순으로 정렬"""
        try:
            import json
            
            all_messages = []
            seen_message_ids = set()  # 중복 메시지 방지
            
            # 먼저 현재 참조 노드의 부모 노드들의 대화 기록을 가져옴
            # (부모가 참조 노드인 경우 그 참조 노드의 대화 기록도 포함)
            parent_query = """
            MATCH (current:Node {id: $node_id})<-[:HAS_CHILD]-(parent:Node)
            RETURN parent.id as parent_id, parent.type as parent_type
            """
            parent_result = await self.db.execute_query(parent_query, {"node_id": node_id})
            
            if parent_result:
                parent_id = parent_result[0]["parent_id"]
                parent_type = parent_result[0].get("parent_type")
                
                # 부모 노드의 대화 기록 가져오기 (재귀적으로 처리됨)
                parent_history = await self.get_conversation_history(parent_id, include_ancestors=True)
                for msg in parent_history.messages:
                    if msg.id not in seen_message_ids:
                        all_messages.append(msg)
                        seen_message_ids.add(msg.id)
            
            # source_node_ids 파싱
            source_node_ids = []
            if source_node_ids_str:
                try:
                    source_node_ids = json.loads(source_node_ids_str)
                except:
                    pass
            
            # source_node_ids가 없으면 그래프에서 관계를 통해 찾기
            if not source_node_ids:
                relation_query = """
                MATCH (source:Node)-[:REFERENCED_BY]->(ref:Node {id: $node_id})
                RETURN source.id as source_id
                """
                relation_result = await self.db.execute_query(relation_query, {"node_id": node_id})
                source_node_ids = [r["source_id"] for r in relation_result]
            
            # 소스 노드가 없고 부모 기록도 없으면 현재 노드의 메시지만 반환
            if not source_node_ids and not all_messages:
                return await self._get_node_messages_only(node_id)
            
            # 각 소스 노드의 전체 대화 기록 가져오기 (요약 노드에서 중단)
            for source_id in source_node_ids:
                # 소스 노드와 그 조상들의 경로 가져오기 (요약 노드까지만)
                path_query = """
                MATCH path = (target:Node {id: $node_id})<-[:HAS_CHILD*0..]-(ancestor:Node)
                RETURN ancestor.id as id, 
                       ancestor.type as type,
                       ancestor.is_summary as is_summary,
                       length(path) as distance
                ORDER BY distance
                """
                
                path_result = await self.db.execute_query(path_query, {"node_id": source_id})
                
                # 요약 노드를 만나면 그 이후 부모는 제외
                node_ids_to_fetch = []
                for node in path_result:
                    node_ids_to_fetch.append(node["id"])
                    # 요약 노드를 만나면 중단
                    if node.get("is_summary") or node.get("type") == "summary":
                        break
                
                # 선택된 노드들의 메시지 가져오기
                if node_ids_to_fetch:
                    messages_query = """
                    MATCH (n:Node)-[:HAS_MESSAGE]->(m:Message)
                    WHERE n.id IN $node_ids
                    RETURN m, n.id as node_id
                    """
                    
                    messages_result = await self.db.execute_query(
                        messages_query, 
                        {"node_ids": node_ids_to_fetch}
                    )
                    
                    for record in messages_result:
                        msg_data = record["m"]
                        msg_id = msg_data["id"]
                        if msg_id not in seen_message_ids:
                            all_messages.append(Message(
                                id=msg_id,
                                node_id=record["node_id"],
                                role=msg_data["role"],
                                content=msg_data["content"],
                                timestamp=datetime.fromisoformat(msg_data["timestamp"]),
                                embedding=msg_data.get("embedding")
                            ))
                            seen_message_ids.add(msg_id)
            
            # 참조 노드 자체의 메시지도 추가
            own_messages_query = """
            MATCH (n:Node {id: $node_id})-[:HAS_MESSAGE]->(m:Message)
            RETURN m
            """
            own_messages_result = await self.db.execute_query(own_messages_query, {"node_id": node_id})
            
            for record in own_messages_result:
                msg_data = record["m"]
                msg_id = msg_data["id"]
                if msg_id not in seen_message_ids:
                    all_messages.append(Message(
                        id=msg_id,
                        node_id=node_id,
                        role=msg_data["role"],
                        content=msg_data["content"],
                        timestamp=datetime.fromisoformat(msg_data["timestamp"]),
                        embedding=msg_data.get("embedding")
                    ))
                    seen_message_ids.add(msg_id)
            
            # 모든 메시지를 시간순으로 정렬
            all_messages.sort(key=lambda m: m.timestamp)
            
            # 토큰 수 계산
            total_tokens = sum(len(msg.content.split()) * 1.5 for msg in all_messages)
            
            return ConversationHistory(
                messages=all_messages,
                total_tokens=int(total_tokens),
                is_summarized=False,
                metadata={
                    "is_reference": True,
                    "source_node_ids": source_node_ids,
                    "total_messages": len(all_messages)
                }
            )
            
        except Exception as e:
            logger.error(f"참조 노드 대화 기록 조회 실패: {e}")
            return ConversationHistory(
                messages=[],
                total_tokens=0,
                is_summarized=False
            )
    
    async def _get_node_messages_only(self, node_id: str) -> ConversationHistory:
        """특정 노드의 메시지만 조회"""
        try:
            messages_query = """
            MATCH (n:Node {id: $node_id})-[:HAS_MESSAGE]->(m:Message)
            RETURN m
            ORDER BY m.timestamp
            """
            
            messages_result = await self.db.execute_query(messages_query, {"node_id": node_id})
            
            messages = []
            for record in messages_result:
                msg_data = record["m"]
                messages.append(Message(
                    id=msg_data["id"],
                    node_id=node_id,
                    role=msg_data["role"],
                    content=msg_data["content"],
                    timestamp=datetime.fromisoformat(msg_data["timestamp"]),
                    embedding=msg_data.get("embedding")
                ))
            
            # 토큰 수 계산
            total_tokens = sum(len(msg.content.split()) * 1.5 for msg in messages)
            
            return ConversationHistory(
                messages=messages,
                total_tokens=int(total_tokens),
                is_summarized=False
            )
            
        except Exception as e:
            logger.error(f"노드 메시지 조회 실패: {e}")
            return ConversationHistory(
                messages=[],
                total_tokens=0,
                is_summarized=False
            )
    
    async def update_message_embedding(
        self,
        message_id: str,
        embedding: List[float]
    ) -> bool:
        """메시지 임베딩 업데이트"""
        try:
            query = """
            MATCH (m:Message {id: $id})
            SET m.embedding = $embedding
            RETURN m
            """
            
            result = await self.db.execute_query(
                query,
                {"id": message_id, "embedding": embedding}
            )
            
            return bool(result)
            
        except Exception as e:
            logger.error(f"임베딩 업데이트 실패: {e}")
            return False
    
    async def _store_message_embedding(self, message_id: str, content: str) -> None:
        """메시지 임베딩 생성 및 저장 (백그라운드)"""
        try:
            # VectorSearchService를 lazy import
            if self._vector_service is None:
                from backend.services.vector_embedding_service import VectorEmbeddingService
                from backend.services.vector_search_service import VectorSearchService
                embedding_service = VectorEmbeddingService()
                self._vector_service = VectorSearchService(self.db, embedding_service)
            
            # 임베딩 생성 및 저장 (에러가 발생해도 메시지 생성은 계속됨)
            await self._vector_service.store_message_embedding(message_id, content)
            
        except Exception as e:
            logger.warning(f"메시지 임베딩 생성/저장 실패 (무시됨): {e}")
            # 임베딩 실패는 메시지 생성을 방해하지 않음
    
    async def _update_node_message_stats(self, node_id: str) -> None:
        """노드의 메시지 통계 업데이트"""
        try:
            # 현재 시간을 ISO 형식 문자열로
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc).isoformat()
            
            # 노드의 메시지 카운트와 총 토큰 카운트 계산
            query = """
            MATCH (n:Node {id: $node_id})-[:HAS_MESSAGE]->(m:Message)
            WITH n, COUNT(m) as message_count, SUM(m.token_count) as total_tokens
            SET n.message_count = message_count,
                n.token_count = total_tokens,
                n.updated_at = $updated_at
            RETURN n
            """
            
            await self.db.execute_query(query, {"node_id": node_id, "updated_at": now})
            
            # metadata에도 업데이트 (JSON 문자열로 저장된 경우)
            metadata_query = """
            MATCH (n:Node {id: $node_id})
            WITH n, n.metadata as old_metadata
            SET n.metadata = CASE 
                WHEN old_metadata IS NULL THEN '{"message_count": ' + toString(n.message_count) + '}'
                ELSE old_metadata
            END
            RETURN n
            """
            
            await self.db.execute_query(metadata_query, {"node_id": node_id})
            
        except Exception as e:
            logger.warning(f"노드 메시지 통계 업데이트 실패: {e}")
            # 통계 업데이트 실패는 메시지 생성 실패로 이어지지 않도록 함
