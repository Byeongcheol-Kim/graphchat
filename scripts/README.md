# Scripts 디렉토리

이 디렉토리는 프로젝트의 다양한 유틸리티 스크립트들을 포함합니다.

## 테스트 스크립트

### test_llm_branching.py
LLM 연동 및 자동 분기 기능을 테스트하는 통합 테스트 스크립트

```bash
python scripts/test_llm_branching.py
```

### test_app.py
백엔드 API 엔드포인트 기본 테스트

```bash
python scripts/test_app.py
```

### check_falkordb.py
FalkorDB 연결 상태 확인

```bash
python scripts/check_falkordb.py
```

## 실행 스크립트

### run_backend.py
백엔드 서버 실행 스크립트

```bash
python scripts/run_backend.py
```

### run_tests.sh
전체 테스트 실행 스크립트

```bash
bash scripts/run_tests.sh
```

## 사용 방법

모든 스크립트는 프로젝트 루트 디렉토리에서 실행해야 합니다:

```bash
cd /path/to/graphchat
python scripts/<script_name>.py
```