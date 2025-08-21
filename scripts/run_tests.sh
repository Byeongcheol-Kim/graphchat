#!/bin/bash

# 통합 테스트 실행 스크립트

echo "🔧 환경 준비 중..."

# 기존 서버 프로세스 종료
echo "기존 서버 프로세스 종료..."
pkill -f "python.*backend.main" || true
sleep 1

# FalkorDB 실행 확인
echo "FalkorDB 확인..."
docker-compose up -d falkordb
sleep 2

# 테스트 환경 변수 설정
export FALKORDB_PORT=6382
export API_PORT=8003
export LOG_LEVEL=WARNING

# 통합 테스트 실행
echo "🧪 통합 테스트 실행 중..."
python -m pytest tests/integration/ -v

# 테스트 결과 코드 저장
TEST_RESULT=$?

# 서버 프로세스 정리
echo "정리 중..."
pkill -f "python.*backend.main" || true

# 결과 출력
if [ $TEST_RESULT -eq 0 ]; then
    echo "✅ 모든 테스트 통과!"
else
    echo "❌ 일부 테스트 실패"
fi

exit $TEST_RESULT