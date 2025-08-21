# Pydantic schemas module
from backend.schemas.branch_recommendation import (
    BranchRecommendation,
    BranchRecommendationBase,
    BranchRecommendationBatch,
    BranchRecommendationCreate,
    BranchRecommendationUpdate,
    RecommendationStatus,
)
from backend.schemas.message import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    Message,
    MessageCreate,
    MessageRole,
)
from backend.schemas.node import (
    Node,
    NodeCreate,
    NodeTree,
    NodeType,
    NodeUpdate,
    NodeWithMessages,
    SummaryRequest,
)
from backend.schemas.session import (
    Session,
    SessionCreate,
    SessionUpdate,
    SessionWithNodes,
)
from backend.schemas.websocket import (
    WSChatMessage,
    WSError,
    WSMessage,
    WSMessageType,
    WSNodeUpdate,
)

# NodeTree는 자기 자신을 참조하므로 model_rebuild 필요
NodeTree.model_rebuild()
