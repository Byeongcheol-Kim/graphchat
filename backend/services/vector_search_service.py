"""벡터 검색 서비스"""
import logging
import time
from typing import List, Optional
from backend.services.vector_embedding_service import VectorEmbeddingService
from backend.db.falkordb import FalkorDBManager
from backend.schemas.vector_search import (
    VectorSearchRequest,
    VectorSearchResponse,
    VectorSearchResult
)

logger = logging.getLogger(__name__)


class VectorSearchService:
    """벡터 검색 서비스"""
    
    def __init__(self, db_manager: FalkorDBManager, embedding_service: VectorEmbeddingService):
        self.db = db_manager
        self.embedding_service = embedding_service
    
    async def search(self, request: VectorSearchRequest) -> VectorSearchResponse:
        """벡터 유사도 검색 수행
        
        Args:
            request: 검색 요청
            
        Returns:
            검색 결과
        """
        start_time = time.time()
        
        try:
            # 쿼리를 벡터로 변환
            query_embedding = await self.embedding_service.create_embedding(request.query)
            
            if not query_embedding:
                logger.warning(f"쿼리 임베딩 생성 실패: {request.query}")
                return VectorSearchResponse(
                    query=request.query,
                    results=[],
                    total_results=0,
                    search_time_ms=0
                )
            
            # FalkorDB에서 벡터 검색 수행
            raw_results = await self.db.vector_search(
                query_embedding=query_embedding,
                session_id=request.session_id,
                limit=request.limit,
                threshold=request.threshold
            )
            
            # 결과를 스키마로 변환
            results = []
            for item in raw_results:
                result = VectorSearchResult(
                    node_id=item["node_id"],
                    content=item["content"],
                    similarity=item["similarity"],
                    node_type=item["node_type"],
                    title=item.get("title"),
                    parent_id=item.get("parent_id"),
                    depth=item["depth"],
                    token_count=item.get("token_count")
                )
                results.append(result)
            
            # 검색 시간 계산
            search_time_ms = (time.time() - start_time) * 1000
            
            return VectorSearchResponse(
                query=request.query,
                results=results,
                total_results=len(results),
                search_time_ms=search_time_ms
            )
            
        except Exception as e:
            logger.error(f"벡터 검색 실패: {e}")
            return VectorSearchResponse(
                query=request.query,
                results=[],
                total_results=0,
                search_time_ms=(time.time() - start_time) * 1000
            )
    
    async def store_message_embedding(self, message_id: str, content: str) -> bool:
        """메시지의 벡터 임베딩을 생성하고 저장
        
        Args:
            message_id: 메시지 ID
            content: 메시지 내용
            
        Returns:
            저장 성공 여부
        """
        try:
            # 임베딩 생성
            embedding = await self.embedding_service.create_embedding(content)
            
            if not embedding:
                logger.warning(f"메시지 임베딩 생성 실패: {message_id}")
                return False
            
            # FalkorDB에 저장
            success = await self.db.store_embedding(message_id, embedding)
            
            if success:
                logger.debug(f"메시지 임베딩 저장 완료: {message_id}")
            else:
                logger.warning(f"메시지 임베딩 저장 실패: {message_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"메시지 임베딩 저장 중 오류: {e}")
            return False
    
    async def batch_store_embeddings(self, messages: List[tuple[str, str]]) -> int:
        """여러 메시지의 임베딩을 일괄 생성 및 저장
        
        Args:
            messages: (message_id, content) 튜플 리스트
            
        Returns:
            성공적으로 저장된 임베딩 수
        """
        try:
            # 내용만 추출
            contents = [content for _, content in messages]
            
            # 일괄 임베딩 생성
            embeddings = await self.embedding_service.create_embeddings_batch(contents)
            
            # 저장
            success_count = 0
            for (message_id, _), embedding in zip(messages, embeddings):
                if embedding:
                    success = await self.db.store_embedding(message_id, embedding)
                    if success:
                        success_count += 1
            
            logger.info(f"{success_count}/{len(messages)}개 메시지 임베딩 저장 완료")
            return success_count
            
        except Exception as e:
            logger.error(f"일괄 임베딩 저장 실패: {e}")
            return 0