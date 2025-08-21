"""
utils/logger.py 테스트
"""

import logging

from backend.utils.logger import JSONFormatter, setup_logging


class TestLogger:
    """로거 유틸리티 테스트"""

    def test_setup_logging_default(self):
        """기본 로깅 설정 테스트"""
        setup_logging()

        root_logger = logging.getLogger()
        assert root_logger.level == logging.INFO
        assert len(root_logger.handlers) > 0

        # 핸들러 확인
        handler = root_logger.handlers[0]
        assert isinstance(handler, logging.StreamHandler)
        assert handler.level == logging.INFO

    def test_setup_logging_debug(self):
        """디버그 모드 로깅 설정 테스트"""
        setup_logging(log_level="DEBUG", debug=True)

        root_logger = logging.getLogger()
        assert root_logger.level == logging.DEBUG

    def test_get_logger(self):
        """로거 인스턴스 생성 테스트"""
        # Python의 기본 logging.getLogger 사용
        logger = logging.getLogger("test_module")

        assert isinstance(logger, logging.Logger)
        assert logger.name == "test_module"

    def test_get_logger_singleton(self):
        """동일 이름 로거는 싱글톤인지 테스트"""
        logger1 = logging.getLogger("same_name")
        logger2 = logging.getLogger("same_name")

        assert logger1 is logger2

    def test_logger_formatting(self):
        """로그 포맷팅 테스트"""
        setup_logging(log_format="text")

        root_logger = logging.getLogger()
        handler = root_logger.handlers[0]
        formatter = handler.formatter

        # 텍스트 포매터 확인
        assert formatter is not None
        if hasattr(formatter, "_fmt"):
            format_str = formatter._fmt
            assert "%(asctime)s" in format_str
            assert "%(levelname)s" in format_str
            assert "%(message)s" in format_str

    def test_logger_with_json_format(self):
        """JSON 포맷 로깅 설정 테스트"""
        setup_logging(log_format="json")

        root_logger = logging.getLogger()
        handler = root_logger.handlers[0]
        formatter = handler.formatter

        # JSON 포매터 확인
        assert isinstance(formatter, JSONFormatter)

    def test_logger_levels(self):
        """다양한 로그 레벨 테스트"""
        levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]

        for level in levels:
            setup_logging(log_level=level)

            root_logger = logging.getLogger()
            expected_level = getattr(logging, level)
            assert root_logger.level == expected_level
