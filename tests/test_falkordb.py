"""
FalkorDB 쿼리 테스트
"""
import pytest
from falkordb import FalkorDB
import json
from datetime import datetime
import uuid


@pytest.fixture
def falkor_client():
    """FalkorDB 클라이언트 fixture"""
    client = FalkorDB(host="localhost", port=6382)
    graph = client.select_graph("test_graph")
    
    # 테스트 전 그래프 초기화
    try:
        graph.delete()
    except:
        pass
    
    yield graph
    
    # 테스트 후 정리
    try:
        graph.delete()
    except:
        pass


def test_basic_node_creation(falkor_client):
    """기본 노드 생성 테스트"""
    # 단순 노드 생성
    result = falkor_client.query("CREATE (n:TestNode {name: 'test', value: 123}) RETURN n")
    
    print(f"\n결과 타입: {type(result)}")
    print(f"result_set 타입: {type(result.result_set)}")
    print(f"result_set 길이: {len(result.result_set)}")
    
    assert len(result.result_set) == 1
    
    # 첫 번째 레코드 확인
    first_record = result.result_set[0]
    print(f"첫 번째 레코드 타입: {type(first_record)}")
    print(f"첫 번째 레코드 내용: {first_record}")
    
    # 레코드의 첫 번째 요소 (노드) 확인
    if isinstance(first_record, (list, tuple)) and len(first_record) > 0:
        node = first_record[0]
        print(f"노드 타입: {type(node)}")
        print(f"노드 속성들: {dir(node)}")
        
        # properties 접근 시도
        if hasattr(node, 'properties'):
            print(f"node.properties 타입: {type(node.properties)}")
            print(f"node.properties 내용: {node.properties}")
            
            # 다양한 접근 방법 시도
            try:
                # 직접 접근
                if isinstance(node.properties, dict):
                    print(f"속성 (dict): {node.properties}")
                    assert node.properties['name'] == 'test'
                    assert node.properties['value'] == 123
            except Exception as e:
                print(f"dict 접근 실패: {e}")
            
            try:
                # getattr 사용
                name = getattr(node.properties, 'name', None)
                value = getattr(node.properties, 'value', None)
                print(f"getattr - name: {name}, value: {value}")
            except Exception as e:
                print(f"getattr 접근 실패: {e}")


def test_session_with_metadata(falkor_client):
    """메타데이터를 포함한 세션 생성 테스트"""
    session_id = str(uuid.uuid4())
    root_node_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    # 메타데이터를 JSON 문자열로 저장
    metadata = {"theme": "dark", "language": "ko"}
    metadata_str = json.dumps(metadata)
    
    # 세션과 루트 노드 생성
    query = """
    CREATE (s:Session {
        id: $session_id,
        title: $title,
        user_id: $user_id,
        root_node_id: $root_node_id,
        created_at: $created_at,
        updated_at: $updated_at,
        node_count: 1,
        metadata_str: $metadata_str
    })
    CREATE (n:Node {
        id: $root_node_id,
        session_id: $session_id,
        title: 'Root',
        content: '',
        type: 'root',
        created_at: $created_at,
        updated_at: $updated_at,
        metadata_str: '{}'
    })
    CREATE (s)-[:HAS_NODE]->(n)
    CREATE (s)-[:ROOT_NODE]->(n)
    RETURN s, n
    """
    
    params = {
        "session_id": session_id,
        "root_node_id": root_node_id,
        "title": "테스트 세션",
        "user_id": "test_user",
        "created_at": now,
        "updated_at": now,
        "metadata_str": metadata_str
    }
    
    result = falkor_client.query(query, params)
    
    print(f"\n세션 생성 결과:")
    print(f"result_set 길이: {len(result.result_set)}")
    print(f"헤더: {result.header if hasattr(result, 'header') else 'No header'}")
    
    if result.result_set:
        record = result.result_set[0]
        print(f"레코드 타입: {type(record)}")
        print(f"레코드 길이: {len(record) if isinstance(record, (list, tuple)) else 'Not a sequence'}")
        
        # 세션과 노드 확인
        if isinstance(record, (list, tuple)):
            for i, item in enumerate(record):
                print(f"\n아이템 {i}:")
                print(f"  타입: {type(item)}")
                if hasattr(item, 'properties'):
                    print(f"  properties 타입: {type(item.properties)}")
                    print(f"  properties: {item.properties}")
                    
                    # 세션 검증
                    if i == 0:  # 첫 번째는 세션
                        if isinstance(item.properties, dict):
                            assert item.properties.get('id') == session_id
                            assert item.properties.get('title') == "테스트 세션"
                            # metadata_str 파싱
                            stored_metadata = json.loads(item.properties.get('metadata_str', '{}'))
                            assert stored_metadata == metadata


def test_query_existing_session(falkor_client):
    """기존 세션 조회 테스트"""
    # 먼저 세션 생성
    session_id = str(uuid.uuid4())
    
    create_query = """
    CREATE (s:Session {
        id: $id,
        title: 'Query Test Session',
        user_id: 'test_user',
        created_at: $created_at
    })
    RETURN s
    """
    
    falkor_client.query(create_query, {
        "id": session_id,
        "created_at": datetime.utcnow().isoformat()
    })
    
    # 세션 조회
    query_result = falkor_client.query(
        "MATCH (s:Session {id: $id}) RETURN s",
        {"id": session_id}
    )
    
    print(f"\n세션 조회 결과:")
    print(f"result_set 길이: {len(query_result.result_set)}")
    
    if query_result.result_set:
        record = query_result.result_set[0]
        if isinstance(record, (list, tuple)) and len(record) > 0:
            session_node = record[0]
            if hasattr(session_node, 'properties'):
                print(f"조회된 세션 properties: {session_node.properties}")
                if isinstance(session_node.properties, dict):
                    assert session_node.properties['id'] == session_id
                    assert session_node.properties['title'] == 'Query Test Session'


def test_node_relationship(falkor_client):
    """노드 간 관계 테스트"""
    # 부모-자식 노드 생성
    parent_id = str(uuid.uuid4())
    child_id = str(uuid.uuid4())
    
    query = """
    CREATE (p:Node {id: $parent_id, title: 'Parent Node', type: 'branch'})
    CREATE (c:Node {id: $child_id, title: 'Child Node', type: 'leaf'})
    CREATE (p)-[r:HAS_CHILD]->(c)
    RETURN p, r, c
    """
    
    result = falkor_client.query(query, {
        "parent_id": parent_id,
        "child_id": child_id
    })
    
    print(f"\n관계 생성 결과:")
    print(f"result_set 길이: {len(result.result_set)}")
    
    if result.result_set:
        record = result.result_set[0]
        print(f"레코드 길이: {len(record) if isinstance(record, (list, tuple)) else 'Not a sequence'}")
        
        if isinstance(record, (list, tuple)):
            # 부모 노드, 관계, 자식 노드 순서
            for i, item in enumerate(record):
                print(f"\n아이템 {i} ({['부모', '관계', '자식'][i] if i < 3 else '기타'}):")
                print(f"  타입: {type(item)}")
                
                if hasattr(item, 'properties'):
                    print(f"  properties: {item.properties}")
                elif hasattr(item, 'type'):
                    print(f"  관계 타입: {item.type if hasattr(item, 'type') else 'N/A'}")


def test_complex_query_with_aggregation(falkor_client):
    """집계를 포함한 복잡한 쿼리 테스트"""
    # 여러 노드 생성
    for i in range(5):
        falkor_client.query(
            "CREATE (n:TestNode {id: $id, value: $value})",
            {"id": f"node_{i}", "value": i * 10}
        )
    
    # 집계 쿼리
    result = falkor_client.query("""
        MATCH (n:TestNode)
        RETURN count(n) as node_count, avg(n.value) as avg_value
    """)
    
    print(f"\n집계 결과:")
    print(f"result_set: {result.result_set}")
    
    if result.result_set:
        record = result.result_set[0]
        print(f"레코드: {record}")
        
        # 집계 결과는 일반 값으로 반환됨
        if isinstance(record, (list, tuple)):
            if len(record) >= 2:
                node_count = record[0]
                avg_value = record[1]
                print(f"노드 개수: {node_count}")
                print(f"평균 값: {avg_value}")
                assert node_count == 5
                assert avg_value == 20  # (0+10+20+30+40)/5


def test_update_node_properties(falkor_client):
    """노드 속성 업데이트 테스트"""
    node_id = str(uuid.uuid4())
    
    # 노드 생성
    falkor_client.query(
        "CREATE (n:TestNode {id: $id, value: 100, status: 'active'})",
        {"id": node_id}
    )
    
    # 속성 업데이트
    update_result = falkor_client.query("""
        MATCH (n:TestNode {id: $id})
        SET n.value = 200, n.status = 'inactive', n.updated_at = $updated_at
        RETURN n
    """, {
        "id": node_id,
        "updated_at": datetime.utcnow().isoformat()
    })
    
    print(f"\n업데이트 결과:")
    if update_result.result_set:
        record = update_result.result_set[0]
        if isinstance(record, (list, tuple)) and len(record) > 0:
            node = record[0]
            if hasattr(node, 'properties') and isinstance(node.properties, dict):
                print(f"업데이트된 속성: {node.properties}")
                assert node.properties['value'] == 200
                assert node.properties['status'] == 'inactive'
                assert 'updated_at' in node.properties


def test_delete_nodes(falkor_client):
    """노드 삭제 테스트"""
    # 노드 생성
    node_id = str(uuid.uuid4())
    falkor_client.query(
        "CREATE (n:TestNode {id: $id})",
        {"id": node_id}
    )
    
    # 노드 존재 확인
    check_result = falkor_client.query(
        "MATCH (n:TestNode {id: $id}) RETURN count(n) as count",
        {"id": node_id}
    )
    assert check_result.result_set[0][0] == 1
    
    # 노드 삭제
    falkor_client.query(
        "MATCH (n:TestNode {id: $id}) DELETE n",
        {"id": node_id}
    )
    
    # 삭제 확인
    check_result = falkor_client.query(
        "MATCH (n:TestNode {id: $id}) RETURN count(n) as count",
        {"id": node_id}
    )
    assert check_result.result_set[0][0] == 0


if __name__ == "__main__":
    # 직접 실행 시 상세 출력과 함께 테스트
    pytest.main([__file__, "-v", "-s"])