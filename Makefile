# Branching AI Makefile

.PHONY: help install dev test format lint clean run

help:
	@echo "사용 가능한 명령어:"
	@echo "  make install    - 의존성 설치"
	@echo "  make dev        - 개발 서버 실행"
	@echo "  make test       - 테스트 실행"
	@echo "  make test-unit  - 단위 테스트만 실행"
	@echo "  make test-cov   - 커버리지 포함 테스트"
	@echo "  make format     - 코드 포맷팅"
	@echo "  make lint       - 코드 린팅"
	@echo "  make clean      - 캐시 파일 정리"

install:
	@echo "의존성 설치..."
	uv sync

dev:
	@echo "개발 서버 실행..."
	python -m uvicorn backend.main:app --reload --port 8000

test:
	@echo "테스트 실행..."
	python -m pytest backend/tests/ -v

test-unit:
	@echo "단위 테스트 실행..."
	python -m pytest backend/tests/ -v -m unit

test-integration:
	@echo "통합 테스트 실행..."
	python -m pytest backend/tests/ -v -m integration

test-cov:
	@echo "커버리지 포함 테스트 실행..."
	python -m pytest backend/tests/ --cov=backend --cov-report=term-missing

test-watch:
	@echo "테스트 감시 모드..."
	python -m pytest backend/tests/ -v --watch

format:
	@echo "코드 포맷팅..."
	ruff format backend/
	ruff format backend/tests/

lint:
	@echo "코드 린팅..."
	ruff check backend/
	ruff check backend/tests/
	mypy backend/

clean:
	@echo "캐시 파일 정리..."
	find . -type d -name "__pycache__" -exec rm -r {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type d -name ".pytest_cache" -exec rm -r {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -r {} + 2>/dev/null || true
	find . -type d -name "htmlcov" -exec rm -r {} + 2>/dev/null || true
	find . -type f -name ".coverage" -delete

run:
	@echo "프로덕션 서버 실행..."
	python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000