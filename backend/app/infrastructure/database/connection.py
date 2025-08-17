from typing import Optional
import redis.asyncio as redis
from falkordb import AsyncFalkorDB

from app.config import settings

# 전역 데이터베이스 연결
redis_client: Optional[redis.Redis] = None
falkor_client: Optional[AsyncFalkorDB] = None


async def init_db():
    """
    데이터베이스 초기화
    """
    global redis_client, falkor_client
    
    # Redis 연결
    redis_client = await redis.from_url(
        f"redis://{settings.falkordb_host}:{settings.falkordb_port}",
        encoding="utf-8",
        decode_responses=True
    )
    
    # FalkorDB 연결
    try:
        falkor_client = AsyncFalkorDB(
            host=settings.falkordb_host,
            port=settings.falkordb_port
        )
        print(f"✅ FalkorDB 연결 성공: {settings.falkordb_host}:{settings.falkordb_port}")
    except Exception as e:
        print(f"⚠️ FalkorDB 연결 실패: {e}")
        print("💡 FalkorDB가 설치되어 있지 않습니다. Docker를 사용하여 설치하세요:")
        print("   docker run -d -p 6379:6379 falkordb/falkordb")


async def close_db():
    """
    데이터베이스 연결 종료
    """
    global redis_client, falkor_client
    
    if redis_client:
        await redis_client.close()
    
    if falkor_client:
        # FalkorDB는 별도의 close 메서드가 없음
        pass


def get_redis() -> redis.Redis:
    """
    Redis 클라이언트 반환
    """
    if not redis_client:
        raise RuntimeError("Redis가 초기화되지 않았습니다")
    return redis_client


def get_falkordb() -> AsyncFalkorDB:
    """
    FalkorDB 클라이언트 반환
    """
    if not falkor_client:
        raise RuntimeError("FalkorDB가 초기화되지 않았습니다")
    return falkor_client