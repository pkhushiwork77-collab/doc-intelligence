from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional
from app.core.auth import get_current_user
from app.models.user import User
from app.rag.chain import get_answer

router = APIRouter()

# Schemas

class ChatRequest(BaseModel):
    question: str
    doc_id: Optional[str] = None
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    source_chunks: int
    sources: list[str]

@router.post("/", response_model=ChatResponse)
def chat(
    req: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    if not req.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question can't be empty"
        )
    
    session_id = req.session_id or current_user.id

    result = get_answer(
        question=req.question,
        doc_id=req.doc_id,
        session_id=session_id,
    )

    return result
