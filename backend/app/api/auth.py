from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import hash_password, verify_password, create_access_token, get_current_user
from app.models.user import User
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime
from uuid import UUID

router = APIRouter()

# --- Schemas (what data we expect) ---

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None

class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Endpoints ---

@router.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    #exitsting user
    existing_user =db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail = "Email already registered"
        )
    
    new_user = User(
        email = request.email,
        hashed_password = hash_password(request.password),
        full_name = request.full_name
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message" : "User registered successfully",
        "email": new_user.email
    }

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db : Session = Depends(get_db)):
    # check if email aor password exists
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code = status.HTTP_401_UNAUTHORIZED,
            detail = "Incorrect email or password"
        )
    
    token = create_access_token(data={"sub": user.email})

    return {
        "message": "User logged in successfully",
        "access_token": token,
        "token_type": "bearer"
    }

@router.get("/me")
def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return current_user

