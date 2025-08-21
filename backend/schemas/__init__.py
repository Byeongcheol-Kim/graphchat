# Pydantic schemas module
from backend.schemas.session import (
    Session,
    SessionCreate,
    SessionUpdate,
    SessionWithNodes,
)
from backend.schemas.node import (
    Node,
    NodeCreate,
    NodeUpdate,
    NodeTree,
    NodeWithMessages,
    SummaryRequest,
    NodeType,
)
from backend.schemas.message import (
    Message,
    MessageCreate,
    ChatMessage,
    ChatRequest,
    ChatResponse,
    MessageRole,
)
from backend.schemas.websocket import (
    WSMessage,
    WSChatMessage,
    WSNodeUpdate,
    WSError,
    WSMessageType,
)
from backend.schemas.branch_recommendation import (
    BranchRecommendation,
    BranchRecommendationCreate,
    BranchRecommendationUpdate,
    BranchRecommendationBase,
    BranchRecommendationBatch,
    RecommendationStatus,
)

# NodeTree는 자기 자신을 참조하므로 model_rebuild 필요
NodeTree.model_rebuild()