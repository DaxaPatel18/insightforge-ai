import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import AgentSession, AgentMessage, Dataset, User
from app.api.deps import get_current_user
from app.agents.engine import AgentEngine, AGENT_PERSONAS

router = APIRouter(prefix="/api/agents", tags=["agents"])


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    dataset_id: Optional[str] = None
    agent_role: str = "data_analyst"
    message: str
    api_key: Optional[str] = None


class AgentStepResponse(BaseModel):
    step: int
    type: str
    title: str
    content: str
    tool: Optional[str] = None
    args: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    session_id: str
    agent_role: str
    user_message: str
    final_response: str
    reasoning_steps: List[Dict[str, Any]]
    data_payload: Optional[Dict[str, Any]] = None


@router.get("/roles")
def get_available_roles():
    """List available specialist agent personas."""
    return AGENT_PERSONAS


@router.get("/sessions")
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all agent conversation sessions for the current user."""
    sessions = (
        db.query(AgentSession)
        .filter(AgentSession.user_id == current_user.id)
        .order_by(AgentSession.updated_at.desc())
        .all()
    )
    return [
        {
            "id": s.id,
            "title": s.title,
            "dataset_id": s.dataset_id,
            "agent_role": s.agent_role,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
            "message_count": len(s.messages),
        }
        for s in sessions
    ]


@router.get("/sessions/{session_id}")
def get_session_history(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all messages and reasoning traces for a session for the authorized user."""
    session = (
        db.query(AgentSession)
        .filter(AgentSession.id == session_id, AgentSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Agent session not found or access denied")

    messages = [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "reasoning_steps": m.reasoning_steps,
            "data_payload": m.data_payload,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in session.messages
    ]

    return {
        "id": session.id,
        "title": session.title,
        "dataset_id": session.dataset_id,
        "agent_role": session.agent_role,
        "messages": messages,
    }


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an agent session and all associated logs for the authorized user."""
    session = (
        db.query(AgentSession)
        .filter(AgentSession.id == session_id, AgentSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Agent session not found or access denied")

    db.delete(session)
    db.commit()
    return {"message": "Session deleted successfully"}


@router.post("/chat", response_model=ChatResponse)
def run_agent_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Execute autonomous agent reasoning loop over dataset with tool use."""
    # Verify dataset access if provided
    dataset_id = payload.dataset_id
    if dataset_id:
        dataset = (
            db.query(Dataset)
            .filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id)
            .first()
        )
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found or access denied")

    session_id = payload.session_id

    # Create session if not provided
    if not session_id:
        title_snippet = payload.message[:35] + ("..." if len(payload.message) > 35 else "")
        session = AgentSession(
            user_id=current_user.id,
            title=title_snippet,
            dataset_id=payload.dataset_id,
            agent_role=payload.agent_role,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        session_id = session.id
    else:
        session = (
            db.query(AgentSession)
            .filter(AgentSession.id == session_id, AgentSession.user_id == current_user.id)
            .first()
        )
        if not session:
            session = AgentSession(
                id=session_id,
                user_id=current_user.id,
                title=payload.message[:35],
                dataset_id=payload.dataset_id,
                agent_role=payload.agent_role,
            )
            db.add(session)
            db.commit()
            db.refresh(session)

    # Record User Message
    user_msg = AgentMessage(
        session_id=session_id,
        role="user",
        content=payload.message,
    )
    db.add(user_msg)

    # Run Autonomous Agent Engine
    agent_output = AgentEngine.run_agent(
        message=payload.message,
        dataset_id=payload.dataset_id or session.dataset_id,
        agent_role=payload.agent_role,
        api_key=payload.api_key,
    )

    # Record Assistant Message with full reasoning steps
    assistant_msg = AgentMessage(
        session_id=session_id,
        role="assistant",
        content=agent_output["final_response"],
        reasoning_steps=agent_output["reasoning_steps"],
        data_payload=agent_output.get("data_payload"),
    )
    db.add(assistant_msg)
    db.commit()

    return ChatResponse(
        session_id=session_id,
        agent_role=payload.agent_role,
        user_message=payload.message,
        final_response=agent_output["final_response"],
        reasoning_steps=agent_output["reasoning_steps"],
        data_payload=agent_output.get("data_payload"),
    )

