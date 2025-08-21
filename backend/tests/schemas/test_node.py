"""
schemas/node.py 테스트
"""
import pytest
from datetime import datetime
from pydantic import ValidationError
from backend.schemas.node import (
    NodeBase,
    NodeCreate,
    NodeUpdate,
    Node,
    NodeWithMessages,
    NodeTree,
    SummaryRequest,
    NodeType
)
from backend.schemas.message import Message


class TestNodeSchemas:
    """노드 스키마 테스트"""
    
    def test_node_type_enum(self):
        """NodeType 열거형 테스트"""
        assert "user" in NodeType.__args__
        assert "assistant" in NodeType.__args__
        assert "summary" in NodeType.__args__
        assert "system" in NodeType.__args__
        
    def test_node_base_valid(self):
        """유효한 NodeBase 생성 테스트"""
        node = NodeBase(
            title="테스트 노드",
            type="user",
            metadata={"key": "value"}
        )
        
        assert node.title == "테스트 노드"
        assert node.type == "user"
        
    def test_node_base_invalid_type(self):
        """유효하지 않은 타입으로 NodeBase 생성 테스트"""
        with pytest.raises(ValidationError):
            NodeBase(title="테스트", type="invalid_type")
            
    def test_node_create(self):
        """NodeCreate 스키마 테스트"""
        node = NodeCreate(
            title="새 노드",
            type="assistant",
            parent_id="parent-123",
            content="노드 내용",
            is_summary=False
        )
        
        assert node.parent_id == "parent-123"
        assert node.content == "노드 내용"
        assert node.is_summary is False
        
    def test_node_create_summary(self):
        """요약 노드 생성 스키마 테스트"""
        node = NodeCreate(
            title="요약",
            type="summary",
            is_summary=True,
            summary_content="요약 내용"
        )
        
        assert node.is_summary is True
        assert node.summary_content == "요약 내용"
        
    def test_node_update(self):
        """NodeUpdate 스키마 테스트"""
        update = NodeUpdate(
            title="수정된 노드",
            is_active=False,
            metadata={"updated": True}
        )
        
        assert update.title == "수정된 노드"
        assert update.is_active is False
        
    def test_node_response(self):
        """Node 응답 스키마 테스트"""
        now = datetime.now()
        node = Node(
            id="node-123",
            session_id="session-123",
            title="테스트 노드",
            type="user",
            parent_id="parent-123",
            source_node_ids=["source-1", "source-2"],
            is_summary=False,
            created_at=now,
            token_count=150,
            depth=2,
            is_active=True
        )
        
        assert node.id == "node-123"
        assert node.depth == 2
        assert len(node.source_node_ids) == 2
        
    def test_node_with_messages(self):
        """NodeWithMessages 스키마 테스트"""
        now = datetime.now()
        message = Message(
            id="msg-123",
            node_id="node-123",
            role="user",
            content="메시지 내용",
            timestamp=now
        )
        
        node = NodeWithMessages(
            id="node-123",
            session_id="session-123",
            title="테스트 노드",
            type="user",
            parent_id=None,
            created_at=now,
            token_count=100,
            depth=0,
            is_active=True,
            messages=[message]
        )
        
        assert len(node.messages) == 1
        assert node.messages[0].content == "메시지 내용"
        
    def test_node_tree(self):
        """NodeTree 스키마 테스트"""
        now = datetime.now()
        
        # 루트 노드
        root = Node(
            id="root",
            session_id="session-123",
            title="루트",
            type="user",
            parent_id=None,
            created_at=now,
            token_count=100,
            depth=0,
            is_active=True
        )
        
        # 자식 노드
        child = Node(
            id="child",
            session_id="session-123",
            title="자식",
            type="assistant",
            parent_id="root",
            created_at=now,
            token_count=50,
            depth=1,
            is_active=True
        )
        
        # 트리 구조
        tree = NodeTree(
            node=root,
            children=[
                NodeTree(node=child, children=[])
            ]
        )
        
        assert tree.node.id == "root"
        assert len(tree.children) == 1
        assert tree.children[0].node.id == "child"
        
    def test_node_tree_recursive(self):
        """재귀적 NodeTree 구조 테스트"""
        now = datetime.now()
        
        # 깊은 트리 구조 생성
        root = Node(
            id="root",
            session_id="session-123",
            title="루트",
            type="user",
            parent_id=None,
            created_at=now,
            token_count=100,
            depth=0,
            is_active=True
        )
        
        tree = NodeTree(
            node=root,
            children=[
                NodeTree(
                    node=Node(
                        id=f"child-{i}",
                        session_id="session-123",
                        title=f"자식 {i}",
                        type="assistant",
                        parent_id="root",
                        created_at=now,
                        token_count=50,
                        depth=1,
                        is_active=True
                    ),
                    children=[]
                )
                for i in range(3)
            ]
        )
        
        assert len(tree.children) == 3
        
    def test_summary_request(self):
        """SummaryRequest 스키마 테스트"""
        request = SummaryRequest(
            node_ids=["node-1", "node-2", "node-3"],
            is_manual=True,
            summary_content="수동 요약 내용"
        )
        
        assert len(request.node_ids) == 3
        assert request.is_manual is True
        assert request.summary_content == "수동 요약 내용"
        
    def test_summary_request_empty_nodes(self):
        """빈 노드 리스트로 SummaryRequest 생성 시 오류 테스트"""
        with pytest.raises(ValidationError):
            SummaryRequest(node_ids=[])