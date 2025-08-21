"""
로깅 설정
"""

import json
import logging
import sys
from typing import Any

# settings는 setup_logging 함수 내부에서 import


class JSONFormatter(logging.Formatter):
    """JSON 형식 로그 포매터"""

    def format(self, record: logging.LogRecord) -> str:
        """로그 레코드를 JSON 형식으로 변환"""
        log_obj: dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        if hasattr(record, "extra"):
            log_obj.update(record.extra)

        return json.dumps(log_obj, ensure_ascii=False)


def setup_logging(log_level: str = "INFO", log_format: str = "text", debug: bool = False):
    """로깅 설정 초기화

    Args:
        log_level: 로그 레벨 (INFO, DEBUG, WARNING, ERROR)
        log_format: 로그 포맷 (text, json)
        debug: 디버그 모드 여부
    """
    # 디버그 모드일 때는 DEBUG 레벨로 강제 설정
    if debug:
        log_level = "DEBUG"
        log_level_obj = logging.DEBUG
    else:
        log_level_obj = getattr(logging, log_level.upper(), logging.INFO)

    # 루트 로거 설정
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level_obj)

    # 기존 핸들러 제거
    root_logger.handlers.clear()

    # 콘솔 핸들러 생성
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level_obj)

    # 포매터 설정
    if log_format == "json":
        formatter = JSONFormatter()
    else:
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
        )

    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # 외부 라이브러리 로그 레벨 조정
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("fastapi").setLevel(logging.INFO)

    # 디버그 모드에서만 상세 로그
    if debug:
        # 디버그 모드에서는 서비스 로거도 DEBUG 레벨로 설정
        logging.getLogger("backend.services").setLevel(logging.DEBUG)
        logging.getLogger("backend.services.gemini_service").setLevel(logging.DEBUG)
        logging.getLogger("backend.services.openrouter_service").setLevel(logging.DEBUG)
        logging.getLogger("backend.services.chat_service").setLevel(logging.DEBUG)
        logging.getLogger("httpx").setLevel(logging.INFO)
        logging.getLogger("httpcore").setLevel(logging.INFO)
    else:
        logging.getLogger("httpx").setLevel(logging.WARNING)
        logging.getLogger("httpcore").setLevel(logging.WARNING)
