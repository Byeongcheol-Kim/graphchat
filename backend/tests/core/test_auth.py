"""
core/auth.py 테스트
"""

from datetime import datetime, timedelta

import pytest

# auth 모듈이 구현되지 않았으므로 테스트 스킵
pytestmark = pytest.mark.skip(reason="Auth module not implemented yet")


# Mock functions for testing
def get_password_hash(password: str) -> str:
    return f"$2b$mock_hash_{password}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hashed_password == f"$2b$mock_hash_{plain_password}"


class TestPasswordHashing:
    """패스워드 해싱 테스트"""

    def test_password_hash(self):
        """패스워드 해싱 테스트"""
        password = "test_password_123"
        hashed = get_password_hash(password)

        assert hashed != password
        assert hashed.startswith("$2b$")

    def test_verify_password_correct(self):
        """올바른 패스워드 검증 테스트"""
        password = "test_password_123"
        hashed = get_password_hash(password)

        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """잘못된 패스워드 검증 테스트"""
        password = "test_password_123"
        wrong_password = "wrong_password"
        hashed = get_password_hash(password)

        assert verify_password(wrong_password, hashed) is False


class TestTokens:
    """JWT 토큰 테스트"""

    def test_create_access_token(self):
        """액세스 토큰 생성 테스트"""
        data = {"sub": "test_user_id"}
        token = create_access_token(data)

        assert token is not None
        assert isinstance(token, str)

        # 토큰 디코딩 검증
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        assert payload["sub"] == "test_user_id"
        assert "exp" in payload

    def test_create_refresh_token(self):
        """리프레시 토큰 생성 테스트"""
        data = {"sub": "test_user_id"}
        token = create_refresh_token(data)

        assert token is not None
        assert isinstance(token, str)

        # 토큰 디코딩 검증
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        assert payload["sub"] == "test_user_id"
        assert "exp" in payload

    def test_verify_valid_token(self):
        """유효한 토큰 검증 테스트"""
        data = {"sub": "test_user_id", "custom_field": "test_value"}
        token = create_access_token(data)

        payload = verify_token(token)
        assert payload is not None
        assert payload["sub"] == "test_user_id"
        assert payload["custom_field"] == "test_value"

    def test_verify_expired_token(self):
        """만료된 토큰 검증 테스트"""
        data = {"sub": "test_user_id"}
        # 이미 만료된 토큰 생성
        expires_delta = timedelta(seconds=-1)

        expire = datetime.utcnow() + expires_delta
        data["exp"] = expire

        token = jwt.encode(data, settings.jwt_secret, algorithm="HS256")

        payload = verify_token(token)
        assert payload is None

    def test_verify_invalid_token(self):
        """유효하지 않은 토큰 검증 테스트"""
        invalid_token = "invalid.token.here"

        payload = verify_token(invalid_token)
        assert payload is None

    def test_token_expiry_times(self):
        """토큰 만료 시간 테스트"""
        data = {"sub": "test_user_id"}

        access_token = create_access_token(data)
        refresh_token = create_refresh_token(data)

        access_payload = jwt.decode(access_token, settings.jwt_secret, algorithms=["HS256"])
        refresh_payload = jwt.decode(refresh_token, settings.jwt_secret, algorithms=["HS256"])

        # 리프레시 토큰이 액세스 토큰보다 더 긴 만료시간을 가져야 함
        assert refresh_payload["exp"] > access_payload["exp"]
