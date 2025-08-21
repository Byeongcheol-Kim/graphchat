"""
db/falkordb.py 테스트
"""

from unittest.mock import AsyncMock, Mock, patch

import pytest

from backend.db.falkordb import FalkorDBManager, get_db, get_db_session


class TestFalkorDBManager:
    """FalkorDBManager 테스트"""

    @pytest.mark.asyncio
    async def test_connect_success(self):
        """성공적인 데이터베이스 연결 테스트"""
        manager = FalkorDBManager()

        with patch("backend.db.falkordb.FalkorDB") as mock_falkordb:
            mock_client = Mock()
            mock_graph = Mock()
            mock_falkordb.return_value = mock_client
            mock_client.select_graph.return_value = mock_graph

            with patch("backend.db.falkordb.Redis") as mock_redis:
                mock_redis_client = AsyncMock()
                mock_redis.return_value = mock_redis_client

                await manager.connect()

                assert manager._client == mock_client
                assert manager._graph == mock_graph
                mock_client.select_graph.assert_called_once()

    @pytest.mark.asyncio
    async def test_connect_fallback_to_mock(self):
        """FalkorDB 연결 실패 시 모의 모드 전환 테스트"""
        manager = FalkorDBManager()

        with patch("backend.db.falkordb.FalkorDB", side_effect=Exception("Connection failed")):
            with patch("backend.db.falkordb.Redis") as mock_redis:
                mock_redis_client = AsyncMock()
                mock_redis.return_value = mock_redis_client

                await manager.connect()

                assert manager._client is None
                assert manager._graph is None

    @pytest.mark.asyncio
    async def test_disconnect(self):
        """데이터베이스 연결 해제 테스트"""
        manager = FalkorDBManager()
        manager._redis_client = AsyncMock()
        manager._client = Mock()
        manager._client.close = Mock()

        await manager.disconnect()

        manager._redis_client.close.assert_called_once()
        manager._client.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_disconnect_without_close_method(self):
        """close 메서드가 없는 경우 연결 해제 테스트"""
        manager = FalkorDBManager()
        manager._redis_client = AsyncMock()
        manager._client = Mock(spec=[])  # close 메서드 없음

        await manager.disconnect()

        manager._redis_client.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_execute_query(self):
        """쿼리 실행 테스트"""
        manager = FalkorDBManager()
        mock_graph = Mock()
        manager._graph = mock_graph

        mock_result = Mock()
        mock_result.result_set = [{"id": 1, "name": "test"}]
        mock_graph.query.return_value = mock_result

        result = await manager.execute_query("MATCH (n) RETURN n", {"param": "value"})

        assert result == [{"id": 1, "name": "test"}]
        mock_graph.query.assert_called_once_with("MATCH (n) RETURN n", {"param": "value"})

    @pytest.mark.asyncio
    async def test_execute_write(self):
        """쓰기 쿼리 실행 테스트"""
        manager = FalkorDBManager()
        mock_graph = Mock()
        manager._graph = mock_graph

        mock_result = Mock()
        mock_result.nodes_created = 1
        mock_result.relationships_created = 0
        mock_graph.query.return_value = mock_result

        result = await manager.execute_write("CREATE (n:Node)", {"param": "value"})

        assert result is True
        mock_graph.query.assert_called_once_with("CREATE (n:Node)", {"param": "value"})

    def test_graph_property_without_connection(self):
        """연결 없이 graph 프로퍼티 접근 시 에러 테스트"""
        manager = FalkorDBManager()

        with pytest.raises(RuntimeError, match="FalkorDB가 연결되지 않았습니다"):
            _ = manager.graph

    def test_redis_property_without_connection(self):
        """연결 없이 redis 프로퍼티 접근 시 에러 테스트"""
        manager = FalkorDBManager()

        with pytest.raises(RuntimeError, match="Redis가 연결되지 않았습니다"):
            _ = manager.redis


class TestDependencyInjection:
    """의존성 주입 테스트"""

    @pytest.mark.asyncio
    async def test_get_db(self):
        """get_db 함수 테스트"""
        db = await get_db()
        assert isinstance(db, FalkorDBManager)

    @pytest.mark.asyncio
    async def test_get_db_session(self):
        """get_db_session 컨텍스트 매니저 테스트"""
        async with get_db_session() as db:
            assert isinstance(db, FalkorDBManager)
