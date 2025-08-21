#!/usr/bin/env python3
"""
LLM 연동 및 자동 분기 테스트 스크립트
"""
import asyncio
import httpx
import json
from typing import Dict, Any

# API 베이스 URL
BASE_URL = "http://localhost:8000"


async def create_session() -> str:
    """새 세션 생성"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/api/v1/sessions",
            json={"title": "LLM 자동 분기 테스트"}
        )
        
        if response.status_code == 201:
            session = response.json()
            print(f"✅ 세션 생성됨: {session['id']}")
            return session["id"]
        else:
            print(f"❌ 세션 생성 실패: {response.text}")
            raise Exception("세션 생성 실패")


async def get_root_node(session_id: str) -> str:
    """세션의 루트 노드 가져오기"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/api/v1/sessions/{session_id}"
        )
        
        if response.status_code == 200:
            session = response.json()
            root_node_id = session.get('root_node_id')
            if root_node_id:
                print(f"✅ 루트 노드 확인: {root_node_id}")
                return root_node_id
            else:
                print(f"❌ 루트 노드를 찾을 수 없음")
                raise Exception("루트 노드를 찾을 수 없음")
        else:
            print(f"❌ 세션 조회 실패: {response.text}")
            raise Exception("세션 조회 실패")


async def send_chat_message(
    session_id: str,
    node_id: str,
    message: str,
    auto_branch: bool = True
) -> Dict[str, Any]:
    """채팅 메시지 전송 및 자동 분기 처리"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        print(f"\n📤 메시지 전송: {message}")
        print(f"   자동 분기: {'활성화' if auto_branch else '비활성화'}")
        
        response = await client.post(
            f"{BASE_URL}/api/v1/messages/chat",
            json={
                "session_id": session_id,
                "node_id": node_id,
                "message": message,
                "auto_branch": auto_branch
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            
            # AI 응답 출력
            print(f"\n🤖 AI 응답:")
            print(f"   {result.get('response', 'No response')[:200]}...")
            
            # 브랜치 정보 출력
            if result.get("branched"):
                print(f"\n🌿 자동 분기 생성됨!")
                new_node_ids = result.get("new_nodes", [])
                print(f"   생성된 노드 ID: {new_node_ids}")
                
                # 각 노드의 상세 정보 조회
                for node_id in new_node_ids:
                    node_info = await get_node_info(node_id)
                    if node_info:
                        print(f"   - {node_info.get('title', 'Unknown')}")
                        metadata = node_info.get('metadata', {})
                        print(f"     타입: {metadata.get('branch_type', 'unknown')}")
                        print(f"     우선순위: {metadata.get('priority', 0):.2f}")
            
            # 브랜치 분석 정보 출력
            if result.get("branch_analysis"):
                analysis = result["branch_analysis"]
                print(f"\n📊 브랜치 분석:")
                print(f"   복잡도 점수: {analysis.get('complexity_score', 0):.2f}")
                print(f"   분기 필요: {analysis.get('should_branch', False)}")
                print(f"   이유: {analysis.get('reasoning', 'N/A')}")
                
                # 브랜치 유형별 분석
                branch_types = analysis.get("branch_analysis", {})
                if branch_types:
                    print(f"\n   감지된 주제들:")
                    for btype, items in branch_types.items():
                        if items:
                            print(f"   - {btype}: {', '.join(items)}")
            
            # 토큰 사용량
            if result.get("token_usage"):
                usage = result["token_usage"]
                print(f"\n📈 토큰 사용:")
                print(f"   입력: {usage.get('prompt_tokens', 0)}")
                print(f"   출력: {usage.get('completion_tokens', 0)}")
                print(f"   총계: {usage.get('total_tokens', 0)}")
            
            return result
        else:
            print(f"❌ 채팅 실패: {response.text}")
            raise Exception("채팅 실패")


async def get_node_info(node_id: str) -> Dict[str, Any]:
    """노드 정보 조회"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/api/v1/nodes/{node_id}"
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ 노드 조회 실패: {response.text}")
            return {}


async def get_node_tree(node_id: str) -> Dict[str, Any]:
    """노드 트리 조회"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/api/v1/nodes/tree/{node_id}",
            params={"depth": 3}
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ 트리 조회 실패: {response.text}")
            return {}


async def main():
    """메인 테스트 함수"""
    print("=" * 60)
    print("🚀 LLM 연동 및 자동 분기 테스트 시작")
    print("=" * 60)
    
    try:
        # 1. 세션 생성
        session_id = await create_session()
        
        # 2. 루트 노드 가져오기
        node_id = await get_root_node(session_id)
        
        # 3. 첫 번째 대화 - 복잡한 질문으로 자동 분기 유도
        print("\n" + "=" * 60)
        print("📝 테스트 1: 복잡한 기술 질문")
        print("=" * 60)
        
        result1 = await send_chat_message(
            session_id,
            node_id,
            "우리 회사 e-commerce 플랫폼을 마이크로서비스로 전환하려는데, "
            "도메인 분리 전략, API 게이트웨이 패턴, 데이터베이스 분리, "
            "그리고 서비스 간 통신 방식에 대해 설명해주세요.",
            auto_branch=True
        )
        
        # 4. 브랜치가 생성되었다면 첫 번째 브랜치에서 대화 계속
        if result1.get("new_nodes") and len(result1.get("new_nodes")) > 0:
            branch_id = result1["new_nodes"][0]
            branch_info = await get_node_info(branch_id)
            
            print("\n" + "=" * 60)
            print(f"📝 테스트 2: 브랜치 '{branch_info.get('title', 'Unknown')}'에서 대화 계속")
            print("=" * 60)
            
            await send_chat_message(
                session_id,
                branch_id,
                "이 주제에 대해 더 자세히 설명해주세요. 실제 구현 예시도 포함해주세요.",
                auto_branch=False  # 이번엔 자동 분기 비활성화
            )
        
        # 5. 간단한 질문으로 분기가 생성되지 않는지 테스트
        print("\n" + "=" * 60)
        print("📝 테스트 3: 간단한 질문 (분기 생성 안 됨)")
        print("=" * 60)
        
        result3 = await send_chat_message(
            session_id,
            node_id,
            "감사합니다. 이해했습니다.",
            auto_branch=True
        )
        
        # 6. 노드 트리 구조 확인
        print("\n" + "=" * 60)
        print("🌳 최종 노드 트리 구조")
        print("=" * 60)
        
        tree = await get_node_tree(node_id)
        if tree:
            print(json.dumps(tree, indent=2, ensure_ascii=False)[:500] + "...")
        
        print("\n" + "=" * 60)
        print("✅ 테스트 완료!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ 테스트 실패: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())