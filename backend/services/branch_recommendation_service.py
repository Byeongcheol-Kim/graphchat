"""브랜치 추천 서비스"""
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from backend.db.falkordb import FalkorDBManager
from backend.schemas.branch_recommendation import (
    BranchRecommendation,
    BranchRecommendationCreate,
    BranchRecommendationUpdate,
    BranchRecommendationBatch,
    RecommendationStatus
)
import logging

logger = logging.getLogger(__name__)


class BranchRecommendationService:
    """브랜치 추천 관리 서비스"""
    
    def __init__(self, db: FalkorDBManager):
        self.db = db
    
    async def create_recommendation(
        self, 
        recommendation: BranchRecommendationCreate
    ) -> BranchRecommendation:
        """단일 브랜치 추천 생성"""
        try:
            rec_id = str(uuid.uuid4())
            now = datetime.utcnow()
            
            query = """
            CREATE (r:BranchRecommendation {
                id: $id,
                message_id: $message_id,
                node_id: $node_id,
                session_id: $session_id,
                title: $title,
                description: $description,
                type: $type,
                priority: $priority,
                estimated_depth: $estimated_depth,
                edge_label: $edge_label,
                status: $status,
                created_at: $created_at
            })
            
            WITH r
            MATCH (m:Message {id: $message_id})
            CREATE (m)-[:HAS_RECOMMENDATION]->(r)
            
            WITH r
            MATCH (n:Node {id: $node_id})
            CREATE (r)-[:FOR_NODE]->(n)
            
            RETURN r
            """
            
            params = {
                "id": rec_id,
                "message_id": recommendation.message_id,
                "node_id": recommendation.node_id,
                "session_id": recommendation.session_id,
                "title": recommendation.title,
                "description": recommendation.description,
                "type": recommendation.type,
                "priority": recommendation.priority,
                "estimated_depth": recommendation.estimated_depth,
                "edge_label": recommendation.edge_label,
                "status": RecommendationStatus.PENDING,
                "created_at": now.isoformat()
            }
            
            result = await self.db.execute_query(query, params)
            
            if result and len(result) > 0:
                rec_data = result[0]["r"]
                rec_data["created_at"] = datetime.fromisoformat(rec_data["created_at"])
                return BranchRecommendation(**rec_data)
            
            raise Exception("Failed to create recommendation")
            
        except Exception as e:
            logger.error(f"브랜치 추천 생성 실패: {e}")
            raise
    
    async def create_recommendations_batch(
        self,
        batch: BranchRecommendationBatch
    ) -> List[BranchRecommendation]:
        """여러 브랜치 추천 한번에 생성"""
        recommendations = []
        
        for rec_base in batch.recommendations:
            rec_create = BranchRecommendationCreate(
                message_id=batch.message_id,
                node_id=batch.node_id,
                session_id=batch.session_id,
                **rec_base.model_dump()
            )
            
            try:
                recommendation = await self.create_recommendation(rec_create)
                recommendations.append(recommendation)
            except Exception as e:
                logger.error(f"배치 추천 생성 중 오류: {e}")
                # 계속 진행
        
        return recommendations
    
    async def get_recommendations_for_message(
        self,
        message_id: str
    ) -> List[BranchRecommendation]:
        """특정 메시지의 브랜치 추천 목록 조회"""
        try:
            query = """
            MATCH (m:Message {id: $message_id})-[:HAS_RECOMMENDATION]->(r:BranchRecommendation)
            RETURN r
            ORDER BY r.priority DESC
            """
            
            result = await self.db.execute_query(query, {"message_id": message_id})
            
            recommendations = []
            for row in result:
                rec_data = row["r"]
                if rec_data.get("created_at"):
                    rec_data["created_at"] = datetime.fromisoformat(rec_data["created_at"])
                if rec_data.get("updated_at"):
                    rec_data["updated_at"] = datetime.fromisoformat(rec_data["updated_at"])
                if rec_data.get("dismissed_at"):
                    rec_data["dismissed_at"] = datetime.fromisoformat(rec_data["dismissed_at"])
                recommendations.append(BranchRecommendation(**rec_data))
            
            return recommendations
            
        except Exception as e:
            logger.error(f"메시지 추천 조회 실패: {e}")
            return []
    
    async def get_recommendations_for_node(
        self,
        node_id: str,
        status_filter: Optional[RecommendationStatus] = None
    ) -> List[BranchRecommendation]:
        """특정 노드의 모든 브랜치 추천 조회"""
        try:
            if status_filter:
                query = """
                MATCH (r:BranchRecommendation {node_id: $node_id, status: $status})
                RETURN r
                ORDER BY r.created_at DESC, r.priority DESC
                """
                params = {"node_id": node_id, "status": status_filter}
            else:
                query = """
                MATCH (r:BranchRecommendation {node_id: $node_id})
                RETURN r
                ORDER BY r.created_at DESC, r.priority DESC
                """
                params = {"node_id": node_id}
            
            result = await self.db.execute_query(query, params)
            
            recommendations = []
            for row in result:
                rec_data = row["r"]
                if rec_data.get("created_at"):
                    rec_data["created_at"] = datetime.fromisoformat(rec_data["created_at"])
                if rec_data.get("updated_at"):
                    rec_data["updated_at"] = datetime.fromisoformat(rec_data["updated_at"])
                if rec_data.get("dismissed_at"):
                    rec_data["dismissed_at"] = datetime.fromisoformat(rec_data["dismissed_at"])
                recommendations.append(BranchRecommendation(**rec_data))
            
            return recommendations
            
        except Exception as e:
            logger.error(f"노드 추천 조회 실패: {e}")
            return []
    
    async def update_recommendation(
        self,
        recommendation_id: str,
        update: BranchRecommendationUpdate
    ) -> BranchRecommendation:
        """브랜치 추천 상태 업데이트"""
        try:
            update_fields = []
            params = {"id": recommendation_id}
            
            if update.status:
                update_fields.append("r.status = $status")
                params["status"] = update.status
            
            if update.created_branch_id:
                update_fields.append("r.created_branch_id = $created_branch_id")
                params["created_branch_id"] = update.created_branch_id
            
            if update.dismissed_at:
                update_fields.append("r.dismissed_at = $dismissed_at")
                params["dismissed_at"] = update.dismissed_at.isoformat()
            
            # 항상 updated_at 업데이트
            update_fields.append("r.updated_at = $updated_at")
            params["updated_at"] = datetime.utcnow().isoformat()
            
            query = f"""
            MATCH (r:BranchRecommendation {{id: $id}})
            SET {', '.join(update_fields)}
            RETURN r
            """
            
            result = await self.db.execute_query(query, params)
            
            if result and len(result) > 0:
                rec_data = result[0]["r"]
                if rec_data.get("created_at"):
                    rec_data["created_at"] = datetime.fromisoformat(rec_data["created_at"])
                if rec_data.get("updated_at"):
                    rec_data["updated_at"] = datetime.fromisoformat(rec_data["updated_at"])
                if rec_data.get("dismissed_at"):
                    rec_data["dismissed_at"] = datetime.fromisoformat(rec_data["dismissed_at"])
                return BranchRecommendation(**rec_data)
            
            raise Exception(f"추천을 찾을 수 없습니다: {recommendation_id}")
            
        except Exception as e:
            logger.error(f"추천 업데이트 실패: {e}")
            raise
    
    async def mark_as_created(
        self,
        recommendation_id: str,
        created_branch_id: str
    ) -> BranchRecommendation:
        """브랜치 생성 완료 표시"""
        update = BranchRecommendationUpdate(
            status=RecommendationStatus.CREATED,
            created_branch_id=created_branch_id
        )
        return await self.update_recommendation(recommendation_id, update)
    
    async def mark_as_dismissed(
        self,
        recommendation_id: str
    ) -> BranchRecommendation:
        """브랜치 추천 무시 표시"""
        update = BranchRecommendationUpdate(
            status=RecommendationStatus.DISMISSED,
            dismissed_at=datetime.utcnow()
        )
        return await self.update_recommendation(recommendation_id, update)
    
    async def get_active_recommendations_for_session(
        self,
        session_id: str
    ) -> Dict[str, List[BranchRecommendation]]:
        """세션의 모든 추천을 노드별로 그룹화하여 반환 (expired 제외)"""
        try:
            query = """
            MATCH (r:BranchRecommendation {session_id: $session_id})
            WHERE r.status IN ['pending', 'created', 'dismissed']
            RETURN r
            ORDER BY r.node_id, r.created_at DESC, r.priority DESC
            """
            
            result = await self.db.execute_query(query, {"session_id": session_id})
            
            recommendations_by_node = {}
            for row in result:
                rec_data = row["r"]
                if rec_data.get("created_at"):
                    rec_data["created_at"] = datetime.fromisoformat(rec_data["created_at"])
                if rec_data.get("updated_at"):
                    rec_data["updated_at"] = datetime.fromisoformat(rec_data["updated_at"])
                if rec_data.get("dismissed_at"):
                    rec_data["dismissed_at"] = datetime.fromisoformat(rec_data["dismissed_at"])
                
                recommendation = BranchRecommendation(**rec_data)
                node_id = recommendation.node_id
                
                if node_id not in recommendations_by_node:
                    recommendations_by_node[node_id] = []
                recommendations_by_node[node_id].append(recommendation)
            
            return recommendations_by_node
            
        except Exception as e:
            logger.error(f"세션 추천 조회 실패: {e}")
            return {}