"""
Settings 및 Container 단위 테스트
"""
import pytest
from backend.core.config import Settings
from backend.core.container import Container, get_settings, get_container, reset_container


class TestSettings:
    """Settings 클래스 테스트"""
    
    def test_default_settings(self):
        """기본 설정 테스트"""
        settings = Settings()
        assert settings.environment == "development"
        assert settings.falkordb_host == "localhost"
        assert settings.falkordb_port == 6382  # 기본 포트 6382
        assert settings.falkordb_graph == "branching_ai"
        assert settings.api_port == 8000
        assert settings.debug is True
        assert settings.log_level == "INFO"
    
    def test_settings_from_env(self, monkeypatch):
        """환경변수로부터 설정 로드 테스트"""
        monkeypatch.setenv("BRANCHING_AI_ENV", "test")
        monkeypatch.setenv("FALKORDB_HOST", "test-host")
        monkeypatch.setenv("FALKORDB_PORT", "1234")
        
        settings = Settings()
        assert settings.environment == "test"
        assert settings.falkordb_host == "test-host"
        assert settings.falkordb_port == 1234


class TestContainer:
    """Container 클래스 테스트"""
    
    def teardown_method(self):
        """각 테스트 후 컨테이너 초기화"""
        reset_container()
    
    def test_container_singleton(self):
        """컨테이너 싱글톤 패턴 테스트"""
        container1 = get_container()
        container2 = get_container()
        assert container1 is container2
    
    def test_settings_singleton(self):
        """Settings 싱글톤 패턴 테스트"""
        settings1 = get_settings()
        settings2 = get_settings()
        assert settings1 is settings2
    
    def test_container_config_provider(self):
        """Container의 config provider 테스트"""
        container = get_container()
        settings = get_settings()
        
        # config provider가 설정을 올바르게 로드했는지 확인
        assert container.config.falkordb_host() == settings.falkordb_host
        assert container.config.falkordb_port() == settings.falkordb_port
        assert container.config.falkordb_graph() == settings.falkordb_graph
    
    def test_container_services(self):
        """Container의 서비스 프로바이더 테스트"""
        container = get_container()
        
        # 서비스들이 제대로 생성되는지 확인
        assert container.db_manager is not None
        assert container.openrouter_service is not None
        assert container.session_service is not None
        assert container.node_service is not None
        assert container.message_service is not None
        assert container.chat_service is not None
        assert container.branching_service is not None
        assert container.websocket_manager is not None
    
    def test_reset_container(self):
        """컨테이너 리셋 테스트"""
        container1 = get_container()
        settings1 = get_settings()
        
        reset_container()
        
        container2 = get_container()
        settings2 = get_settings()
        
        # 리셋 후 새로운 인스턴스가 생성되어야 함
        assert container1 is not container2
        assert settings1 is not settings2