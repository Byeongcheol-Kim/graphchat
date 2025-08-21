"""벡터 검색 관련 스키마"""
from typing import List, Optional
from pydantic import BaseModel, Field


class VectorSearchRequest(BaseModel):
    """벡터 검색 요청 스키마"""
    query: str = Field(..., min_length=1, description="검색 쿼리")
    session_id: str = Field(..., description="세션 ID")
    limit: int = Field(default=5, ge=1, le=20, description="반환할 최대 결과 수")
    threshold: float = Field(default=0.0, ge=0.0, le=1.0, description="최소 유사도 임계값")
    
    class Config:
        json_schema_extra = {
            "example": {
                "query": "AI 윤리와 편향성",
                "session_id": "session-123",
                "limit": 5,
                "threshold": 0.3
            }
        }


class VectorSearchResult(BaseModel):
    """벡터 검색 결과 항목"""
    node_id: str = Field(..., description="노드 ID")
    content: str = Field(..., description="메시지 내용")
    similarity: float = Field(..., ge=0.0, le=1.0, description="유사도 점수")
    node_type: str = Field(..., description="노드 타입")
    title: Optional[str] = Field(None, description="노드 제목")
    parent_id: Optional[str] = Field(None, description="부모 노드 ID")
    depth: int = Field(..., description="노드 깊이")
    token_count: Optional[int] = Field(None, description="토큰 수")
    
    class Config:
        json_schema_extra = {
            "example": {
                "node_id": "node-456",
                "content": "AI 시스템의 편향성은 주로 학습 데이터에서 기인합니다...",
                "similarity": 0.85,
                "node_type": "message",
                "title": "AI 편향성 문제",
                "parent_id": "node-123",
                "depth": 2,
                "token_count": 150
            }
        }


class VectorSearchResponse(BaseModel):
    """벡터 검색 응답 스키마"""
    query: str = Field(..., description="원본 검색 쿼리")
    results: List[VectorSearchResult] = Field(..., description="검색 결과 목록")
    total_results: int = Field(..., description="전체 결과 수")
    search_time_ms: Optional[float] = Field(None, description="검색 소요 시간(ms)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "query": "AI 윤리와 편향성",
                "results": [
                    {
                        "node_id": "node-456",
                        "content": "AI 시스템의 편향성은...",
                        "similarity": 0.85,
                        "node_type": "message",
                        "title": "AI 편향성 문제",
                        "parent_id": "node-123",
                        "depth": 2,
                        "token_count": 150
                    }
                ],
                "total_results": 1,
                "search_time_ms": 25.3
            }
        }


class VectorIndexInfo(BaseModel):
    """벡터 인덱스 정보"""
    index_name: str = Field(..., description="인덱스 이름")
    dimension: int = Field(..., description="벡터 차원")
    similarity_function: str = Field(..., description="유사도 함수 (cosine/euclidean)")
    total_vectors: int = Field(..., description="인덱싱된 벡터 수")
    
    class Config:
        json_schema_extra = {
            "example": {
                "index_name": "message_content_vector",
                "dimension": 1536,
                "similarity_function": "cosine",
                "total_vectors": 1234
            }
        }