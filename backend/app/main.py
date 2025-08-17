from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import socketio

from app.config import settings
from app.api.v1 import branches, conversations, graphs, websocket
from app.infrastructure.database.connection import init_db, close_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작 시
    await init_db()
    print(f"🚀 {settings.app_name} v{settings.app_version} 시작")
    yield
    # 종료 시
    await close_db()
    print("👋 애플리케이션 종료")


# FastAPI 앱 생성
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Socket.IO 서버 설정
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.cors_origins,
    logger=settings.debug,
    engineio_logger=settings.debug,
)

# Socket.IO를 FastAPI에 마운트
socket_app = socketio.ASGIApp(
    sio,
    app,
    socketio_path="/ws/socket.io"
)

# API 라우터 등록
app.include_router(
    branches.router,
    prefix=f"{settings.api_v1_prefix}/branches",
    tags=["branches"]
)

app.include_router(
    conversations.router,
    prefix=f"{settings.api_v1_prefix}/conversations",
    tags=["conversations"]
)

app.include_router(
    graphs.router,
    prefix=f"{settings.api_v1_prefix}/graphs",
    tags=["graphs"]
)

# WebSocket 핸들러 등록
websocket.register_handlers(sio)


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:socket_app",
        host="0.0.0.0",
        port=settings.api_port,
        reload=settings.debug,
    )