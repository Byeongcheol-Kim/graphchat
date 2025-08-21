#!/usr/bin/env python
"""
백엔드 서버 실행 스크립트
"""
import sys
import os

# backend 디렉토리를 Python 경로에 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        app_dir="backend"
    )