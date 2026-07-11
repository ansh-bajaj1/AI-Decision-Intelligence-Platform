from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.models import User, ChatSession, ChatMessage, ActivityLog
from backend.app.schemas.schemas import AIInsightsResponse, AIChatResponse, ChatSessionOut
from backend.app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["ai"])

class ChatRequest(BaseModel):
    question: str
    session_id: Optional[str] = None

@router.post("/insights", response_model=AIInsightsResponse)
def get_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        insights = AIService.generate_insights(db)
        
        # Log activity
        log = ActivityLog(
            user_id=current_user.id,
            action="GENERATE_INSIGHTS",
            details="Generated AI Business Insights."
        )
        db.add(log)
        db.commit()
        
        return insights
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating insights: {str(e)}"
        )

@router.post("/chat", response_model=AIChatResponse)
def chat_with_ai(
    chat_req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session_id = chat_req.session_id
    question = chat_req.question.strip()
    
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
        
    # 1. Retrieve or Create Chat Session
    if session_id:
        session = db.query(ChatSession).filter(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found.")
    else:
        # Create a new session with the question as the start of the title
        title = question[:40] + "..." if len(question) > 40 else question
        session = ChatSession(user_id=current_user.id, title=title)
        db.add(session)
        db.commit()
        db.refresh(session)
        session_id = session.id
        
    # 2. Save User Message
    user_msg = ChatMessage(session_id=session.id, role="user", content=question)
    db.add(user_msg)
    db.commit()
    
    # 3. Retrieve Session History (to provide LLM context)
    history = db.query(ChatMessage).filter(
        ChatMessage.session_id == session.id
    ).order_by(ChatMessage.created_at.asc()).all()
    
    # 4. Generate AI Response
    try:
        ai_res = AIService.answer_chat(db, question, history[:-1]) # exclude the user message we just added since we pass it separately
        response_text = ai_res["response"]
        suggested = ai_res["suggested_questions"]
        
        # 5. Save Assistant Message
        assistant_msg = ChatMessage(session_id=session.id, role="assistant", content=response_text)
        db.add(assistant_msg)
        db.commit()
        
        # Log activity
        log = ActivityLog(
            user_id=current_user.id,
            action="AI_CHAT",
            details=f"Asked AI: '{question[:30]}...'"
        )
        db.add(log)
        db.commit()
        
        return AIChatResponse(
            response=response_text,
            session_id=session.id,
            suggested_questions=suggested
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error during AI Chat processing: {str(e)}"
        )

@router.get("/sessions", response_model=List[ChatSessionOut])
def get_chat_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sessions = db.query(ChatSession).filter(
        ChatSession.user_id == current_user.id
    ).order_by(ChatSession.created_at.desc()).all()
    return sessions

@router.get("/sessions/{session_id}", response_model=ChatSessionOut)
def get_chat_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    return session

@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    db.delete(session)
    db.commit()
    return None
