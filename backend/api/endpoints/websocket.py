"""
WebSocket 엔드포인트
"""
from typing import Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
import logging
import json
from datetime import datetime

from backend.schemas.websocket import WSMessage, WSError, WSChatMessage, WSNodeUpdate
from backend.schemas.message import ChatRequest
from backend.schemas.branch_recommendation import BranchRecommendationBase, BranchRecommendationBatch
from backend.core.dependencies import ChatServiceDep, NodeServiceDep, get_db
from backend.api.websocket.connection_manager import connection_manager
from backend.db.falkordb import FalkorDBManager
from backend.services import branch_recommendation_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/session/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    chat_service: ChatServiceDep,
    node_service: NodeServiceDep,
    db: FalkorDBManager = Depends(get_db)
):
    """WebSocket 연결 처리"""
    await connection_manager.connect(websocket, session_id)
    
    # BranchRecommendationService 인스턴스 생성
    rec_service = branch_recommendation_service.BranchRecommendationService(db)
    
    try:
        # 메시지 수신 대기
        while True:
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                message_type = message.get("type")
                
                # 메시지 타입에 따른 처리
                if message_type == "chat":
                    # 채팅 메시지 처리
                    chat_data = message.get("data", {})
                    stream_mode = chat_data.get("stream", True)  # 기본값: 스트리밍 모드
                    
                    if stream_mode:
                        # 스트리밍 모드
                        from backend.schemas.message import MessageCreate
                        
                        # node_id 확인
                        node_id = chat_data.get("node_id")
                        if not node_id:
                            logger.error(f"node_id가 없습니다: {chat_data}")
                            await connection_manager.send_error(
                                websocket,
                                "node_id가 필요합니다"
                            )
                            continue
                        
                        # 자식 노드 체크
                        has_children = await node_service.has_children(node_id)
                        if has_children:
                            # 자식이 있으면 자동으로 참조 노드 생성
                            from backend.schemas.node import NodeCreate
                            
                            # 부모 노드 정보 가져오기
                            parent_node = await node_service.get_node(node_id)
                            if not parent_node:
                                await connection_manager.send_error(
                                    websocket,
                                    "부모 노드를 찾을 수 없습니다"
                                )
                                continue
                            
                            # 1. 참조 노드 생성 시작 알림
                            await connection_manager.broadcast({
                                "type": "creating_reference_node",
                                "session_id": session_id,
                                "parent_node_id": node_id,
                                "message": "참조 노드를 생성 중입니다..."
                            }, session_id)
                            
                            # 2. 참조 노드 생성
                            reference_node_data = NodeCreate(
                                session_id=parent_node.session_id,
                                parent_id=node_id,
                                title=f"대화 계속: {parent_node.title}",
                                content="",
                                type="reference"
                            )
                            
                            reference_node = await node_service.create_node(
                                parent_node.session_id,
                                reference_node_data
                            )
                            
                            # 엣지 정보 생성
                            edge_info = {
                                "id": f"{node_id}-{reference_node.id}",
                                "source": node_id,
                                "target": reference_node.id,
                                "label": "대화 계속"
                            }
                            
                            # 3. 참조 노드 생성 완료 알림 (엣지 정보 포함)
                            reference_node_dict = reference_node.model_dump()
                            # parent_id 확실히 전달
                            reference_node_dict['parent_id'] = node_id
                            
                            await connection_manager.broadcast({
                                "type": "reference_node_created",
                                "session_id": session_id,
                                "parent_node_id": node_id,
                                "reference_node": reference_node_dict,
                                "edge": edge_info
                            }, session_id)
                            
                            # 4. 부모 노드 요약 생성 시작 (요약이 없는 경우)
                            if not parent_node.metadata.get("summary"):
                                await connection_manager.broadcast({
                                    "type": "generating_summary",
                                    "session_id": session_id,
                                    "node_id": node_id,
                                    "message": "부모 노드 요약을 생성 중입니다..."
                                }, session_id)
                                
                                summary_result = await chat_service._generate_node_summary_if_needed(node_id)
                                
                                if summary_result:
                                    await connection_manager.broadcast({
                                        "type": "summary_generated",
                                        "session_id": session_id,
                                        "node_id": node_id,
                                        "summary": summary_result
                                    }, session_id)
                            
                            # 이제 참조 노드에서 대화 진행
                            node_id = reference_node.id
                            chat_data["node_id"] = node_id
                        
                        # 1. 사용자 메시지 먼저 저장
                        user_message = await chat_service.message_service.create_message(
                            MessageCreate(
                                node_id=node_id,
                                content=chat_data.get("message"),
                                role="user"
                            )
                        )
                        
                        # 2. 스트림 시작 알림
                        await connection_manager.broadcast({
                            "type": "stream_start",
                            "session_id": session_id,
                            "node_id": chat_data.get("node_id"),
                            "message_id": str(user_message.id)
                        }, session_id)
                        
                        # 3. 대화 기록 가져오기
                        conversation = await chat_service.message_service.get_conversation_history(
                            chat_data.get("node_id"), 
                            include_ancestors=True
                        )
                        
                        # 4. 스트리밍 응답 생성 및 전송
                        full_response = ""
                        async for chunk in chat_service.stream_chat(conversation.messages):
                            full_response += chunk
                            # 각 청크를 브로드캐스트
                            await connection_manager.broadcast({
                                "type": "stream_chunk",
                                "session_id": session_id,
                                "node_id": chat_data.get("node_id"),
                                "chunk": chunk
                            }, session_id)
                        
                        # 5. 완성된 AI 메시지 저장
                        node_id = chat_data.get("node_id")
                        if not node_id:
                            logger.error(f"node_id가 없습니다: {chat_data}")
                            await connection_manager.send_error(
                                websocket,
                                "node_id가 필요합니다"
                            )
                            continue
                        
                        ai_message = await chat_service.message_service.create_message(
                            MessageCreate(
                                node_id=node_id,
                                content=full_response,
                                role="assistant"
                            )
                        )
                        
                        # 6. 브랜치 분석 (auto_branch가 true인 경우)
                        recommended_branches = []
                        if chat_data.get("auto_branch", True):
                            from backend.schemas.ai_models import Message as AIMessage
                            from backend.schemas.branch_recommendation import BranchRecommendationBatch, BranchRecommendationBase
                            from backend.services.branch_recommendation_service import BranchRecommendationService
                            
                            # 브랜칭 분석
                            messages = chat_service._prepare_messages(conversation.messages)
                            messages.append(AIMessage(role="user", content=chat_data.get("message")))
                            messages.append(AIMessage(role="assistant", content=full_response))
                            
                            branch_analysis = await chat_service.gemini.analyze_branching(
                                messages=messages,
                                temperature=0.3
                            )
                            
                            # 브랜치 추천 서비스 초기화
                            rec_service = BranchRecommendationService(db)
                            
                            # 추천 배치 생성
                            recommendations_to_create = []
                            for idx, branch in enumerate(branch_analysis.recommended_branches):
                                rec_base = BranchRecommendationBase(
                                    title=branch.title,
                                    type=branch.type.value,
                                    description=branch.description,
                                    priority=branch.priority or (0.8 - (idx * 0.1)),
                                    estimated_depth=branch.estimated_depth or 3,
                                    edge_label=branch.title[:20]
                                )
                                recommendations_to_create.append(rec_base)
                                
                                # WebSocket 응답용 데이터 (기존 형식 유지)
                                recommended_branches.append({
                                    "title": branch.title,
                                    "type": branch.type.value,
                                    "description": branch.description,
                                    "priority": branch.priority or (0.8 - (idx * 0.1)),
                                    "estimated_depth": branch.estimated_depth or 3,
                                    "edge_label": branch.title[:20]
                                })
                            
                            # 브랜치 추천을 별도 엔티티로 저장
                            if recommendations_to_create:
                                batch = BranchRecommendationBatch(
                                    message_id=str(ai_message.id),
                                    node_id=node_id,
                                    session_id=session_id,
                                    recommendations=recommendations_to_create
                                )
                                
                                created_recommendations = await rec_service.create_recommendations_batch(batch)
                                logger.info(f"메시지 {ai_message.id}에 {len(created_recommendations)}개의 브랜치 추천 생성")
                                
                                # 생성된 추천의 ID를 WebSocket 응답에 추가
                                for i, rec in enumerate(created_recommendations):
                                    if i < len(recommended_branches):
                                        recommended_branches[i]["id"] = rec.id
                        
                        # 7. 스트림 완료 알림
                        await connection_manager.broadcast({
                            "type": "stream_end",
                            "session_id": session_id,
                            "node_id": chat_data.get("node_id"),
                            "message_id": str(ai_message.id),
                            "full_response": full_response,
                            "recommended_branches": recommended_branches
                        }, session_id)
                        
                    else:
                        # 일반 모드 (기존 코드)
                        node_id = chat_data.get("node_id")
                        if not node_id:
                            logger.error(f"node_id가 없습니다: {chat_data}")
                            await connection_manager.send_error(
                                websocket,
                                "node_id가 필요합니다"
                            )
                            continue
                            
                        response = await chat_service.process_chat(
                            session_id=session_id,
                            node_id=node_id,
                            message=chat_data.get("message"),
                            auto_branch=chat_data.get("auto_branch", True)
                        )
                        
                        # ChatProcessResult는 이미 Pydantic 모델
                        response_data = response.model_dump()
                        
                        # 메시지가 추가된 노드 정보 조회
                        updated_node = None
                        if response_data.get("node_id"):
                            updated_node = await node_service.get_node(response_data["node_id"])
                        
                        # 응답 브로드캐스트
                        ws_response = {
                            "type": "chat_response",
                            "session_id": session_id,
                            "data": response_data,
                            "updated_node": updated_node.model_dump() if updated_node else None
                        }
                        await connection_manager.broadcast(ws_response, session_id)
                    
                elif message_type == "node_update":
                    # 노드 업데이트 처리
                    update_data = message.get("data", {})
                    node_id = update_data.get("node_id")
                    
                    if node_id:
                        from backend.schemas.node import NodeUpdate
                        
                        node_update = NodeUpdate(
                            title=update_data.get("title"),
                            is_active=update_data.get("is_active"),
                            metadata=update_data.get("metadata")
                        )
                        
                        updated_node = await node_service.update_node(node_id, node_update)
                        
                        if updated_node:
                            # 업데이트 브로드캐스트
                            ws_response = {
                                "type": "node_updated",
                                "session_id": session_id,
                                "data": updated_node.model_dump()
                            }
                            # 모든 연결(자신 포함)에 브로드캐스트
                            await connection_manager.broadcast(ws_response, session_id)
                
                elif message_type == "create_reference_and_chat":
                    # 참조 노드 생성 후 채팅
                    chat_data = message.get("data", {})
                    parent_node_id = chat_data.get("node_id")
                    user_message_content = chat_data.get("message")
                    
                    if not parent_node_id or not user_message_content:
                        await connection_manager.send_error(
                            websocket,
                            "node_id와 message가 필요합니다"
                        )
                        continue
                    
                    try:
                        # 1. 참조 노드 생성
                        from backend.schemas.node import NodeCreate
                        
                        # 부모 노드 정보 가져오기
                        parent_node = await node_service.get_node(parent_node_id)
                        if not parent_node:
                            await connection_manager.send_error(
                                websocket,
                                "부모 노드를 찾을 수 없습니다"
                            )
                            continue
                        
                        # 참조 노드 생성
                        reference_node_data = NodeCreate(
                            session_id=parent_node.session_id,
                            parent_id=parent_node_id,
                            title=f"참조: {parent_node.title}",
                            content="",
                            type="reference"
                        )
                        
                        reference_node = await node_service.create_node(
                            parent_node.session_id,
                            reference_node_data
                        )
                        
                        # 1-1. 부모 노드의 요약 생성 (아직 요약이 없는 경우)
                        if parent_node and not parent_node.metadata.get("summary"):
                            summary_result = await chat_service._generate_node_summary_if_needed(parent_node_id)
                            if summary_result:
                                logger.info(f"부모 노드 {parent_node_id}의 요약 생성 완료")
                        
                        # 2. 참조 노드 생성 알림
                        reference_node_dict = reference_node.model_dump()
                        reference_node_dict['parent_id'] = parent_node_id
                        
                        # 엣지 정보 추가
                        edge_info = {
                            "id": f"{parent_node_id}-{reference_node.id}",
                            "source": parent_node_id,
                            "target": reference_node.id,
                            "label": "참조"
                        }
                        
                        await connection_manager.broadcast({
                            "type": "reference_node_created",
                            "session_id": session_id,
                            "parent_node_id": parent_node_id,
                            "reference_node": reference_node_dict,
                            "edge": edge_info
                        }, session_id)
                        
                        # 3. 참조 노드에서 채팅 처리 (스트리밍)
                        from backend.schemas.message import MessageCreate
                        
                        # 사용자 메시지 저장
                        user_message = await chat_service.message_service.create_message(
                            MessageCreate(
                                node_id=reference_node.id,
                                content=user_message_content,
                                role="user"
                            )
                        )
                        
                        # 스트림 시작 알림
                        await connection_manager.broadcast({
                            "type": "stream_start",
                            "session_id": session_id,
                            "node_id": reference_node.id,
                            "message_id": str(user_message.id)
                        }, session_id)
                        
                        # 대화 기록 가져오기
                        conversation = await chat_service.message_service.get_conversation_history(
                            reference_node.id, 
                            include_ancestors=True
                        )
                        
                        # 스트리밍 응답 생성 및 전송
                        full_response = ""
                        async for chunk in chat_service.stream_chat(conversation.messages):
                            full_response += chunk
                            await connection_manager.broadcast({
                                "type": "stream_chunk",
                                "session_id": session_id,
                                "node_id": reference_node.id,
                                "chunk": chunk
                            }, session_id)
                        
                        # AI 메시지 저장
                        ai_message = await chat_service.message_service.create_message(
                            MessageCreate(
                                node_id=reference_node.id,
                                content=full_response,
                                role="assistant"
                            )
                        )
                        
                        # 스트림 완료 알림
                        await connection_manager.broadcast({
                            "type": "stream_end",
                            "session_id": session_id,
                            "node_id": reference_node.id,
                            "message_id": str(ai_message.id),
                            "full_response": full_response,
                            "recommended_branches": []
                        }, session_id)
                        
                    except Exception as e:
                        logger.error(f"참조 노드 생성 및 채팅 처리 실패: {e}")
                        await connection_manager.send_error(
                            websocket,
                            f"참조 노드 생성 실패: {str(e)}"
                        )
                
                elif message_type == "ping":
                    # 핑 응답
                    await connection_manager.send_personal_message(
                        {"type": "pong", "timestamp": datetime.utcnow().isoformat()},
                        websocket
                    )
                    
                else:
                    # 알 수 없는 메시지 타입
                    error_response = {
                        "type": "error",
                        "message": f"Unknown message type: {message_type}"
                    }
                    await connection_manager.send_personal_message(error_response, websocket)
                    
            except json.JSONDecodeError:
                error_response = {
                    "type": "error",
                    "message": "Invalid message format"
                }
                await connection_manager.send_personal_message(error_response, websocket)
                
            except Exception as e:
                logger.error(f"메시지 처리 오류: {e}")
                error_response = {
                    "type": "error",
                    "message": str(e)
                }
                await connection_manager.send_personal_message(error_response, websocket)
    
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
        logger.info(f"WebSocket 정상 연결 해제: 세션 {session_id}")
        
    except Exception as e:
        logger.error(f"WebSocket 오류: {e}")
        connection_manager.disconnect(websocket)