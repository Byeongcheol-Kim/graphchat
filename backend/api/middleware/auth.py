"""
인증 미들웨어
"""
from typing import Optional
from fastapi import HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging

from backend.core.auth import verify_token

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


class AuthMiddleware:
    """JWT 인증 미들웨어"""
    
    @staticmethod
    async def verify_token(credentials: Optional[HTTPAuthorizationCredentials]) -> Optional[Dict[str, Any]]:
        """토큰 검증"""
        if not credentials:
            return None
            
        token = credentials.credentials
        payload = verify_token(token)
        
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="유효하지 않은 인증 토큰입니다",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        return payload
    
    @staticmethod
    async def get_current_user(
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ) -> Optional[Dict[str, Any]]:
        """현재 사용자 정보 가져오기"""
        if not credentials:
            return None
        
        return await AuthMiddleware.verify_token(credentials)
    
    @staticmethod
    async def require_auth(
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ) -> Dict[str, Any]:
        """인증 필수 엔드포인트용"""
        user = await AuthMiddleware.get_current_user(credentials)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="인증이 필요합니다",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        return user


from fastapi import Depends
from typing import Dict, Any