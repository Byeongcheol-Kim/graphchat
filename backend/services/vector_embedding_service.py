"""벡터 임베딩 생성 서비스"""

import logging

import numpy as np
from openai import AsyncOpenAI

from backend.core.config import settings

logger = logging.getLogger(__name__)


class VectorEmbeddingService:
    """벡터 임베딩 생성 서비스"""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "text-embedding-3-small"  # OpenAI의 임베딩 모델
        self.dimension = 1536  # text-embedding-3-small의 차원

    async def create_embedding(self, text: str) -> list[float] | None:
        """텍스트를 벡터 임베딩으로 변환

        Args:
            text: 임베딩할 텍스트

        Returns:
            벡터 임베딩 (리스트 형태) 또는 실패 시 None
        """
        try:
            if not text or not text.strip():
                logger.warning("빈 텍스트는 임베딩할 수 없습니다")
                return None

            response = await self.client.embeddings.create(model=self.model, input=text)

            embedding = response.data[0].embedding
            logger.debug(f"텍스트 임베딩 생성 완료: {len(embedding)}차원")
            return embedding

        except Exception as e:
            logger.error(f"임베딩 생성 실패: {e}")
            return None

    async def create_embeddings_batch(self, texts: list[str]) -> list[list[float] | None]:
        """여러 텍스트를 일괄 임베딩

        Args:
            texts: 임베딩할 텍스트 리스트

        Returns:
            벡터 임베딩 리스트 (실패한 항목은 None)
        """
        try:
            # 빈 텍스트 필터링
            valid_texts = [(i, text) for i, text in enumerate(texts) if text and text.strip()]

            if not valid_texts:
                return [None] * len(texts)

            # OpenAI API 호출
            response = await self.client.embeddings.create(
                model=self.model, input=[text for _, text in valid_texts]
            )

            # 결과 매핑
            embeddings = [None] * len(texts)
            for (original_idx, _), embedding_data in zip(valid_texts, response.data, strict=False):
                embeddings[original_idx] = embedding_data.embedding

            logger.debug(f"{len(valid_texts)}개 텍스트 임베딩 생성 완료")
            return embeddings

        except Exception as e:
            logger.error(f"일괄 임베딩 생성 실패: {e}")
            return [None] * len(texts)

    def calculate_similarity(self, embedding1: list[float], embedding2: list[float]) -> float:
        """두 벡터 간 코사인 유사도 계산

        Args:
            embedding1: 첫 번째 벡터
            embedding2: 두 번째 벡터

        Returns:
            코사인 유사도 (0~1)
        """
        try:
            vec1 = np.array(embedding1)
            vec2 = np.array(embedding2)

            # 코사인 유사도 계산
            cosine_sim = np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

            # 0~1 범위로 정규화
            return float((cosine_sim + 1) / 2)

        except Exception as e:
            logger.error(f"유사도 계산 실패: {e}")
            return 0.0

    def get_embedding_dimension(self) -> int:
        """현재 사용 중인 임베딩 모델의 차원 반환"""
        return self.dimension

    def get_model_name(self) -> str:
        """현재 사용 중인 임베딩 모델명 반환"""
        return self.model
