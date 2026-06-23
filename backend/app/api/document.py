
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
import os
from app.models.document import Document
from app.core.config import settings
import uuid
from app.rag.ingestion import ingest_document

router = APIRouter()

UPLOAD_DIR = "./uploads"
ALLOWED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    original_name: str
    file_size: int
    file_type: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    backgroud_task: BackgroundTasks = BackgroundTasks()
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Only PDF and Word documents are allowed"
        )
    
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the maximum limit of 10 MB"
        )
    
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as f:
        f.write(file_content)

    document = Document(
        filename=unique_filename,
        original_name=file.filename,
        file_size=len(file_content),
        file_type=file.content_type,
        status="uploaded",
        owner_id=current_user.id
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    backgroud_task.add_task(
        ingest_document,
        file_path=file_path,
        doc_id=str(document.id),
        metadata={
            "file_type": file.content_type,
            "original_name": file.filename,
            "owner_id": str(current_user.id)
        }
    )

    return document

@router.get("/", response_model=list[DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    documents = db.query(Document).filter(Document.owner_id == current_user.id).order_by(Document.created_at.desc()).all()
    return documents

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    document = db.query(Document).filter(Document.id == document_id, Document.owner_id == current_user.id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    return document

@router.delete("/{document_id}")
def delete_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    document = db.query(Document).filter(Document.id == document_id, Document.owner_id == current_user.id).first()
    if not document:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail = "Document not found"
        )
    
    file_path = os.path.join(UPLOAD_DIR, document.filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    db.delete(document)
    db.commit()

    return {
        "message": "Document Deleted Successfully"
    }

