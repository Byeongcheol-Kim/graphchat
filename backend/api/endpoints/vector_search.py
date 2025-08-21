"""벡터 검색 API 엔드포인트"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from backend.db.falkordb import FalkorDBManager, get_db_session
from backend.schemas.vector_search import VectorIndexInfo, VectorSearchRequest, VectorSearchResponse
from backend.services.vector_embedding_service import VectorEmbeddingService
from backend.services.vector_search_service import VectorSearchService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/vector", tags=["vector-search"])

# 서비스 인스턴스 (싱글톤)
_embedding_service = None
_vector_search_service = None


def get_embedding_service() -> VectorEmbeddingService:
    """임베딩 서비스 인스턴스 반환"""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = VectorEmbeddingService()
    return _embedding_service


def get_vector_search_service(
    db: Annotated[FalkorDBManager, Depends(get_db_session)],
) -> VectorSearchService:
    """벡터 검색 서비스 인스턴스 반환"""
    global _vector_search_service
    if _vector_search_service is None:
        embedding_service = get_embedding_service()
        _vector_search_service = VectorSearchService(db, embedding_service)
    else:
        # DB 인스턴스 업데이트 (요청마다 새로운 DB 세션)
        _vector_search_service.db = db
    return _vector_search_service


@router.post("/search", response_model=VectorSearchResponse)
async def search_similar_nodes(
    request: VectorSearchRequest,
    service: Annotated[VectorSearchService, Depends(get_vector_search_service)],
) -> VectorSearchResponse:
    """벡터 유사도 기반으로 노드 검색

    메시지 content를 기준으로 유사한 노드를 찾아 반환합니다.
    """
    try:
        logger.info(
            f"벡터 검색 요청: query='{request.query[:50]}...', session={request.session_id}"
        )

        result = await service.search(request)

        logger.info(
            f"벡터 검색 완료: {result.total_results}개 결과 (소요시간: {result.search_time_ms:.2f}ms)"
        )

        return result

    except Exception as e:
        logger.error(f"벡터 검색 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"벡터 검색 중 오류가 발생했습니다: {str(e)}",
        )


@router.get("/index/info", response_model=VectorIndexInfo)
async def get_vector_index_info(
    db: Annotated[FalkorDBManager, Depends(get_db_session)],
) -> VectorIndexInfo:
    """벡터 인덱스 정보 조회"""
    try:
        # 벡터 인덱스 정보 쿼리
        query = """
        MATCH (m:Message)
        WHERE m.content_embedding IS NOT NULL
        RETURN count(m) as total_vectors
        """

        result = await db.execute_query(query)
        total_vectors = result[0]["total_vectors"] if result else 0

        embedding_service = get_embedding_service()

        return VectorIndexInfo(
            index_name="message_content_vector",
            dimension=embedding_service.get_embedding_dimension(),
            similarity_function="cosine",
            total_vectors=total_vectors,
        )

    except Exception as e:
        logger.error(f"벡터 인덱스 정보 조회 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"벡터 인덱스 정보 조회 중 오류가 발생했습니다: {str(e)}",
        )


@router.post("/reindex/{session_id}")
async def reindex_session_messages(
    session_id: str,
    db: Annotated[FalkorDBManager, Depends(get_db_session)],
    service: Annotated[VectorSearchService, Depends(get_vector_search_service)],
) -> dict:
    """세션의 모든 메시지 재인덱싱

    기존 임베딩이 없는 메시지들의 벡터 임베딩을 생성하고 저장합니다.
    """
    try:
        logger.info(f"세션 재인덱싱 시작: {session_id}")

        # 임베딩이 없는 메시지 조회
        query = """
        MATCH (n:Node {session_id: $session_id})-[:HAS_MESSAGE]->(m:Message)
        WHERE m.content_embedding IS NULL
        RETURN m.id as message_id, m.content as content
        """

        messages = await db.execute_query(query, {"session_id": session_id})

        if not messages:
            return {
                "session_id": session_id,
                "indexed_count": 0,
                "message": "인덱싱할 메시지가 없습니다",
            }

        # 메시지 튜플 리스트 생성
        message_tuples = [(msg["message_id"], msg["content"]) for msg in messages]

        # 일괄 임베딩 생성 및 저장
        indexed_count = await service.batch_store_embeddings(message_tuples)

        logger.info(f"세션 재인덱싱 완료: {session_id}, {indexed_count}/{len(messages)}개 인덱싱")

        return {
            "session_id": session_id,
            "indexed_count": indexed_count,
            "total_messages": len(messages),
            "message": f"{indexed_count}개 메시지 인덱싱 완료",
        }

    except Exception as e:
        logger.error(f"세션 재인덱싱 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"세션 재인덱싱 중 오류가 발생했습니다: {str(e)}",
        )
