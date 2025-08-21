#!/usr/bin/env python
"""
FalkorDB 설치 상태 확인 스크립트
"""
import redis
import sys

def check_falkordb():
    """FalkorDB 모듈이 Redis에 로드되었는지 확인"""
    try:
        # Redis 연결
        r = redis.Redis(host='localhost', port=6379, decode_responses=True)
        
        # Redis 연결 테스트
        r.ping()
        print("✓ Redis 연결 성공")
        
        # 로드된 모듈 확인
        try:
            modules = r.execute_command('MODULE', 'LIST')
            print(f"\n로드된 Redis 모듈: {modules}")
            
            # FalkorDB 모듈 확인
            falkordb_loaded = any('graph' in str(m).lower() or 'falkor' in str(m).lower() for m in modules) if modules else False
            
            if falkordb_loaded:
                print("✓ FalkorDB 모듈이 로드되어 있습니다")
            else:
                print("✗ FalkorDB 모듈이 로드되지 않았습니다")
                print("\nFalkorDB 설치 방법:")
                print("1. Docker 사용:")
                print("   docker run -p 6379:6379 -it --rm falkordb/falkordb")
                print("\n2. 또는 docker-compose.yml 사용:")
                print("   docker-compose up falkordb")
                
        except redis.ResponseError as e:
            if "unknown command" in str(e).lower():
                print("✗ Redis가 MODULE 명령을 지원하지 않습니다")
                print("  일반 Redis가 실행 중입니다. FalkorDB Docker 이미지를 사용하세요.")
            else:
                print(f"✗ 모듈 확인 실패: {e}")
                
    except redis.ConnectionError:
        print("✗ Redis에 연결할 수 없습니다")
        print("\nRedis/FalkorDB 시작 방법:")
        print("1. Docker 사용:")
        print("   docker run -p 6379:6379 -it --rm falkordb/falkordb")
        print("\n2. 또는 docker-compose.yml 사용:")
        print("   docker-compose up falkordb")
        
    except Exception as e:
        print(f"✗ 오류 발생: {e}")
        
if __name__ == "__main__":
    check_falkordb()