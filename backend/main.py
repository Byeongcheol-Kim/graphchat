"""
FastAPI 애플리케이션 메인 엔트리포인트
"""
from contextlib import asynccontextmanager
import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.core.container import get_container, get_settings
from backend.api.endpoints import sessions, nodes, messages, websocket
# MVP에서 벡터 검색 제외
# from backend.api.endpoints import vector_search
from backend.utils.logger import setup_logging

# 환경 설정
container = get_container()
settings = get_settings()

# 로깅 설정 - 필요한 설정을 개별적으로 전달
setup_logging(
    log_level=settings.log_level,
    log_format=getattr(settings, 'log_format', 'json'),
    debug=settings.debug
)
logger = logging.getLogger(__name__)

# Pydantic 모델 rebuild를 위한 import
import backend.schemas  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    """애플리케이션 생명주기 관리"""
    # 데이터베이스 연결
    db_manager = container.db_manager()
    await db_manager.connect()
    
    # 컨테이너 와이어링
    container.wire(modules=[
        "backend.api.endpoints.sessions",
        "backend.api.endpoints.nodes",
        "backend.api.endpoints.messages",
        "backend.api.endpoints.websocket",
        "backend.api.endpoints.recommendations",
        "backend.core.dependencies",
    ])
    
    yield
    
    # 종료 시
    logger.info("애플리케이션 종료...")
    await db_manager.disconnect()


def create_app() -> FastAPI:
    """FastAPI 애플리케이션 생성"""
    app = FastAPI(
        title="Branching AI API",
        description="지능적인 주제 분기와 컨텍스트 관리를 통한 AI 대화 향상 시스템",
        version="0.1.0",
        lifespan=lifespan,
        debug=settings.debug,
    )
    
    # CORS 미들웨어 설정
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # 라우터 등록 (prefix 없이 - 각 엔드포인트에 전체 경로 명시)
    app.include_router(sessions.router, tags=["sessions"])
    app.include_router(nodes.router, tags=["nodes"])
    app.include_router(messages.router, tags=["messages"])
    app.include_router(websocket.router, tags=["websocket"])
    
    # 브랜치 추천 라우터 추가
    from backend.api.endpoints import recommendations
    app.include_router(recommendations.router, tags=["recommendations"])
    
    # 벡터 검색 라우터 추가 (MVP에서는 비활성화)
    # app.include_router(vector_search.router, tags=["vector-search"])
    
    # 헬스 체크 엔드포인트
    @app.get("/health")
    async def health_check():
        """헬스 체크"""
        return {"status": "healthy", "version": "0.1.0"}
    
    # 루트 엔드포인트
    @app.get("/")
    async def root():
        """루트 엔드포인트"""
        return {
            "name": "Branching AI API",
            "version": "0.1.0",
            "docs": "/docs",
            "health": "/health"
        }
    
    # 글로벌 예외 핸들러
    @app.exception_handler(Exception)
    async def global_exception_handler(request, exc):
        """글로벌 예외 처리"""
        logger.error(f"처리되지 않은 예외: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "내부 서버 오류가 발생했습니다."}
        )
    
    return app


# 애플리케이션 인스턴스
app = create_app()


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "backend.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
