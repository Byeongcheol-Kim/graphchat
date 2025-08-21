"""
FalkorDB 연결 및 관리
"""
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
import asyncio
from falkordb import FalkorDB, Graph
import logging

# get_settings는 connect 메서드에서 동적으로 import

logger = logging.getLogger(__name__)


class FalkorDBManager:
    """FalkorDB 연결 관리자"""
    
    def __init__(self, 
                 host: str = "localhost",
                 port: int = 6432,
                 graph_name: str = "branching_ai"):
        self._client: Optional[FalkorDB] = None
        self._graph: Optional[Graph] = None
        self.host = host
        self.port = port
        self.graph_name = graph_name
        
    async def connect(self):
        """데이터베이스 연결 (필수)"""
        # FalkorDB 클라이언트 생성 시도
        try:
            logger.info(f"FalkorDB 연결 시도: {self.host}:{self.port}")
            logger.info(f"그래프 이름: {self.graph_name}")
            
            self._client = FalkorDB(
                host=self.host,
                port=self.port,
            )
            
            # 그래프 인스턴스 생성
            self._graph = self._client.select_graph(self.graph_name)
            
            # 실제 그래프 명령이 작동하는지 테스트
            logger.info("그래프 연결 테스트 중...")
            self._graph.query("RETURN 1 as test")
            logger.info("그래프 연결 테스트 성공")
            
            # 그래프 스키마 초기화
            await self._initialize_schema()
            
            logger.info("FalkorDB 연결 성공")
            
        except Exception as e:
            error_msg = f"FalkorDB 연결 실패: {e}"
            logger.error(error_msg)
            logger.error("FalkorDB가 필수 요구사항입니다. 다음 명령어로 FalkorDB를 실행하세요:")
            logger.error("docker-compose up -d falkordb")
            logger.error("또는: docker run -p 6432:6379 -it --rm falkordb/falkordb:latest")
            raise RuntimeError(error_msg) from e
    
    async def disconnect(self):
        """데이터베이스 연결 해제"""
        try:
            # FalkorDB 클라이언트는 close 메서드가 없을 수 있음
            if self._client and hasattr(self._client, 'close'):
                self._client.close()
                
            logger.info("FalkorDB 연결 해제")
            
        except Exception as e:
            logger.error(f"FalkorDB 연결 해제 실패: {e}")
    
    async def _initialize_schema(self):
        """그래프 스키마 초기화"""
        try:
            # 인덱스 생성 - 성능 최적화를 위한 모든 주요 필드
            indices = [
                # Session 인덱스
                "CREATE INDEX ON :Session(id)",
                "CREATE INDEX ON :Session(user_id)",
                "CREATE INDEX ON :Session(created_at)",
                
                # Node 인덱스 - 조회 성능 최적화
                "CREATE INDEX ON :Node(id)",
                "CREATE INDEX ON :Node(session_id)",
                "CREATE INDEX ON :Node(parent_id)",
                "CREATE INDEX ON :Node(type)",
                "CREATE INDEX ON :Node(is_summary)",
                "CREATE INDEX ON :Node(is_active)",
                "CREATE INDEX ON :Node(created_at)",
                
                # Message 인덱스 - 메시지 조회 최적화
                "CREATE INDEX ON :Message(id)",
                "CREATE INDEX ON :Message(node_id)",
                "CREATE INDEX ON :Message(timestamp)",
                "CREATE INDEX ON :Message(role)",
                
                # 복합 인덱스 (FalkorDB가 지원하는 경우)
                "CREATE INDEX ON :Node(session_id, type)",
                "CREATE INDEX ON :Node(parent_id, is_summary)",
                "CREATE INDEX ON :Message(node_id, timestamp)",
            ]
            
            # 벡터 인덱스 생성 시도 (MVP에서는 비활성화)
            # try:
            #     vector_index_query = """
            #     CREATE VECTOR INDEX FOR (m:Message) 
            #     ON (m.content_embedding) 
            #     OPTIONS {
            #         dimension: 1536,
            #         similarityFunction: 'cosine'
            #     }
            #     """
            #     self._graph.query(vector_index_query)
            #     logger.info("벡터 인덱스 생성 완료: Message.content_embedding")
            # except Exception as e:
            #     if "already exists" in str(e).lower() or "already indexed" in str(e).lower():
            #         logger.debug("벡터 인덱스가 이미 존재합니다")
            #     else:
            #         logger.warning(f"벡터 인덱스 생성 실패 (선택사항): {e}")
            
            indices = []
            
            created_indices = []
            skipped_indices = []
            
            for index_query in indices:
                try:
                    self._graph.query(index_query)
                    created_indices.append(index_query.split("ON")[1].strip())
                except Exception as e:
                    # 인덱스가 이미 존재하거나 FalkorDB가 명령을 지원하지 않을 수 있음
                    error_msg = str(e).lower()
                    if "already indexed" in error_msg or "index already exists" in error_msg:
                        skipped_indices.append(index_query.split("ON")[1].strip())
                    elif "unknown command" not in error_msg:
                        logger.warning(f"인덱스 생성 경고: {e}")
            
            if created_indices:
                logger.info(f"생성된 인덱스: {', '.join(created_indices)}")
            if skipped_indices:
                logger.debug(f"이미 존재하는 인덱스: {', '.join(skipped_indices)}")
                
            logger.info("그래프 스키마 초기화 완료")
            
        except Exception as e:
            logger.error(f"스키마 초기화 실패: {e}")
            # 스키마 초기화 실패는 치명적이지 않으므로 경고로 처리
            logger.warning("스키마 초기화를 건너뜁니다")
    
    @property
    def graph(self) -> Graph:
        """그래프 인스턴스 반환"""
        if not self._graph:
            raise RuntimeError("FalkorDB가 연결되지 않았습니다")
        return self._graph
    
    
    async def vector_search(self, query_embedding: List[float], session_id: str, limit: int = 5, threshold: float = 0.0) -> List[Dict[str, Any]]:
        """벡터 유사도 검색 수행
        
        Args:
            query_embedding: 검색 쿼리 벡터
            session_id: 세션 ID
            limit: 반환할 최대 결과 수
            threshold: 최소 유사도 임계값
            
        Returns:
            유사도 점수와 함께 정렬된 노드 리스트
        """
        try:
            # FalkorDB의 벡터 검색 쿼리
            # db.idx.vector.queryNodes를 사용하여 유사한 벡터 찾기
            query = """
            CALL db.idx.vector.queryNodes('Message', 'content_embedding', $k, $query_vector) 
            YIELD node, score
            MATCH (n:Node)-[:HAS_MESSAGE]->(node)
            WHERE n.session_id = $session_id AND score >= $threshold
            RETURN n.id as node_id, 
                   node.content as content,
                   score as similarity,
                   n.type as node_type,
                   n.title as title,
                   n.parent_id as parent_id,
                   n.depth as depth,
                   n.token_count as token_count
            ORDER BY score DESC
            LIMIT $limit
            """
            
            params = {
                "query_vector": query_embedding,
                "k": limit * 2,  # 더 많이 가져와서 필터링
                "session_id": session_id,
                "threshold": threshold,
                "limit": limit
            }
            
            results = await self.execute_query(query, params)
            return results
            
        except Exception as e:
            logger.error(f"벡터 검색 실패: {e}")
            # 벡터 인덱스가 없는 경우 대체 방법 시도
            return await self._fallback_vector_search(query_embedding, session_id, limit, threshold)
    
    async def _fallback_vector_search(self, query_embedding: List[float], session_id: str, limit: int = 5, threshold: float = 0.0) -> List[Dict[str, Any]]:
        """벡터 인덱스가 없을 때의 대체 검색 방법"""
        try:
            # 모든 메시지와 임베딩 가져오기
            query = """
            MATCH (n:Node {session_id: $session_id})-[:HAS_MESSAGE]->(m:Message)
            WHERE m.content_embedding IS NOT NULL
            RETURN n.id as node_id,
                   m.content as content,
                   m.content_embedding as embedding,
                   n.type as node_type,
                   n.title as title,
                   n.parent_id as parent_id,
                   n.depth as depth,
                   n.token_count as token_count
            """
            
            results = await self.execute_query(query, {"session_id": session_id})
            
            if not results:
                return []
            
            # 코사인 유사도 계산 (Python에서)
            import numpy as np
            query_vec = np.array(query_embedding)
            
            scored_results = []
            for result in results:
                if result.get("embedding"):
                    doc_vec = np.array(result["embedding"])
                    # 코사인 유사도 계산
                    similarity = np.dot(query_vec, doc_vec) / (np.linalg.norm(query_vec) * np.linalg.norm(doc_vec))
                    # 0~1 범위로 정규화
                    similarity = float((similarity + 1) / 2)
                    
                    if similarity >= threshold:
                        result["similarity"] = similarity
                        del result["embedding"]  # 임베딩 제거
                        scored_results.append(result)
            
            # 유사도 점수로 정렬
            scored_results.sort(key=lambda x: x["similarity"], reverse=True)
            
            return scored_results[:limit]
            
        except Exception as e:
            logger.error(f"대체 벡터 검색 실패: {e}")
            return []
    
    async def store_embedding(self, message_id: str, embedding: List[float]) -> bool:
        """메시지에 벡터 임베딩 저장
        
        Args:
            message_id: 메시지 ID
            embedding: 벡터 임베딩
            
        Returns:
            저장 성공 여부
        """
        try:
            query = """
            MATCH (m:Message {id: $message_id})
            SET m.content_embedding = $embedding
            RETURN m.id as id
            """
            
            result = await self.execute_query(query, {
                "message_id": message_id,
                "embedding": embedding
            })
            
            return len(result) > 0
            
        except Exception as e:
            logger.error(f"임베딩 저장 실패: {e}")
            return False
    
    async def execute_query(self, query: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Cypher 쿼리 실행
        
        FalkorDB 쿼리 결과를 파이썬 딕셔너리 리스트로 변환합니다.
        Node 객체의 properties를 자동으로 추출합니다.
        """
        try:
            result = self._graph.query(query, params or {})
            
            # 결과가 없는 경우
            if not result.result_set:
                return []
            
            # 헤더 파싱 - FalkorDB는 [[1, 's'], [1, 'n']] 형태로 반환
            headers = self._parse_headers(result)
            
            # 결과 처리
            processed_results = []
            for record in result.result_set:
                row_dict = self._parse_record(record, headers)
                if row_dict:
                    processed_results.append(row_dict)
            
            return processed_results
        except Exception as e:
            logger.error(f"쿼리 실행 실패: {e}\n쿼리: {query}")
            raise
    
    def _parse_headers(self, result) -> List[str]:
        """FalkorDB 결과 헤더 파싱"""
        headers = []
        if hasattr(result, 'header') and result.header:
            for header_entry in result.header:
                if isinstance(header_entry, (list, tuple)) and len(header_entry) > 1:
                    # [[1, 's'], [1, 'n']] 형태에서 컬럼명 추출
                    headers.append(header_entry[1])
                elif isinstance(header_entry, str):
                    headers.append(header_entry)
                else:
                    headers.append(f"column_{len(headers)}")
        return headers
    
    def _parse_record(self, record, headers: List[str]) -> Dict[str, Any]:
        """FalkorDB 레코드를 딕셔너리로 변환"""
        import json
        row_dict = {}
        
        if isinstance(record, (list, tuple)):
            for i, value in enumerate(record):
                key = headers[i] if i < len(headers) else f"column_{i}"
                
                # Node 객체는 properties 추출
                if hasattr(value, 'properties'):
                    props = value.properties
                    # metadata 필드가 JSON 문자열인 경우 파싱
                    if isinstance(props, dict) and 'metadata' in props:
                        if isinstance(props['metadata'], str):
                            try:
                                props['metadata'] = json.loads(props['metadata'])
                            except (json.JSONDecodeError, TypeError):
                                props['metadata'] = {}
                    row_dict[key] = props
                else:
                    row_dict[key] = value
        else:
            # 단일 값인 경우
            key = headers[0] if headers else "value"
            row_dict[key] = record
        
        return row_dict
    
    async def execute_write(self, query: str, params: Optional[Dict[str, Any]] = None) -> bool:
        """쓰기 쿼리 실행"""
        try:
            result = self._graph.query(query, params or {})
            return result.nodes_created > 0 or result.relationships_created > 0
        except Exception as e:
            logger.error(f"쓰기 쿼리 실패: {e}\n쿼리: {query}")
            raise


# 전역 데이터베이스 매니저
db_manager = FalkorDBManager()


async def get_db() -> FalkorDBManager:
    """의존성 주입용 데이터베이스 인스턴스 반환"""
    return db_manager


@asynccontextmanager
async def get_db_session():
    """데이터베이스 세션 컨텍스트 매니저"""
    try:
        yield db_manager
    except Exception as e:
        logger.error(f"데이터베이스 세션 오류: {e}")
        raise